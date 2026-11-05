import { describe, expect, it } from "vitest";
import { isPlaceholderEmail, placeholderEmail, validateSignUp } from "@/lib/account";
import { CloudSync, DEVICE_KEY, SYNCED_KEY } from "./cloud";
import { D } from "./decimal";
import { createInitialState } from "./engine";
import { SAVE_KEY, serialize } from "./save";
import { GameStore } from "./store";

/** In-memory localStorage. */
function memoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, String(value)),
  };
}

interface FakeServer {
  revision: number;
  data: string | null;
  activeDevice: string | null;
  putStatus?: number;
  calls: string[];
}

/** A fake /api/save that behaves like src/server/saves.ts for one player. */
function fakeFetch(server: FakeServer): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    server.calls.push(`${method} ${String(url)}`);
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
    if (String(url) === "/api/save/claim") {
      server.activeDevice = JSON.parse(String(init?.body)).deviceId;
      return reply(200, { revision: server.revision, data: server.data, activeDevice: server.activeDevice });
    }
    if (method === "GET") return reply(200, { revision: server.revision, data: server.data, activeDevice: server.activeDevice });
    if (server.putStatus) return reply(server.putStatus, { error: "x" });
    const body = JSON.parse(String(init?.body));
    if (server.activeDevice && server.activeDevice !== body.deviceId) return reply(423, { error: "x" });
    if (body.baseRevision !== server.revision) return reply(409, { error: "x" });
    server.revision += 1;
    server.data = body.data;
    server.activeDevice = body.deviceId;
    return reply(200, { revision: server.revision });
  }) as typeof fetch;
}

function setup(local: ReturnType<typeof createInitialState>, server: Partial<FakeServer>, extra: Record<string, string> = {}) {
  const storage = memoryStorage({ [SAVE_KEY]: serialize(local), [DEVICE_KEY]: "device-this-0001", ...extra });
  const store = new GameStore(storage);
  const fake: FakeServer = { revision: 0, data: null, activeDevice: null, calls: [], ...server };
  const cloud = new CloudSync(store, storage, fakeFetch(fake));
  return { storage, store, cloud, fake };
}

const rich = (money: number) => ({
  ...createInitialState(3),
  totalMoney: D(money),
  resources: { ...createInitialState(3).resources, money: D(money) },
});

describe("synchronisation cloud", () => {
  it("créer un compte reprend la partie invitée : elle devient la révision 1", async () => {
    const { store, cloud, fake } = setup(rich(500), {});
    await cloud.connect("alice");
    expect(cloud.getStatus()).toEqual({ kind: "synced", revision: 1 });
    expect(JSON.parse(fake.data ?? "{}").state).toEqual(JSON.parse(store.serialized()).state);
    expect(store.getSnapshot().state.resources.money.toNumber()).toBe(500);
  });

  it("sur un nouvel appareil, la partie du serveur est chargée, la locale gardée en secours", async () => {
    const { store, cloud, fake } = setup(rich(1), { revision: 4, data: serialize(rich(9000)) });
    await cloud.connect("alice");
    expect(store.getSnapshot().state.resources.money.toNumber()).toBe(9000);
    expect(fake.calls).toContain("POST /api/save/claim");
    expect(cloud.getStatus()).toEqual({ kind: "synced", revision: 5 });
  });

  it("sur le même appareil, la partie locale plus avancée est gardée et envoyée", async () => {
    const { store, cloud } = setup(
      rich(700),
      { revision: 2, data: serialize(rich(10)), activeDevice: "device-this-0001" },
      { [SYNCED_KEY]: JSON.stringify({ userId: "alice", revision: 2 }) },
    );
    await cloud.connect("alice");
    expect(store.getSnapshot().state.resources.money.toNumber()).toBe(700);
    expect(cloud.getStatus()).toEqual({ kind: "synced", revision: 3 });
  });

  it("si un autre appareil joue, la partie est en lecture seule jusqu'à « Reprendre ici »", async () => {
    const { store, cloud, fake } = setup(rich(1), { revision: 3, data: serialize(rich(42)), activeDevice: "device-other-0002" });
    await cloud.connect("alice");
    expect(cloud.getStatus()).toEqual({ kind: "elsewhere" });
    expect(store.getSnapshot().readOnly).toBe(true);
    store.click();
    expect(store.getSnapshot().state.totalClicks).toBe(0);
    await cloud.resumeHere();
    expect(fake.activeDevice).toBe("device-this-0001");
    expect(store.getSnapshot().readOnly).toBe(false);
    expect(store.getSnapshot().state.resources.money.toNumber()).toBe(42);
  });

  it("une révision refusée (409) met la partie en pause au lieu d'écraser", async () => {
    const { store, cloud, fake } = setup(rich(1), {});
    await cloud.connect("alice");
    fake.putStatus = 409;
    await cloud.push();
    expect(cloud.getStatus()).toEqual({ kind: "conflict" });
    expect(store.getSnapshot().readOnly).toBe(true);
  });

  it("la partie d'un autre compte n'est pas reprise par un nouveau compte", async () => {
    const { store, cloud } = setup(rich(800), {}, { [SYNCED_KEY]: JSON.stringify({ userId: "bob", revision: 7 }) });
    await cloud.connect("alice");
    expect(store.getSnapshot().state.resources.money.toNumber()).toBe(0);
  });
});

describe("règles de compte", () => {
  it("valide pseudo, mot de passe et email facultatif", () => {
    expect(validateSignUp({ username: "Ada_92", password: "12345678", email: "" })).toBeNull();
    expect(validateSignUp({ username: "ab", password: "12345678", email: "" })).not.toBeNull();
    expect(validateSignUp({ username: "a b c", password: "12345678", email: "" })).not.toBeNull();
    expect(validateSignUp({ username: "ada", password: "1234567", email: "" })).not.toBeNull();
    expect(validateSignUp({ username: "ada", password: "12345678", email: "pas-un-email" })).not.toBeNull();
    expect(validateSignUp({ username: "ada", password: "12345678", email: placeholderEmail("ada") })).not.toBeNull();
  });

  it("l'adresse sans email dérive du pseudo, en minuscules", () => {
    expect(placeholderEmail("Ada")).toBe("ada@sans-email.thelasthuman.invalid");
    expect(isPlaceholderEmail(placeholderEmail("Ada"))).toBe(true);
    expect(isPlaceholderEmail("ada@example.com")).toBe(false);
  });
});
