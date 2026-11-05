import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "@/game/engine";
import { serialize } from "@/game/save";
import { PrismaClient } from "@/generated/prisma/client";
import { SNAPSHOTS_KEPT, claimDevice, readSave, writeSave } from "./saves";

/**
 * Integration tests against a real PostgreSQL (PGlite, in memory), with the real migration.
 * Two players, two devices: revisions, active device and isolation (cahier §8 and §11).
 */

let pglite: PGlite;
let server: PGLiteSocketServer;
let db: PrismaClient;

const ALICE = "user-alice";
const BOB = "user-bob";
const PHONE = "device-phone-0001";
const LAPTOP = "device-laptop-0002";
const SAVE = serialize(createInitialState(5));

beforeAll(async () => {
  pglite = await PGlite.create();
  await pglite.exec(readFileSync(path.join(__dirname, "../../prisma/migrations/0001_init/migration.sql"), "utf8"));
  server = new PGLiteSocketServer({ db: pglite, port: 0, maxConnections: 5 });
  await server.start();
  const address = server.getServerConn();
  db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: `postgresql://postgres:postgres@${address}/postgres?sslmode=disable` }),
  });
}, 60_000);

afterAll(async () => {
  await db?.$disconnect();
  await server?.stop();
  await pglite?.close();
});

beforeEach(async () => {
  await db.saveSnapshot.deleteMany();
  await db.save.deleteMany();
  await db.user.deleteMany();
  for (const id of [ALICE, BOB]) {
    await db.user.create({ data: { id, name: id, email: `${id}@example.test`, username: id } });
  }
});

describe("sauvegarde cloud", () => {
  it("un joueur sans sauvegarde lit la révision 0", async () => {
    expect((await readSave(db, ALICE)).body).toEqual({ revision: 0, data: null, activeDevice: null });
  });

  it("la première écriture crée la révision 1 et désigne l'appareil actif", async () => {
    const res = await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: SAVE });
    expect(res).toEqual({ status: 200, body: { revision: 1 } });
    expect((await readSave(db, ALICE)).body).toMatchObject({ revision: 1, data: SAVE, activeDevice: PHONE });
  });

  it("une écriture partie d'une révision dépassée est refusée (409), sans rien écraser", async () => {
    await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: SAVE });
    await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 1, data: SAVE });
    const stale = await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 1, data: SAVE });
    expect(stale.status).toBe(409);
    expect(stale.body.revision).toBe(2);
    expect((await readSave(db, ALICE)).body.revision).toBe(2);
  });

  it("un autre appareil est en lecture seule (423) jusqu'à « Reprendre ici »", async () => {
    await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: SAVE });
    expect((await writeSave(db, ALICE, { deviceId: LAPTOP, baseRevision: 1, data: SAVE })).status).toBe(423);
    const claimed = await claimDevice(db, ALICE, { deviceId: LAPTOP });
    expect(claimed.body).toMatchObject({ revision: 1, activeDevice: LAPTOP });
    expect((await writeSave(db, ALICE, { deviceId: LAPTOP, baseRevision: 1, data: SAVE })).status).toBe(200);
    expect((await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 2, data: SAVE })).status).toBe(423);
  });

  it("chaque joueur ne voit que sa propre sauvegarde", async () => {
    await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: SAVE });
    expect((await readSave(db, BOB)).body).toEqual({ revision: 0, data: null, activeDevice: null });
  });

  it("le serveur garde les 10 dernières sauvegardes", async () => {
    for (let base = 0; base < SNAPSHOTS_KEPT + 3; base++) {
      expect((await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: base, data: SAVE })).status).toBe(200);
    }
    const snapshots = await db.saveSnapshot.findMany({ where: { userId: ALICE }, orderBy: { revision: "asc" } });
    expect(snapshots).toHaveLength(SNAPSHOTS_KEPT);
    expect(snapshots[0].revision).toBe(4);
  });

  it("refuse une sauvegarde invalide, trop grande ou mal formée", async () => {
    expect((await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: "{}" })).status).toBe(400);
    expect((await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: "x".repeat(300_000) })).status).toBe(413);
    expect((await writeSave(db, ALICE, { deviceId: "a", baseRevision: 0, data: SAVE })).status).toBe(400);
    expect((await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: -1, data: SAVE })).status).toBe(400);
    expect((await writeSave(db, ALICE, null)).status).toBe(400);
    const negative = JSON.parse(SAVE);
    negative.state.resources.money = "-5";
    expect((await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: JSON.stringify(negative) })).status).toBe(400);
  });
});
