import { describe, expect, it } from "vitest";
import { ALGORITHMS } from "@/content/algorithms";
import { TRAINING } from "@/content/era3";
import { UPGRADES_ERA2 } from "@/content/era2";
import { D } from "./decimal";
import {
  algorithmSlots,
  buyAlgorithm,
  canRenaissance2,
  createInitialState,
  equipAlgorithm,
  manualGain,
  productionPerSecond,
  quote,
  renaissance2,
  startTraining,
  tick,
  unequipAlgorithm,
} from "./engine";
import { deserialize, serialize } from "./save";
import type { GameState } from "./types";

/** Era II with every era II upgrade owned: renaissance II is allowed. */
function readyForRenaissance2(): GameState {
  const base = createInitialState(12);
  return {
    ...base,
    era: 2,
    totalMoney: D(1_000_000),
    buildings: { ...base.buildings, database: 3 },
    upgrades: Object.fromEntries(UPGRADES_ERA2.map((u) => [u.id, true as const])),
    algorithmPoints: 1,
    achievements: { "first-click": true },
  };
}

/** Era III with some Données and Calcul for a training run. */
function eraThree(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState(21),
    era: 3,
    resources: { money: D(0), data: D(10_000), compute: D(100_000), intelligence: D(0) },
    ...overrides,
  };
}

describe("algorithmes", () => {
  it("les coûts sont des entiers positifs : tout se débloque avec la progression", () => {
    for (const a of ALGORITHMS) {
      expect(Number.isInteger(a.cost)).toBe(true);
      expect(a.cost).toBeGreaterThan(0);
    }
  });

  it("un algorithme s'achète avec des points, puis se désactive ou s'équipe", () => {
    const s = { ...createInitialState(), algorithmPoints: 3 };
    const bought = buyAlgorithm(s, "assistedClick");
    expect(bought.algorithmPoints).toBe(0);
    expect(bought.algorithms).toEqual({ assistedClick: true });
    expect(buyAlgorithm(bought, "diskCache")).toBe(bought); // pas assez de points
  });

  it("on ne peut équiper que deux algorithmes au départ", () => {
    let s: GameState = {
      ...createInitialState(),
      algorithmPoints: 20,
      algorithms: { costCompression: true, diskCache: true, assistedClick: true },
    };
    expect(algorithmSlots(s)).toBe(2);
    s = equipAlgorithm(s, "costCompression");
    s = equipAlgorithm(s, "diskCache");
    expect(equipAlgorithm(s, "assistedClick")).toBe(s);
  });

  it("un algorithme non acheté ne s'équipe pas, et se retire", () => {
    const s = createInitialState();
    expect(equipAlgorithm(s, "diskCache")).toBe(s);
    const equipped = equipAlgorithm({ ...s, algorithms: { diskCache: true } }, "diskCache");
    expect(unequipAlgorithm(equipped, "diskCache").equippedAlgorithms).toEqual([]);
  });

  it("Compression de coûts baisse le prix des bâtiments de 15 %", () => {
    const base = createInitialState();
    const plain = quote(base, "homePage", 1).cost.toNumber();
    const discounted = quote(
      { ...base, algorithms: { costCompression: true }, equippedAlgorithms: ["costCompression"] },
      "homePage",
      1,
    ).cost.toNumber();
    expect(discounted / plain).toBeCloseTo(0.85, 6);
  });

  it("Clic assisté multiplie le travail manuel par 1,5", () => {
    const base = createInitialState();
    const equipped = { ...base, algorithms: { assistedClick: true as const }, equippedAlgorithms: ["assistedClick"] };
    expect(manualGain(equipped).div(manualGain(base)).toNumber()).toBeCloseTo(1.5, 6);
  });
});

describe("renaissance II", () => {
  it("elle demande toutes les améliorations de l'ère II", () => {
    expect(canRenaissance2(readyForRenaissance2())).toBe(true);
    expect(canRenaissance2({ ...readyForRenaissance2(), upgrades: {} })).toBe(false);
    expect(canRenaissance2({ ...readyForRenaissance2(), era: 1 })).toBe(false);
  });

  it("elle ouvre l'ère III, donne des points et ajoute un emplacement", () => {
    const before = readyForRenaissance2();
    const after = renaissance2(before);
    expect(after.era).toBe(3);
    expect(after.renaissances2).toBe(1);
    expect(algorithmSlots(after)).toBe(3);
    expect(after.algorithmPoints).toBeGreaterThan(before.algorithmPoints);
    expect(after.buildings.database).toBe(0);
    expect(after.upgrades).toEqual({});
    expect(after.achievements).toEqual(before.achievements);
  });

  it("elle garde l'arbre de Knowledge et les algorithmes achetés", () => {
    const s = {
      ...readyForRenaissance2(),
      knowledgeBonuses: { "touch-typing": true as const },
      algorithms: { diskCache: true as const },
    };
    const after = renaissance2(s);
    expect(after.knowledgeBonuses).toEqual({ "touch-typing": true });
    expect(after.algorithms).toEqual({ diskCache: true });
  });
});

describe("ère III : entraînement et Intelligence", () => {
  it("un entraînement ne démarre qu'en ère III, avec les ressources nécessaires", () => {
    const era2 = { ...eraThree(), era: 2 as const };
    expect(startTraining(era2)).toBe(era2);
    const poor = eraThree({ resources: { money: D(0), data: D(1), compute: D(1), intelligence: D(0) } });
    expect(startTraining(poor)).toBe(poor);
  });

  it("un entraînement coûte Données et Calcul, puis donne un modèle à la fin", () => {
    const started = startTraining(eraThree());
    expect(started.training).not.toBeNull();
    expect(started.resources.data.toNumber()).toBe(10_000 - TRAINING.dataCost);
    expect(startTraining(started)).toBe(started); // un seul à la fois
    const finished = tick(started, TRAINING.durationMs + 1);
    expect(finished.training).toBeNull();
    expect(finished.models).toHaveLength(1);
    expect(finished.models[0]).toBeGreaterThanOrEqual(TRAINING.qualityMin);
    expect(finished.models[0]).toBeLessThanOrEqual(TRAINING.qualityMax);
  });

  it("la qualité d'un modèle est la même pour la même graine", () => {
    const a = tick(startTraining(eraThree()), TRAINING.durationMs + 1);
    const b = tick(startTraining(eraThree()), TRAINING.durationMs + 1);
    expect(a.models).toEqual(b.models);
  });

  it("Entraînement rapide divise la durée par deux", () => {
    const fast = startTraining({
      ...eraThree(),
      algorithms: { fastTraining: true },
      equippedAlgorithms: ["fastTraining"],
    });
    expect(fast.training?.endsAtMs).toBe(TRAINING.durationMs / 2);
  });

  it("les modèles produisent de l'Intelligence, qui multiplie toute la production", () => {
    const base = eraThree();
    const withModel = { ...base, models: [2], buildings: { ...base.buildings, dataLab: 10 } };
    expect(productionPerSecond(withModel).intelligence.toNumber()).toBeGreaterThan(0);
    const boosted = { ...withModel, resources: { ...withModel.resources, intelligence: D(1000) } };
    const ratio = productionPerSecond(boosted).data.toNumber() / productionPerSecond(withModel).data.toNumber();
    expect(ratio).toBeGreaterThan(1);
  });
});

describe("sauvegarde v5", () => {
  it("un aller-retour conserve algorithmes, modèles et entraînement", () => {
    const s: GameState = {
      ...eraThree(),
      renaissances2: 1,
      algorithmPoints: 4,
      algorithms: { diskCache: true },
      equippedAlgorithms: ["diskCache"],
      models: [0.75, 1.5],
      training: { endsAtMs: 999_999 },
    };
    const loaded = deserialize(serialize(s));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.models).toEqual([0.75, 1.5]);
    expect(loaded.state.equippedAlgorithms).toEqual(["diskCache"]);
    expect(loaded.state.training).toEqual({ endsAtMs: 999_999 });
    expect(loaded.state.algorithmPoints).toBe(4);
  });

  it("une sauvegarde v4 se charge sans algorithme ni modèle", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.schemaVersion = 4;
    env.state.schemaVersion = 4;
    delete env.state.renaissances2;
    delete env.state.algorithmPoints;
    delete env.state.algorithms;
    delete env.state.equippedAlgorithms;
    delete env.state.models;
    delete env.state.training;
    delete env.state.resources.intelligence;
    const loaded = deserialize(JSON.stringify(env));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.models).toEqual([]);
    expect(loaded.state.resources.intelligence.toNumber()).toBe(0);
    expect(loaded.state.training).toBeNull();
  });

  it("refuse un algorithme équipé non acheté", () => {
    const env = JSON.parse(serialize({ ...createInitialState(), equippedAlgorithms: ["diskCache"] }));
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
  });

  it("refuse un modèle de qualité nulle", () => {
    const env = JSON.parse(serialize({ ...createInitialState(), models: [0] }));
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
  });
});

describe("emplacements", () => {
  it("un emplacement de plus à chaque renaissance II, à partir de deux", () => {
    expect(algorithmSlots({ ...createInitialState(), renaissances2: 0 })).toBe(2);
    expect(algorithmSlots({ ...createInitialState(), renaissances2: 2 })).toBe(4);
  });
});
