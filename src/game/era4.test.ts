import { describe, expect, it } from "vitest";
import { UPGRADES_ERA3 } from "@/content/era3";
import { AUTO_TRAINING_AUTONOMY, REPLICATION_PER_SECOND } from "@/content/era4";
import { GRID_CELLS } from "@/content/neural";
import { D } from "./decimal";
import {
  ALL_BUILDINGS,
  ALL_UPGRADES,
  buyBuilding,
  canRenaissance3,
  coreFactor,
  coreNeighbors,
  createInitialState,
  gridFactor,
  placeCore,
  productionPerSecond,
  removeCore,
  renaissance3,
  replicationRate,
  tick,
} from "./engine";
import { deserialize, serialize } from "./save";
import type { GameState } from "./types";

/** Era III with every era III upgrade owned: renaissance III is allowed. */
function readyForRenaissance3(): GameState {
  const base = createInitialState(31);
  return {
    ...base,
    era: 3,
    totalMoney: D(4_000_000),
    buildings: { ...base.buildings, gpuServer: 3 },
    upgrades: Object.fromEntries(UPGRADES_ERA3.map((u) => [u.id, true as const])),
    models: [1.5],
    algorithms: { diskCache: true },
    knowledgeBonuses: { "touch-typing": true },
  };
}

function eraFour(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialState(41);
  return { ...base, era: 4, renaissances3: 1, ...overrides };
}

describe("renaissance III", () => {
  it("elle demande l'ère III et toutes ses améliorations", () => {
    expect(UPGRADES_ERA3.length).toBeGreaterThan(0);
    expect(canRenaissance3(readyForRenaissance3())).toBe(true);
    expect(canRenaissance3({ ...readyForRenaissance3(), upgrades: {} })).toBe(false);
    expect(canRenaissance3({ ...readyForRenaissance3(), era: 2 })).toBe(false);
  });

  it("elle ouvre l'ère IV, donne des Neural Cores et remet les ères I à III à zéro", () => {
    const after = renaissance3(readyForRenaissance3());
    expect(after.era).toBe(4);
    expect(after.renaissances3).toBe(1);
    expect(after.neuralCores).toBe(10); // floor(√4 000 000 / 200)
    expect(after.buildings.gpuServer).toBe(0);
    expect(after.models).toEqual([]);
    expect(after.upgrades).toEqual({});
  });

  it("elle garde Knowledge et algorithmes", () => {
    const after = renaissance3(readyForRenaissance3());
    expect(after.algorithms).toEqual({ diskCache: true });
    expect(after.knowledgeBonuses).toEqual({ "touch-typing": true });
  });
});

describe("grille neuronale", () => {
  it("un core se pose dans une case vide pour un Neural Core, et se retire contre remboursement", () => {
    const s = eraFour({ neuralCores: 1 });
    const placed = placeCore(s, 4, "coreProduction");
    expect(placed.neuralCores).toBe(0);
    expect(placed.neuralGrid[4]).toBe("coreProduction");
    expect(placeCore(placed, 0, "coreProduction")).toBe(placed); // plus de core
    expect(placeCore({ ...placed, neuralCores: 1 }, 4, "coreRobots").neuralGrid[4]).toBe("coreProduction"); // case prise
    const removed = removeCore(placed, 4);
    expect(removed.neuralCores).toBe(1);
    expect(removed.neuralGrid[4]).toBeNull();
  });

  it("refuse une case hors de la grille ou un core inconnu", () => {
    const s = eraFour({ neuralCores: 1 });
    expect(placeCore(s, GRID_CELLS, "coreProduction")).toBe(s);
    expect(placeCore(s, 0, "nope")).toBe(s);
  });

  it("chaque voisin occupé augmente le bonus de moitié", () => {
    const grid = Array<string | null>(GRID_CELLS).fill(null);
    grid[4] = "coreProduction";
    expect(coreFactor(grid, 4)).toBeCloseTo(1.1, 6);
    grid[1] = "coreRobots";
    grid[3] = "coreRobots";
    expect(coreNeighbors(grid, 4)).toBe(2);
    expect(coreFactor(grid, 4)).toBeCloseTo(1.2, 6); // 1 + 0,1 × (1 + 0,5 × 2)
    expect(coreNeighbors(grid, 0)).toBe(2); // un coin n'a que deux voisins possibles
  });

  it("le core de production multiplie toute la production", () => {
    const base = eraFour({ buildings: { ...createInitialState().buildings, homePage: 10 } });
    const grid = Array<string | null>(GRID_CELLS).fill(null);
    grid[0] = "coreProduction";
    const boosted = { ...base, neuralGrid: grid };
    expect(gridFactor(boosted, "production")).toBeCloseTo(1.1, 6);
    const ratio = productionPerSecond(boosted).money.toNumber() / productionPerSecond(base).money.toNumber();
    expect(ratio).toBeCloseTo(1.1, 6);
  });
});

describe("ère IV : robots et Autonomie", () => {
  it("les bâtiments de l'ère IV ne s'achètent qu'en ère IV", () => {
    const rich = { ...createInitialState(), era: 3 as const, resources: { ...createInitialState().resources, compute: D(1e9) } };
    expect(buyBuilding(rich, "robotFactory", 1)).toBe(rich);
    expect(buyBuilding({ ...rich, era: 4 }, "robotFactory", 1).buildings.robotFactory).toBe(1);
  });

  it("les robots se répliquent, plus vite avec l'Autonomie", () => {
    const s = eraFour({ resources: { ...createInitialState().resources, robots: D(1000) } });
    expect(replicationRate(s)).toBeCloseTo(REPLICATION_PER_SECOND, 9);
    expect(productionPerSecond(s).robots.toNumber()).toBeCloseTo(1000 * REPLICATION_PER_SECOND, 9);
    const autonomous = { ...s, resources: { ...s.resources, autonomy: D(99) } };
    expect(replicationRate(autonomous)).toBeCloseTo(REPLICATION_PER_SECOND * 3, 9); // 1 + log10(100)
  });

  it("avec assez d'Autonomie, un entraînement démarre seul", () => {
    const s = eraFour({
      resources: { ...createInitialState().resources, data: D(1e6), compute: D(1e9), autonomy: D(AUTO_TRAINING_AUTONOMY) },
    });
    expect(tick(s, 100).training).not.toBeNull();
    const low = { ...s, resources: { ...s.resources, autonomy: D(0) } };
    expect(tick(low, 100).training).toBeNull();
  });
});

describe("sauvegarde v6", () => {
  it("un aller-retour conserve la grille, les Neural Cores et les robots", () => {
    const grid = Array<string | null>(GRID_CELLS).fill(null);
    grid[2] = "coreAutonomy";
    const s = eraFour({
      neuralCores: 3,
      neuralGrid: grid,
      resources: { ...createInitialState().resources, robots: D("1e40"), autonomy: D(12) },
    });
    const loaded = deserialize(serialize(s));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.era).toBe(4);
    expect(loaded.state.neuralGrid).toEqual(grid);
    expect(loaded.state.neuralCores).toBe(3);
    expect(loaded.state.resources.robots.toString()).toBe(D("1e40").toString());
  });

  it("une sauvegarde v5 se charge avec une grille vide", () => {
    const env = JSON.parse(serialize({ ...createInitialState(), era: 3 }));
    env.schemaVersion = 5;
    for (const key of ["renaissances3", "neuralCores", "neuralGrid"]) delete env.state[key];
    delete env.state.resources.robots;
    delete env.state.resources.autonomy;
    const loaded = deserialize(JSON.stringify(env));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.era).toBe(3);
    expect(loaded.state.neuralGrid).toEqual(Array(GRID_CELLS).fill(null));
    expect(loaded.state.resources.robots.toNumber()).toBe(0);
  });

  it("refuse une grille de mauvaise taille ou un core inconnu", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.state.neuralGrid = [null];
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
    env.state.neuralGrid = Array(GRID_CELLS).fill("nope");
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
  });
});

describe("catalogue", () => {
  it("chaque bâtiment et chaque amélioration a un identifiant unique", () => {
    const ids = [...ALL_BUILDINGS.map((b) => b.id), ...ALL_UPGRADES.map((u) => u.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
