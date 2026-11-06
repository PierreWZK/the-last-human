import { describe, expect, it, vi } from "vitest";
import { MAX_CLICKS_PER_SECOND } from "./engine";
import { GameStore } from "./store";

describe("anti-triche des clics", () => {
  it("ignore un clic fait par un script (Event.isTrusted faux)", () => {
    const store = new GameStore(null);
    store.click(false);
    expect(store.getSnapshot().state.totalClicks).toBe(0);
    store.click(true);
    expect(store.getSnapshot().state.totalClicks).toBe(1);
  });

  it("ne compte pas plus de 20 clics dans la même seconde", () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(1000);
    const store = new GameStore(null);
    for (let i = 0; i < 50; i++) store.click(true);
    expect(store.getSnapshot().state.totalClicks).toBe(MAX_CLICKS_PER_SECOND);
    now.mockReturnValue(2001);
    store.click(true);
    expect(store.getSnapshot().state.totalClicks).toBe(MAX_CLICKS_PER_SECOND + 1);
    now.mockRestore();
  });
});

describe("frappe au clavier", () => {
  /** Advances the store's clock by `ms` in 1 s steps (each step stays under the catch-up threshold). */
  function advance(store: GameStore, now: { value: number }, ms: number) {
    for (let t = 0; t < ms; t += 1000) {
      now.value += 1000;
      (store as unknown as { step(): void }).step();
    }
  }

  it("une touche compte comme un clic ; touche maintenue et frappe par script ignorées", () => {
    const store = new GameStore(null);
    store.type("a", true, false);
    store.type("a", true, true);
    store.type("a", false, false);
    store.type("Enter", true, false);
    expect(store.getSnapshot().state.totalClicks).toBe(1);
  });

  it("une ligne bonus apparaît après une minute ; la recopier sans faute paie une minute de production", () => {
    const now = { value: 1000 };
    const spy = vi.spyOn(performance, "now").mockImplementation(() => now.value);
    const store = new GameStore(null);
    (store as unknown as { lastNow: number }).lastNow = now.value;
    advance(store, now, 30_000);
    expect(store.getTyping().line).toBeNull();
    advance(store, now, 31_000);
    const line = store.getTyping().line;
    expect(line).not.toBeNull();

    const text = line!.text;
    store.type(text[0] === "#" ? "@" : "#", true, false);
    expect(store.getTyping().line?.error).toBe(true);
    for (const ch of text) {
      now.value += 100; // 10 keys a second: under the 20 per second limit
      store.type(ch, true, false);
    }
    const typing = store.getTyping();
    expect(typing.line).toBeNull();
    expect(typing.reward?.toNumber()).toBeGreaterThanOrEqual(30); // at least 30 clicks at the start
    expect(store.getSnapshot().state.totalMoney.toNumber()).toBeGreaterThanOrEqual(30 + text.length);
    spy.mockRestore();
  });
});
