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
