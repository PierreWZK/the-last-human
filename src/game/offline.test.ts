import { describe, expect, it } from "vitest";
import { D } from "./decimal";
import { createInitialState, productionPerSecond } from "./engine";
import { OFFLINE_CAP_MS, guestAwayMs, offlineProgress } from "./offline";
import { deserialize, serialize } from "./save";
import { GameStore } from "./store";
import { SAVE_KEY } from "./save";

const HOUR = 3_600_000;

function withPages() {
  const base = createInitialState(3);
  return { ...base, buildings: { ...base.buildings, homePage: 10 } };
}

class MemoryStorage {
  private items = new Map<string, string>();
  getItem = (k: string) => this.items.get(k) ?? null;
  setItem = (k: string, v: string) => void this.items.set(k, v);
  removeItem = (k: string) => void this.items.delete(k);
  clear = () => this.items.clear();
  key = () => null;
  get length() {
    return this.items.size;
  }
}

describe("progression hors ligne", () => {
  it("rejoue l'absence : la production correspond au débit", () => {
    const state = withPages();
    const rate = productionPerSecond(state).money.toNumber();
    const result = offlineProgress(state, HOUR)!;
    expect(result.report.durationMs).toBe(HOUR);
    expect(result.state.elapsedMs).toBe(HOUR);
    // Achievements unlocked on the way add 1 % each: at least the base rate, a little more.
    const produced = result.report.produced.money.toNumber();
    expect(produced).toBeGreaterThanOrEqual(rate * 3600 * 0.999);
    expect(produced).toBeLessThan(rate * 3600 * 1.2);
    expect(result.state.resources.money.toNumber()).toBeCloseTo(produced, 0);
  });

  it("ne compte jamais plus de 24 h", () => {
    const result = offlineProgress(withPages(), 72 * HOUR)!;
    expect(result.report.durationMs).toBe(OFFLINE_CAP_MS);
    expect(result.report.capped).toBe(true);
    expect(result.state.elapsedMs).toBe(OFFLINE_CAP_MS);
  });

  it("une horloge qui recule ne rapporte rien", () => {
    expect(offlineProgress(withPages(), -HOUR)).toBeNull();
    expect(offlineProgress(withPages(), Number.NaN)).toBeNull();
    expect(guestAwayMs(Date.UTC(2030, 0, 2), Date.UTC(2030, 0, 1))).toBe(0);
    expect(guestAwayMs(null, Date.now())).toBe(0);
  });

  it("le fuseau horaire n'a aucun effet : tout est en UTC", () => {
    const paris = Date.parse("2030-03-31T03:00:00+02:00"); // lendemain du passage à l'heure d'été
    const utc = Date.parse("2030-03-31T01:00:00Z");
    expect(paris).toBe(utc);
    expect(guestAwayMs(Date.parse("2030-03-30T23:00:00Z"), paris)).toBe(2 * HOUR);
  });

  it("un entraînement de modèle continue pendant l'absence", () => {
    const base = createInitialState(9);
    const state = { ...base, era: 3 as const, training: { endsAtMs: 60_000 } };
    const result = offlineProgress(state, 10 * 60_000)!;
    expect(result.state.models.length).toBeGreaterThanOrEqual(1);
    expect(result.report.modelsTrained).toBeGreaterThanOrEqual(1);
  });

  it("au chargement, un invité récupère son absence et voit le récapitulatif", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, serialize(withPages(), new Date(Date.now() - 2 * HOUR)));
    const store = new GameStore(storage as unknown as Storage);
    const snap = store.getSnapshot();
    expect(snap.offline?.durationMs).toBeGreaterThanOrEqual(2 * HOUR - 1000);
    expect(snap.state.resources.money.gt(D(0))).toBe(true);
    store.dismissOffline();
    expect(store.getSnapshot().offline).toBeNull();
  });

  it("une sauvegarde datée du futur (horloge reculée) ne rapporte rien", () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, serialize(withPages(), new Date(Date.now() + 5 * HOUR)));
    const store = new GameStore(storage as unknown as Storage);
    expect(store.getSnapshot().offline).toBeNull();
    expect(store.getSnapshot().state.resources.money.toNumber()).toBe(0);
  });

  it("la date de sauvegarde est relue", () => {
    const at = new Date("2030-01-01T00:00:00Z");
    const loaded = deserialize(serialize(withPages(), at));
    expect(loaded.ok && loaded.savedAtMs).toBe(at.getTime());
  });
});
