import { describe, expect, it } from "vitest";
import { D } from "./decimal";
import {
  buyBuilding,
  canBuyUpgrade,
  canRenaissance,
  createInitialState,
  productionPerSecond,
  renaissance,
  setScriptTarget,
  tick,
  visibleBuildings,
  visibleUpgrades,
} from "./engine";
import { deserialize, serialize } from "./save";
import type { GameState } from "./types";

/** Era II, with some money and nothing else. */
function eraTwo(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialState(9), era: 2, ...overrides };
}

describe("ère II : production et scripts", () => {
  it("un bâtiment de l'ère II produit du Calcul", () => {
    const base = eraTwo();
    const s = { ...base, buildings: { ...base.buildings, database: 2 } };
    const after = tick(s, 1000);
    expect(after.resources.compute.toNumber()).toBeCloseTo(6, 6); // 2 × 3 Calcul/s
  });

  it("un script d'achat rachète la cible dès qu'elle est abordable", () => {
    const base = eraTwo();
    const s = {
      ...base,
      buildings: { ...base.buildings, buyScript: 1 },
      scriptTarget: "homePage" as const,
      resources: { money: D(1000), data: D(0), compute: D(0) },
    };
    const after = tick(s, 1000);
    expect(after.buildings.homePage).toBeGreaterThan(0);
    expect(after.resources.money.toNumber()).toBeLessThan(1000);
  });

  it("un script achète au plus une unité par seconde de jeu", () => {
    const base = eraTwo();
    const s = {
      ...base,
      buildings: { ...base.buildings, buyScript: 2 },
      scriptTarget: "homePage" as const,
      resources: { money: D(1_000_000), data: D(0), compute: D(0) },
    };
    // 300 ms: no second has passed, nothing is bought.
    expect(tick(s, 300).buildings.homePage).toBe(0);
    // One second: two scripts, one unit each.
    expect(tick(s, 1000).buildings.homePage).toBe(2);
  });

  it("sans script, la cible n'est pas achetée", () => {
    const base = eraTwo();
    const s = { ...base, scriptTarget: "homePage" as const, resources: { money: D(1000), data: D(0), compute: D(0) } };
    expect(tick(s, 100).buildings.homePage).toBe(0);
  });

  it("sans cible, le script ne fait rien", () => {
    const base = eraTwo();
    const s = { ...base, buildings: { ...base.buildings, buyScript: 1 }, resources: { money: D(1000), data: D(0), compute: D(0) } };
    expect(tick(s, 100).buildings.homePage).toBe(0);
  });

  it("on ne peut pas désigner le script lui-même comme cible", () => {
    const s = eraTwo();
    expect(setScriptTarget(s, "buyScript")).toBe(s);
    expect(setScriptTarget(s, "forum").scriptTarget).toBe("forum");
    expect(setScriptTarget(s, null).scriptTarget).toBeNull();
  });
});

describe("ère II : renaissance", () => {
  it("une fois en ère II, la renaissance I n'est plus proposée", () => {
    expect(canRenaissance(eraTwo())).toBe(false);
  });

  it("la renaissance I ouvre l'ère II et vide la cible de script", () => {
    const base = createInitialState(4);
    const ready = {
      ...base,
      scriptTarget: "forum" as const,
      upgrades: Object.fromEntries(
        // all era I upgrades owned
        ["keyboard", "mouse", "touchTyping", "manualFlow", "darkTheme", "freeHosting", "moderation", "forumCharter", "onlinePayment", "catalog", "proVersion", "companyLicense", "seo", "targetedAds", "longContract", "liquidCooling", "crossLinks", "webRing", "nightBackup", "localNetwork", "wordOfMouth", "dialUpGone"].map((id) => [id, true as const]),
      ),
      totalMoney: D(1_000_000),
    };
    const after = renaissance(ready);
    expect(after.era).toBe(2);
    expect(after.scriptTarget).toBeNull();
    expect(after.resources.compute.toNumber()).toBe(0);
  });
});

describe("sauvegarde v4", () => {
  it("un aller-retour conserve l'ère, la cible et le Calcul", () => {
    const s = eraTwo({ scriptTarget: "shop", resources: { money: D(3), data: D(0), compute: D(42) } });
    const loaded = deserialize(serialize(s));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.era).toBe(2);
    expect(loaded.state.scriptTarget).toBe("shop");
    expect(loaded.state.resources.compute.toNumber()).toBe(42);
  });

  it("une sauvegarde v3 après une renaissance se charge en ère II", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.schemaVersion = 3;
    env.state.schemaVersion = 3;
    env.state.renaissances = 1;
    delete env.state.era;
    delete env.state.scriptTarget;
    delete env.state.resources.compute;
    const loaded = deserialize(JSON.stringify(env));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.era).toBe(2);
    expect(loaded.state.resources.compute.toNumber()).toBe(0);
    expect(loaded.state.scriptTarget).toBeNull();
  });

  it("refuse une cible de script inconnue", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.state.scriptTarget = "invented";
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
  });
});

describe("ère II : visibilité et améliorations", () => {
  it("les bâtiments et améliorations de l'ère II n'apparaissent qu'en ère II", () => {
    const one = createInitialState();
    expect(visibleBuildings(one).some((b) => b.era === 2)).toBe(false);
    expect(visibleUpgrades(one).some((u) => u.era === 2)).toBe(false);
    expect(visibleBuildings(eraTwo()).some((b) => b.id === "datacenter")).toBe(true);
    expect(visibleUpgrades(eraTwo()).some((u) => u.id === "memoryCache")).toBe(true);
  });

  it("en ère I, on ne peut pas acheter un bâtiment ni une amélioration de l'ère II", () => {
    const s = { ...createInitialState(), resources: { money: D(1e9), data: D(1e9), compute: D(1e9) } };
    expect(buyBuilding(s, "database", 1)).toBe(s);
    const owning = { ...s, buildings: { ...s.buildings, database: 10 } };
    expect(canBuyUpgrade(owning, "memoryCache")).toBe(false);
    expect(canBuyUpgrade({ ...owning, era: 2 }, "memoryCache")).toBe(true);
  });

  it("Mémoire cache double le calcul des bases de données", () => {
    const base = eraTwo();
    const s = { ...base, buildings: { ...base.buildings, database: 10 } };
    const cached = { ...s, upgrades: { memoryCache: true as const } };
    const ratio = productionPerSecond(cached).compute.toNumber() / productionPerSecond(s).compute.toNumber();
    expect(ratio).toBeCloseTo(2, 6);
  });
});
