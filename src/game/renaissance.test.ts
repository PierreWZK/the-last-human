import { describe, expect, it } from "vitest";
import { UPGRADES } from "@/content/era1";
import { D } from "./decimal";
import {
  buyKnowledgeBonus,
  canRenaissance,
  createInitialState,
  knowledgeGain,
  manualGain,
  productionPerSecond,
  renaissance,
} from "./engine";
import { deserialize, serialize } from "./save";
import type { GameState } from "./types";

/** A state where every upgrade of era I is owned: the renaissance is allowed. */
function eraOneDone(): GameState {
  const base = createInitialState(3);
  return {
    ...base,
    buildings: { ...base.buildings, homePage: 20 },
    resources: { money: D(900), data: D(40), compute: D(0), intelligence: D(0), robots: D(0), autonomy: D(0), control: D(0) },
    totalMoney: D(1_000_000),
    upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, true])),
    achievements: { "first-click": true },
    archives: { "first-page": true },
    eventsResolved: 2,
  };
}

describe("renaissance I", () => {
  it("refuse tant que toutes les améliorations de l'ère I ne sont pas achetées", () => {
    const s = createInitialState();
    expect(canRenaissance(s)).toBe(false);
    expect(renaissance(s)).toBe(s);
  });

  it("refuse pendant un événement ouvert", () => {
    const s = { ...eraOneDone(), event: { status: "open" as const, id: "rush-client" } };
    expect(canRenaissance(s)).toBe(false);
  });

  it("réinitialise argent, bâtiments et améliorations, et garde succès et archives", () => {
    const before = eraOneDone();
    const after = renaissance(before);
    expect(after.renaissances).toBe(1);
    expect(after.resources.money.toNumber()).toBe(0);
    expect(after.totalMoney.toNumber()).toBe(0);
    expect(Object.values(after.buildings).every((n) => n === 0)).toBe(true);
    expect(after.upgrades).toEqual({});
    expect(after.achievements).toMatchObject(before.achievements);
    expect(after.archives).toMatchObject(before.archives);
    expect(after.eventsResolved).toBe(before.eventsResolved);
  });

  it("donne des points de Knowledge, selon la racine des gains totaux", () => {
    expect(knowledgeGain(eraOneDone())).toBe(10); // sqrt(1 000 000) / 100
    expect(knowledgeGain(createInitialState())).toBe(1); // jamais moins de 1
    expect(renaissance(eraOneDone()).knowledgePoints).toBe(10);
  });
});

describe("arbre de Knowledge", () => {
  it("ne rien acheter sans assez de points", () => {
    const s = createInitialState();
    expect(buyKnowledgeBonus(s, "dial-up")).toBe(s);
  });

  it("un bonus de travail manuel double le gain du clic, et coûte ses points", () => {
    const s = { ...createInitialState(), knowledgePoints: 3 };
    const bought = buyKnowledgeBonus(s, "touch-typing");
    expect(bought.knowledgePoints).toBe(2);
    expect(bought.knowledgeBonuses).toEqual({ "touch-typing": true });
    expect(manualGain(bought).div(manualGain(s)).toNumber()).toBeCloseTo(2, 6);
  });

  it("un bonus de production s'applique à toutes les machines", () => {
    const base = createInitialState();
    const owned = { ...base, buildings: { ...base.buildings, homePage: 9 }, knowledgePoints: 4 };
    const boosted = buyKnowledgeBonus(owned, "dial-up");
    const ratio = productionPerSecond(boosted).money.toNumber() / productionPerSecond(owned).money.toNumber();
    expect(ratio).toBeCloseTo(2, 6);
  });

  it("un bonus déjà acheté ne se rachète pas", () => {
    const s = { ...createInitialState(), knowledgePoints: 5, knowledgeBonuses: { "touch-typing": true as const } };
    expect(buyKnowledgeBonus(s, "touch-typing")).toBe(s);
  });

  it("les bonus gardent leur effet après une renaissance", () => {
    const s = { ...eraOneDone(), knowledgeBonuses: { "touch-typing": true as const } };
    const after = renaissance(s);
    expect(after.knowledgeBonuses).toEqual({ "touch-typing": true });
    // Les succès restent acquis : la référence garde les mêmes.
    const reference = { ...createInitialState(), achievements: after.achievements };
    expect(manualGain(after).toNumber()).toBeCloseTo(2 * manualGain(reference).toNumber(), 6);
  });
});

describe("sauvegarde v3", () => {
  it("un aller-retour conserve renaissances, points et bonus", () => {
    const s = { ...renaissance(eraOneDone()), knowledgeBonuses: { "touch-typing": true as const } };
    const loaded = deserialize(serialize(s));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.renaissances).toBe(1);
    expect(loaded.state.knowledgePoints).toBe(s.knowledgePoints);
    expect(loaded.state.knowledgeBonuses).toEqual({ "touch-typing": true });
  });

  it("une sauvegarde v2 se charge sans points de Knowledge", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.schemaVersion = 2;
    delete env.state.renaissances;
    delete env.state.knowledgePoints;
    delete env.state.knowledgeBonuses;
    env.state.schemaVersion = 2;
    const loaded = deserialize(JSON.stringify(env));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.renaissances).toBe(0);
    expect(loaded.state.knowledgePoints).toBe(0);
    expect(loaded.state.knowledgeBonuses).toEqual({});
  });

  it("refuse un bonus de Knowledge inconnu", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.state.knowledgeBonuses = { invented: true };
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
  });
});
