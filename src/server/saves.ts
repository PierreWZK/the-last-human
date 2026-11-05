import { deserialize } from "@/game/save";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Sauvegarde cloud (cahier §8). Chaque écriture part d'une révision ; une révision dépassée est
 * refusée (409), jamais écrasée. Un seul appareil actif : les autres reçoivent 423.
 */

export const MAX_SAVE_BYTES = 256_000;
export const SNAPSHOTS_KEPT = 10;
const DEVICE_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

export type SaveResponse = { status: number; body: Record<string, unknown> };

const ok = (body: Record<string, unknown>): SaveResponse => ({ status: 200, body });
const fail = (status: number, error: string, extra: Record<string, unknown> = {}): SaveResponse => ({
  status,
  body: { error, ...extra },
});

export async function readSave(db: PrismaClient, userId: string): Promise<SaveResponse> {
  const save = await db.save.findUnique({ where: { userId } });
  if (!save) return ok({ revision: 0, data: null, activeDevice: null });
  return ok({ revision: save.revision, data: save.data, activeDevice: save.activeDevice });
}

/** Validates an untrusted PUT body, then writes it if it starts from the current revision. */
export async function writeSave(db: PrismaClient, userId: string, input: unknown): Promise<SaveResponse> {
  if (typeof input !== "object" || input === null) return fail(400, "Requête invalide");
  const { deviceId, baseRevision, data } = input as Record<string, unknown>;
  if (typeof deviceId !== "string" || !DEVICE_PATTERN.test(deviceId)) return fail(400, "Appareil invalide");
  if (!Number.isSafeInteger(baseRevision) || (baseRevision as number) < 0) return fail(400, "Révision invalide");
  if (typeof data !== "string") return fail(400, "Sauvegarde absente");
  if (Buffer.byteLength(data, "utf8") > MAX_SAVE_BYTES) return fail(413, "Sauvegarde trop grande");
  const parsed = deserialize(data);
  if (!parsed.ok) return fail(400, `Sauvegarde refusée : ${parsed.reason}`);
  // shortcut: no check of gains against server time yet; it comes with offline progress (phase 6).

  const base = baseRevision as number;
  return db.$transaction(async (tx) => {
    const current = await tx.save.findUnique({ where: { userId } });
    if (current?.activeDevice && current.activeDevice !== deviceId) {
      return fail(423, "La partie est reprise sur un autre appareil", { revision: current.revision });
    }
    const currentRevision = current?.revision ?? 0;
    if (currentRevision !== base) return fail(409, "Une sauvegarde plus récente existe", { revision: currentRevision });

    const revision = base + 1;
    if (current) {
      // The revision in the filter makes the write fail if another one landed in between.
      const updated = await tx.save.updateMany({
        where: { userId, revision: base },
        data: { revision, data, activeDevice: deviceId, lastSeenAt: new Date() },
      });
      if (updated.count === 0) return fail(409, "Une sauvegarde plus récente existe");
    } else {
      await tx.save.create({ data: { userId, revision, data, activeDevice: deviceId } });
    }
    await tx.saveSnapshot.create({ data: { userId, revision, data } });
    await tx.saveSnapshot.deleteMany({ where: { userId, revision: { lte: revision - SNAPSHOTS_KEPT } } });
    return ok({ revision });
  });
}

/** « Reprendre ici » : this device becomes the active one. */
export async function claimDevice(db: PrismaClient, userId: string, input: unknown): Promise<SaveResponse> {
  const deviceId = typeof input === "object" && input !== null ? (input as Record<string, unknown>).deviceId : undefined;
  if (typeof deviceId !== "string" || !DEVICE_PATTERN.test(deviceId)) return fail(400, "Appareil invalide");
  const updated = await db.save.updateMany({ where: { userId }, data: { activeDevice: deviceId, lastSeenAt: new Date() } });
  if (updated.count === 0) return ok({ revision: 0, data: null, activeDevice: deviceId });
  return readSave(db, userId);
}
