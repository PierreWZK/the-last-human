import { describe, expect, it } from "vitest";
import { UPGRADES_ERA4 } from "@/content/era4";
import { DIRECTIVES, ERA5_START_MACHINES, MACHINES_GOAL, POLICIES, ROBOTS_FOR_RENAISSANCE4 } from "@/content/era5";
import { D } from "./decimal";
import {
  automation,
  buyPolicy,
  canRenaissance4,
  clickManual,
  controlRate,
  createInitialState,
  directiveCost,
  giveDirective,
  humanDependency,
  isEndReached,
  newHumanity,
  nextDirective,
  policyFactor,
  renaissance4,
  resolveEvent,
  tick,
  visibleBuildings,
} from "./engine";
import { deserialize, serialize } from "./save";
import type { GameState } from "./types";

function readyForRenaissance4(): GameState {
  const base = createInitialState(41);
  return {
    ...base,
    era: 4,
    eraStartedMs: [0, 1000, 2000, 3000],
    elapsedMs: 5000,
    totalMoney: D(4e6),
    resources: { ...base.resources, robots: D(ROBOTS_FOR_RENAISSANCE4) },
    upgrades: Object.fromEntries(UPGRADES_ERA4.map((u) => [u.id, true as const])),
    neuralGrid: ["coreProduction", null, null, null, null, null, null, null, null],
    algorithms: { diskCache: true },
  };
}

function eraFive(overrides: Partial<GameState> = {}): GameState {
  return { ...renaissance4(readyForRenaissance4()), ...overrides };
}

/** Every directive given and enough machines: one tick ends the game. */
function almostOver(): GameState {
  const s = eraFive();
  return {
    ...s,
    directives: Object.fromEntries(DIRECTIVES.map((d) => [d.id, true as const])),
    resources: { ...s.resources, robots: D(MACHINES_GOAL) },
  };
}

describe("renaissance IV", () => {
  it("demande toutes les améliorations de l'ère IV et assez de robots", () => {
    expect(canRenaissance4(readyForRenaissance4())).toBe(true);
    const poor = readyForRenaissance4();
    expect(canRenaissance4({ ...poor, resources: { ...poor.resources, robots: D(10) } })).toBe(false);
    expect(canRenaissance4({ ...poor, upgrades: {} })).toBe(false);
    expect(renaissance4({ ...poor, upgrades: {} })).toEqual({ ...poor, upgrades: {} });
  });

  it("ouvre l'ère V : remet les ères I à IV à zéro, garde le méta-progrès, donne des AI Cores", () => {
    const before = readyForRenaissance4();
    const s = renaissance4(before);
    expect(s.era).toBe(5);
    expect(s.aiCores).toBe(2); // √4e6 / 1000
    expect(s.resources.robots.toNumber()).toBe(ERA5_START_MACHINES);
    expect(s.upgrades).toEqual({});
    expect(s.neuralGrid).toEqual(before.neuralGrid);
    expect(s.algorithms).toEqual(before.algorithms);
    expect(s.eraStartedMs).toEqual([0, 1000, 2000, 3000, 5000]);
    expect(visibleBuildings(s)).toEqual([]);
  });
});

describe("ère V", () => {
  it("les politiques s'achètent une fois avec des AI Cores", () => {
    const s = eraFive({ aiCores: 3 });
    const bought = buyPolicy(s, "centralPlanning");
    expect(bought.aiCores).toBe(2);
    expect(policyFactor(bought, "control")).toBe(2);
    expect(buyPolicy(bought, "centralPlanning")).toBe(bought);
    expect(buyPolicy(eraFive({ aiCores: 0 }), "freeReplication").policies).toEqual({});
    expect(POLICIES.reduce((a, p) => a + p.cost, 0)).toBeLessThan(20);
  });

  it("le Contrôle s'accumule et les machines se répliquent ; le clic ne rapporte plus rien d'utile", () => {
    const s = eraFive();
    expect(controlRate(s)).toBeGreaterThan(0);
    const later = tick(s, 10_000);
    expect(later.resources.control.toNumber()).toBeCloseTo(controlRate(s) * 10, 1);
    expect(later.resources.robots.gt(s.resources.robots)).toBe(true);
    expect(clickManual(s).resources.robots.eq(s.resources.robots)).toBe(true);
  });

  it("les directives se donnent dans l'ordre et coûtent du Contrôle", () => {
    const rich = eraFive();
    const s = { ...rich, resources: { ...rich.resources, control: D(1e9) } };
    expect(giveDirective(s, DIRECTIVES[1].id)).toBe(s); // pas dans l'ordre
    const first = giveDirective(s, DIRECTIVES[0].id);
    expect(first.directives[DIRECTIVES[0].id]).toBe(true);
    expect(first.resources.control.toNumber()).toBe(1e9 - directiveCost(s, DIRECTIVES[0].id));
    expect(nextDirective(first)?.id).toBe(DIRECTIVES[1].id);
    expect(giveDirective(eraFive(), DIRECTIVES[0].id).directives).toEqual({}); // pas assez de Contrôle
  });

  it("l'automatisation atteint exactement 100 % et la Human Dependency 0 %", () => {
    const s = almostOver();
    expect(automation(s)).toBe(1);
    expect(humanDependency(s)).toBe(0);
    expect(humanDependency(eraFive())).toBe(1);
  });
});

describe("la fin", () => {
  it("arrive avec 7 milliards de machines et l'automatisation totale, pas avant", () => {
    expect(isEndReached(almostOver())).toBe(true);
    const few = almostOver();
    expect(isEndReached({ ...few, resources: { ...few.resources, robots: D(1e9) } })).toBe(false);
    expect(isEndReached({ ...few, directives: {} })).toBe(false);
    const ended = tick(almostOver(), 100);
    expect(ended.endedAtMs).toBe(ended.elapsedMs);
  });

  it("une partie finie est figée : plus aucune production", () => {
    const ended = tick(almostOver(), 100);
    expect(tick(ended, 60_000)).toBe(ended);
  });

  it("« Nouvelle humanité » repart de zéro, sans bonus, en gardant les archives", () => {
    const ended = { ...tick(almostOver(), 100), archives: { "first-page": true as const }, knowledgeBonuses: { "dial-up": true as const } };
    const fresh = newHumanity(ended, 7, "run-new-1");
    expect(fresh.era).toBe(1);
    expect(fresh.endedAtMs).toBeNull();
    expect(fresh.knowledgeBonuses).toEqual({});
    expect(fresh.aiCores).toBe(0);
    expect(fresh.archives).toEqual({ "first-page": true });
    expect(fresh.endings).toBe(1);
    expect(fresh.runId).toBe("run-new-1");
    expect(newHumanity(eraFive(), 7, "run-x")).toEqual(eraFive()); // pas avant la fin
  });

  it("le journal garde la première réponse de chaque événement", () => {
    const base = createInitialState(2);
    const open = { ...base, resources: { ...base.resources, money: D(1e9) }, event: { status: "open" as const, id: "y2k" } };
    const answered = resolveEvent(open, "ignore");
    expect(answered.journal).toEqual(["y2k:ignore"]);
    const again = resolveEvent({ ...answered, event: { status: "open", id: "y2k" } }, "patch");
    expect(again.journal).toEqual(["y2k:ignore"]);
  });
});

describe("sauvegarde v7", () => {
  it("une partie de l'ère V, ou finie, survit à un aller-retour", () => {
    const ended = tick(almostOver(), 100);
    const loaded = deserialize(serialize(ended));
    expect(loaded.ok && loaded.state.endedAtMs).toBe(ended.endedAtMs);
    expect(loaded.ok && loaded.state.era).toBe(5);
    expect(loaded.ok && loaded.state.runId).toBe(ended.runId);
  });

  it("une sauvegarde v6 migre : Contrôle à zéro, dates d'ères réparties, partie non finie", () => {
    const env = JSON.parse(serialize(createInitialState(4)));
    env.schemaVersion = 6;
    for (const key of ["renaissances4", "aiCores", "policies", "directives", "eraStartedMs", "journal", "runId", "endings", "endedAtMs"]) {
      delete env.state[key];
    }
    delete env.state.resources.control;
    env.state.era = 2;
    env.state.elapsedMs = 1000;
    const loaded = deserialize(JSON.stringify(env));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.resources.control.toNumber()).toBe(0);
    expect(loaded.state.eraStartedMs).toEqual([0, 500]);
    expect(loaded.state.endedAtMs).toBeNull();
    expect(loaded.state.runId).toBe("seed-4");
  });

  it("refuse une directive inconnue ou des dates d'ères incohérentes", () => {
    const env = JSON.parse(serialize(createInitialState(4)));
    env.state.directives = { hack: true };
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
    const env2 = JSON.parse(serialize(createInitialState(4)));
    env2.state.eraStartedMs = [0, 1]; // two dates in era I
    expect(deserialize(JSON.stringify(env2)).ok).toBe(false);
  });
});
