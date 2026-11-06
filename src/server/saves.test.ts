import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "@/game/engine";
import { serialize } from "@/game/save";
import { PrismaClient } from "@/generated/prisma/client";
import { MIN_RUN_MS } from "@/content/era5";
import { readLeaderboard, readProfile, setHidden } from "./leaderboard";
import { SNAPSHOTS_KEPT, claimDevice, plausibleClicks, plausibleGameTime, readSave, writeSave } from "./saves";

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
  const migrations = path.join(__dirname, "../../prisma/migrations");
  for (const dir of readdirSync(migrations, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    await pglite.exec(readFileSync(path.join(migrations, dir, "migration.sql"), "utf8"));
  }
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
  await db.run.deleteMany();
  await db.saveSnapshot.deleteMany();
  await db.save.deleteMany();
  await db.user.deleteMany();
  for (const id of [ALICE, BOB]) {
    await db.user.create({ data: { id, name: id, email: `${id}@example.test`, username: id } });
  }
});

describe("sauvegarde cloud", () => {
  it("un joueur sans sauvegarde lit la révision 0", async () => {
    expect((await readSave(db, ALICE)).body).toEqual({ revision: 0, data: null, activeDevice: null, offlineMs: 0 });
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
    expect((await readSave(db, BOB)).body).toEqual({ revision: 0, data: null, activeDevice: null, offlineMs: 0 });
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

  it("refuse (422) une sauvegarde qui a plus de temps de jeu que de temps réel", async () => {
    await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: SAVE });
    const cheat = serialize({ ...createInitialState(5), elapsedMs: 10 * 3600 * 1000 });
    const res = await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 1, data: cheat });
    expect(res.status).toBe(422);
    expect((await readSave(db, ALICE)).body.revision).toBe(1);
  });

  it("mesure l'absence sur l'horloge du serveur, et « Reprendre ici » ne la remet pas à zéro", async () => {
    await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: SAVE });
    await db.save.update({ where: { userId: ALICE }, data: { lastSeenAt: new Date(Date.now() - 3_600_000) } });
    const claimed = await claimDevice(db, ALICE, { deviceId: LAPTOP });
    expect(claimed.body.offlineMs as number).toBeGreaterThanOrEqual(3_600_000);
    const later = serialize({ ...createInitialState(5), elapsedMs: 3_600_000 });
    expect((await writeSave(db, ALICE, { deviceId: LAPTOP, baseRevision: 1, data: later })).status).toBe(200);
  });

  it("plafonne l'absence lue à 24 h", async () => {
    await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: SAVE });
    await db.save.update({ where: { userId: ALICE }, data: { lastSeenAt: new Date(Date.now() - 72 * 3_600_000) } });
    expect((await readSave(db, ALICE)).body.offlineMs).toBe(24 * 3_600_000);
  });
});

describe("plausibilité du temps de jeu", () => {
  it("accepte le temps réel plus la marge, refuse au-delà", () => {
    expect(plausibleGameTime(0, 60_000, 60_000)).toBe(true);
    expect(plausibleGameTime(0, 180_000, 60_000)).toBe(true);
    expect(plausibleGameTime(0, 10 * 60_000, 60_000)).toBe(false);
    expect(plausibleGameTime(1_000_000, 0, 0)).toBe(true); // nouvelle partie : le temps recule
  });
});

describe("plausibilité des clics", () => {
  it("accepte 20 clics par seconde plus la marge, refuse au-delà", () => {
    expect(plausibleClicks(1200, 60_000)).toBe(true);
    expect(plausibleClicks(20 * 180, 60_000)).toBe(true); // marge de 120 s
    expect(plausibleClicks(10_000, 60_000)).toBe(false);
  });
});

describe("classement", () => {
  const ended = (runId: string) => serialize({ ...createInitialState(5, runId), endedAtMs: 1000 });

  it("une humanité commence à la première sauvegarde et finit à la sauvegarde terminée, sur l'horloge du serveur", async () => {
    await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 0, data: serialize(createInitialState(5, "run-alice-1")) });
    await db.run.updateMany({ where: { userId: ALICE }, data: { startedAt: new Date(Date.now() - MIN_RUN_MS - 60_000) } });
    await db.save.update({ where: { userId: ALICE }, data: { lastSeenAt: new Date(Date.now() - MIN_RUN_MS) } });
    expect((await writeSave(db, ALICE, { deviceId: PHONE, baseRevision: 1, data: ended("run-alice-1") })).status).toBe(200);
    const run = await db.run.findFirstOrThrow({ where: { userId: ALICE } });
    expect(run.valid).toBe(true);
    expect(run.durationSec).toBeGreaterThanOrEqual(MIN_RUN_MS / 1000);
    const board = await readLeaderboard(db);
    expect(board.fastest).toEqual([{ name: ALICE, value: run.durationSec }]);
    expect(board.most).toEqual([{ name: ALICE, value: 1 }]);
    expect(await readProfile(db, ALICE)).toMatchObject({ endings: 1, bestSec: run.durationSec, hidden: false });
  });

  it("une fin plus rapide que le minimum théorique est rejetée du classement", async () => {
    await writeSave(db, BOB, { deviceId: PHONE, baseRevision: 0, data: ended("run-bob-1") });
    const run = await db.run.findFirstOrThrow({ where: { userId: BOB } });
    expect(run.endedAt).not.toBeNull();
    expect(run.valid).toBe(false);
    expect((await readLeaderboard(db)).fastest).toEqual([]);
  });

  it("un joueur peut se masquer du classement", async () => {
    await db.run.create({ data: { userId: ALICE, runId: "run-x", endedAt: new Date(), durationSec: 99_999, valid: true } });
    expect((await readLeaderboard(db)).most).toHaveLength(1);
    expect(await setHidden(db, ALICE, { hidden: true })).toBe(true);
    expect((await readLeaderboard(db)).most).toHaveLength(0);
    expect(await setHidden(db, ALICE, { hidden: "oui" })).toBe(false);
  });
});
