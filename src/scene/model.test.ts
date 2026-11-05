import { describe, expect, it } from "vitest";
import { createInitialState, resolveY2K } from "@/game/engine";
import { SHOWN_CAP, sceneModel, tierFor } from "./model";

describe("modèle de scène", () => {
  it("les paliers suivent 1, 10, 25 et 50 exemplaires", () => {
    expect([0, 1, 9, 10, 24, 25, 49, 50, 500].map(tierFor)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("une partie neuve montre une pièce vide, sans automatisation", () => {
    const m = sceneModel(createInitialState());
    expect(m.automated).toBe(false);
    expect(Object.values(m.shown).every((n) => n === 0)).toBe(true);
  });

  it("le nombre d'objets dessinés est plafonné par bâtiment", () => {
    const s = createInitialState();
    const m = sceneModel({ ...s, buildings: { ...s.buildings, shop: 3, homePage: 400 } });
    expect(m.shown.shop).toBe(3);
    expect(m.shown.homePage).toBe(SHOWN_CAP.homePage);
    expect(m.tiers.homePage).toBe(4);
    expect(m.automated).toBe(true);
  });

  it("reflète l'événement de l'an 2000 et son ralentissement", () => {
    const open = { ...createInitialState(), event: { status: "open" as const, id: "y2k" } };
    expect(sceneModel(open).y2kOpen).toBe(true);
    const ignored = sceneModel(resolveY2K(open, "ignore"));
    expect(ignored.y2kOpen).toBe(false);
    expect(ignored.slowed).toBe(true);
  });
});
