import { describe, expect, it } from "vitest";
import { createInitialState, resolveY2K } from "@/game/engine";
import { D } from "@/game/decimal";
import { NODES_CAP, RACKS_CAP, SHOWN_CAP, sceneModel, tierFor } from "./model";

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

  it("les ères suivantes ont leur propre scène : racks, réseau, densité de machines", () => {
    const s = createInitialState();
    const era2 = sceneModel({ ...s, era: 2, buildings: { ...s.buildings, database: 30, buyScript: 1 } });
    expect(era2.era).toBe(2);
    expect(era2.racks).toBe(RACKS_CAP);
    expect(era2.scripts).toBe(true);
    const era3 = sceneModel({ ...s, era: 3, models: [1, 1, 1, 1, 1, 1] });
    expect(era3.nodes).toBe(NODES_CAP);
    const empty = sceneModel({ ...s, era: 4 });
    expect(empty.density).toBe(0);
    const full = sceneModel({ ...s, era: 4, resources: { ...s.resources, robots: D(7e9) } });
    expect(full.density).toBeCloseTo(1, 5);
  });
});
