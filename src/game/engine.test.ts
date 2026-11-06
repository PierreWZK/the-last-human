import { describe, expect, it } from "vitest";
import { D } from "./decimal";

import {
  achievementBonus,
  buildingCost,
  getBuilding,
  buyBuilding,
  buyUpgrade,
  canBuyUpgrade,
  clickManual,
  createInitialState,
  manualGain,
  maxAffordable,
  milestoneMultiplier,
  nextMilestone,
  productionPerSecond,
  resolveY2K,
  synergyBonus,
  tick,
} from "./engine";
import type { GameState } from "./types";

function withMoney(state: GameState, amount: number): GameState {
  return { ...state, resources: { ...state.resources, money: D(amount) } };
}

describe("coûts", () => {
  it("le premier achat coûte le prix de base", () => {
    expect(buildingCost("homePage", 0, 1).toNumber()).toBeCloseTo(getBuilding("homePage").baseCost.toNumber(), 6);
  });

  it("le total de N achats égale la somme des coûts unitaires", () => {
    let sum = 0;
    const { baseCost, growth } = getBuilding("homePage");
    for (let i = 0; i < 10; i++) sum += baseCost.toNumber() * Math.pow(growth, 3 + i);
    expect(buildingCost("homePage", 3, 10).toNumber()).toBeCloseTo(sum, 4);
  });

  it("maxAffordable s'arrête exactement au bon seuil", () => {
    const base = createInitialState();
    const exact = buildingCost("homePage", 0, 7).toNumber();
    expect(maxAffordable(withMoney(base, exact), "homePage")).toBe(7);
    expect(maxAffordable(withMoney(base, exact - 0.01), "homePage")).toBe(6);
    expect(maxAffordable(withMoney(base, 1), "homePage")).toBe(0);
  });
});

describe("achats", () => {
  it("n'achète jamais avec des fonds insuffisants", () => {
    const s = withMoney(createInitialState(), 10);
    expect(buyBuilding(s, "homePage", 1)).toBe(s);
    expect(buyBuilding(s, "homePage", "max")).toBe(s);
  });

  it("déduit le coût et ajoute les bâtiments", () => {
    const price = getBuilding("homePage").baseCost.toNumber();
    const s = buyBuilding(withMoney(createInitialState(), price + 5), "homePage", 1);
    expect(s.resources.money.toNumber()).toBeCloseTo(5, 6);
    expect(s.buildings.homePage).toBe(1);
  });

  it("n'autorise jamais une ressource négative", () => {
    let s = withMoney(createInitialState(), 1_000_000);
    for (let i = 0; i < 30; i++) s = buyBuilding(s, "shop", "max");
    expect(s.resources.money.gte(0)).toBe(true);
  });

  it("une amélioration n'est achetée qu'une fois et seulement si l'exigence est remplie", () => {
    const s = withMoney(createInitialState(), 1_000_000);
    expect(canBuyUpgrade(s, "darkTheme")).toBe(false);
    const withPages = { ...s, buildings: { ...s.buildings, homePage: 10 } };
    const bought = buyUpgrade(withPages, "darkTheme");
    expect(bought.upgrades.darkTheme).toBe(true);
    expect(buyUpgrade(bought, "darkTheme")).toBe(bought);
  });
});

describe("production", () => {
  it("neuf pages personnelles produisent 1,8 argent par seconde (avant le premier palier)", () => {
    const base = createInitialState();
    const s = { ...base, buildings: { ...base.buildings, homePage: 9 } };
    expect(productionPerSecond(s).money.toNumber()).toBeCloseTo(1.8, 6);
    const after = tick(s, 1000);
    expect(after.resources.money.toNumber()).toBeCloseTo(1.8, 6);
    expect(after.totalMoney.toNumber()).toBeCloseTo(1.8, 6);
    expect(after.elapsedMs).toBe(1000);
  });

  it("une amélioration de bâtiment double sa production", () => {
    const base = createInitialState();
    const s = { ...base, buildings: { ...base.buildings, homePage: 9 }, upgrades: { darkTheme: true as const } };
    expect(productionPerSecond(s).money.toNumber()).toBeCloseTo(3.6, 6);
  });

  it("le palier de 10 exemplaires double la production du bâtiment", () => {
    const base = createInitialState();
    const s = { ...base, buildings: { ...base.buildings, homePage: 10 } };
    expect(productionPerSecond(s).money.toNumber()).toBeCloseTo(4, 6);
    expect(milestoneMultiplier(9)).toBe(1);
    expect(milestoneMultiplier(25)).toBe(4);
    expect(nextMilestone(0)).toBe(10);
    expect(nextMilestone(1000)).toBeNull();
  });

  it("une synergie ajoute son pourcentage par bâtiment source possédé", () => {
    const base = createInitialState();
    const s = {
      ...base,
      buildings: { ...base.buildings, forum: 10, shop: 1 },
      upgrades: { crossLinks: true as const },
    };
    // 1 boutique × 2 €/s × (1 + 10 × 2 %) = 2,4
    expect(synergyBonus(s, "shop")).toBeCloseTo(1.2, 6);
    expect(productionPerSecond(s).money.toNumber()).toBeCloseTo(2.4, 6);
  });

  it("le clic manuel suit les améliorations manuelles", () => {
    const s = createInitialState();
    expect(manualGain(s).toNumber()).toBe(1);
    const boosted = { ...s, upgrades: { keyboard: true as const } };
    expect(manualGain(boosted).toNumber()).toBe(2);
    expect(clickManual(s).resources.money.toNumber()).toBe(1);
  });

  it("un temps négatif ou nul ne change rien", () => {
    const s = createInitialState();
    expect(tick(s, 0)).toBe(s);
    expect(tick(s, -500)).toBe(s);
  });
});

describe("événement : le bug de l'an 2000", () => {
  it("s'ouvre une fois le seuil d'argent gagné, pas avant", () => {
    const s = createInitialState();
    const almost = { ...s, totalMoney: D(4999) };
    expect(tick(almost, 1).event.status).toBe("pending");
    const reached = { ...s, totalMoney: D(5000) };
    expect(tick(reached, 1).event.status).toBe("open");
  });

  it("corriger coûte 1 500 et déduit l'argent", () => {
    const open = { ...withMoney(createInitialState(), 2000), event: { status: "open" as const, id: "y2k" } };
    const fixed = resolveY2K(open, "patch");
    expect(fixed.event).toEqual({ status: "resolved", id: "y2k", choice: "patch" });
    expect(fixed.resources.money.toNumber()).toBe(500);
  });

  it("corriger est impossible sans les fonds", () => {
    const open = { ...withMoney(createInitialState(), 100), event: { status: "open" as const, id: "y2k" } };
    expect(resolveY2K(open, "patch")).toBe(open);
  });

  it("ignorer divise la production par deux pendant 120 s de jeu, puis l'effet expire", () => {
    const base = createInitialState();
    const open = { ...base, buildings: { ...base.buildings, homePage: 9 }, event: { status: "open" as const, id: "y2k" } };
    const ignored = resolveY2K(open, "ignore");
    // Answering unlocks achievements (+0,1 % each): the slowdown is measured against them.
    expect(productionPerSecond(ignored).money.toNumber()).toBeCloseTo(0.9 * achievementBonus(ignored), 6);
    const later = tick(ignored, 120_000);
    expect(later.effects).toHaveLength(0);
    expect(productionPerSecond(later).money.toNumber()).toBeCloseTo(1.8 * achievementBonus(later), 6);
  });
});
