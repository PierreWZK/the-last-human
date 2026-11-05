import { describe, expect, it } from "vitest";
import { EVENT_GAP_MS, RANDOM_EVENTS } from "@/content/events1";
import { D } from "./decimal";
import {
  achievementBonus,
  clickManual,
  createInitialState,
  humanDependency,
  manualGain,
  productionPerSecond,
  resolveEvent,
  tick,
} from "./engine";
import { nextRandom } from "./rng";
import { deserialize, serialize } from "./save";
import type { GameState } from "./types";

/** A state where the scripted event has been answered, so random events may start. */
function afterY2K(seed = 7): GameState {
  return { ...createInitialState(seed), event: { status: "resolved", id: "y2k", choice: "ignore" } };
}

describe("tirage aléatoire", () => {
  it("la même graine donne toujours la même suite", () => {
    const a = nextRandom(42);
    expect(nextRandom(42)).toEqual(a);
    expect(nextRandom(a.seed).value).not.toBe(a.value);
  });

  it("un événement aléatoire ouvre après le délai, une fois l'an 2000 réglé", () => {
    const s = afterY2K(7);
    expect(tick(s, EVENT_GAP_MS.min - 1000).event.status).toBe("resolved");
    const later = tick(s, EVENT_GAP_MS.min + 1000);
    expect(later.event.status).toBe("open");
    if (later.event.status !== "open") return;
    expect(RANDOM_EVENTS.map((e) => e.id)).toContain(later.event.id);
  });

  it("pendant l'an 2000 aucun événement aléatoire ne s'ouvre", () => {
    const pending: GameState = { ...createInitialState(7), event: { status: "open", id: "y2k" } };
    expect(tick(pending, EVENT_GAP_MS.max * 3).event).toEqual({ status: "open", id: "y2k" });
  });

  it("chaque événement aléatoire propose au moins deux choix", () => {
    for (const e of RANDOM_EVENTS) expect(e.choices.length).toBeGreaterThanOrEqual(2);
  });
});

describe("choix d'événement", () => {
  it("un choix qui coûte plus que l'argent disponible ne change rien", () => {
    const s: GameState = {
      ...afterY2K(),
      event: { status: "open", id: "server-down" },
      resources: { money: D(100), data: D(0) },
    };
    expect(resolveEvent(s, "repair")).toBe(s);
  });

  it("payer déduit l'argent et compte l'événement", () => {
    const s: GameState = {
      ...afterY2K(),
      event: { status: "open", id: "tax-letter" },
      resources: { money: D(5000), data: D(0) },
    };
    const after = resolveEvent(s, "pay");
    expect(after.resources.money.toNumber()).toBe(4000);
    expect(after.eventsResolved).toBe(s.eventsResolved + 1);
    expect(after.event).toEqual({ status: "resolved", id: "tax-letter", choice: "pay" });
  });

  it("un effet temporaire s'arrête à la fin de sa durée", () => {
    const s: GameState = { ...afterY2K(), event: { status: "open", id: "viral-post" } };
    const boosted = resolveEvent(s, "ride");
    expect(boosted.effects[0]).toMatchObject({ kind: "boost", factor: 2 });
    expect(tick(boosted, 90_001).effects).toHaveLength(0);
  });
});

describe("Human Dependency", () => {
  it("vaut 100 % au départ, puis baisse quand les machines travaillent", () => {
    const s = createInitialState();
    expect(humanDependency(s)).toBe(1);
    const machines = { ...s, buildings: { ...s.buildings, rentedServer: 5 } };
    expect(humanDependency(machines)).toBeLessThan(0.1);
  });
});

describe("archives et succès", () => {
  it("une archive s'ouvre quand la part humaine passe sous le seuil, et reste ouverte", () => {
    const base = createInitialState();
    // Only forums (80 % human): below the 90 % threshold of the first archive.
    const s = { ...base, buildings: { ...base.buildings, forum: 40 } };
    const unlocked = tick(s, 1);
    expect(humanDependency(unlocked)).toBeCloseTo(0.8, 6);
    expect(unlocked.archives["first-page"]).toBe(true);
    expect(tick(unlocked, 1).archives["first-page"]).toBe(true);
  });

  it("le premier clic débloque « Premier clic », qui ajoute 1 % au clic", () => {
    const before = createInitialState();
    const s = clickManual(before);
    expect(s.achievements["first-click"]).toBe(true);
    expect(achievementBonus(s)).toBeCloseTo(1.01, 6);
    expect(manualGain(s).div(manualGain(before)).toNumber()).toBeCloseTo(1.01, 6);
  });

  it("les succès ajoutent 1 % à la production", () => {
    const base = createInitialState();
    const owned = { ...base, buildings: { ...base.buildings, homePage: 9 } };
    const withAchievement = { ...owned, achievements: { "first-click": true as const } };
    const ratio =
      productionPerSecond(withAchievement).money.toNumber() / productionPerSecond(owned).money.toNumber();
    expect(ratio).toBeCloseTo(1.01, 6);
  });
});

describe("sauvegarde v2 et migration", () => {
  it("un aller-retour conserve les archives, les succès et la graine", () => {
    const s: GameState = { ...clickManual(createInitialState(99)), archives: { "y2k-night": true } };
    const loaded = deserialize(serialize(s));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.rngSeed).toBe(99);
    expect(loaded.state.archives).toEqual({ "y2k-night": true });
    expect(loaded.state.achievements).toEqual(s.achievements);
  });

  it("une sauvegarde v1 se charge : l'an 2000 garde son identifiant", () => {
    const v1 = JSON.stringify({
      schemaVersion: 1,
      savedAt: new Date(0).toISOString(),
      state: {
        schemaVersion: 1,
        elapsedMs: 600_000,
        resources: { money: "1234", data: "0" },
        totalMoney: "5000",
        buildings: { homePage: 3 },
        upgrades: {},
        event: { status: "resolved", choice: "patch" },
        effects: [],
      },
    });
    const loaded = deserialize(v1);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.event).toEqual({ status: "resolved", id: "y2k", choice: "patch" });
    expect(loaded.state.eventsResolved).toBe(1);
    expect(loaded.state.nextEventAtMs).toBe(600_000 + EVENT_GAP_MS.min);
    expect(loaded.state.archives).toEqual({});
  });

  it("refuse une archive inconnue", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.state.archives = { invented: true };
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
  });
});
