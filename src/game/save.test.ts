import { describe, expect, it } from "vitest";
import { D } from "./decimal";
import { buyBuilding, clickManual, createInitialState, tick } from "./engine";
import { deserialize, serialize } from "./save";

function playedState() {
  let s = createInitialState();
  for (let i = 0; i < 20; i++) s = clickManual(s);
  s = buyBuilding({ ...s, resources: { ...s.resources, money: D(500) } }, "homePage", 10);
  s = tick(s, 45_000);
  return s;
}

describe("sauvegarde", () => {
  it("un aller-retour conserve exactement l'état, grands nombres compris", () => {
    const s = { ...playedState(), totalMoney: D("1.5e40") };
    const loaded = deserialize(serialize(s));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.resources.money.toString()).toBe(s.resources.money.toString());
    expect(loaded.state.totalMoney.toString()).toBe(s.totalMoney.toString());
    expect(loaded.state.buildings).toEqual(s.buildings);
    expect(loaded.state.elapsedMs).toBe(s.elapsedMs);
  });

  it("refuse le JSON cassé sans rien remplacer", () => {
    expect(deserialize("{pas du json").ok).toBe(false);
  });

  it("refuse une version plus récente que le jeu", () => {
    const raw = JSON.stringify({ schemaVersion: 99, state: {} });
    const result = deserialize(raw);
    expect(result.ok).toBe(false);
  });

  it("refuse un bâtiment inconnu", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.state.buildings.spaceStation = 1;
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
  });

  it("refuse un nombre négatif ou non entier de bâtiments", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.state.buildings.forum = -3;
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
    env.state.buildings.forum = 1.5;
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
  });

  it("refuse une ressource qui n'est pas un nombre", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.state.resources.money = "beaucoup";
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
  });

  it("refuse une amélioration inconnue", () => {
    const env = JSON.parse(serialize(createInitialState()));
    env.state.upgrades.cheat = true;
    expect(deserialize(JSON.stringify(env)).ok).toBe(false);
  });
});
