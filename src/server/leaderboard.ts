import { MIN_RUN_MS } from "@/content/era5";
import type { GameState } from "@/game/types";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Classement (cahier §9), réservé aux comptes. Une humanité commence à sa première sauvegarde
 * reçue et finit à la première sauvegarde terminée : les deux dates viennent du serveur.
 * Une durée sous MIN_RUN_MS est gardée (la fin a eu lieu) mais n'est pas classée.
 */

type Tx = Pick<PrismaClient, "run">;

export const LEADERBOARD_SIZE = 20;

/** Called inside the save transaction, after an accepted write. */
export async function recordRun(tx: Tx, userId: string, state: GameState, now = new Date()): Promise<void> {
  const run = await tx.run.upsert({
    where: { userId_runId: { userId, runId: state.runId } },
    create: { userId, runId: state.runId, startedAt: now },
    update: {},
  });
  if (state.endedAtMs === null || run.endedAt) return;
  const durationMs = now.getTime() - run.startedAt.getTime();
  await tx.run.update({
    where: { id: run.id },
    data: { endedAt: now, durationSec: Math.round(durationMs / 1000), valid: durationMs >= MIN_RUN_MS },
  });
}

export interface LeaderboardRow {
  name: string;
  value: number;
}

export async function readLeaderboard(db: PrismaClient): Promise<{ fastest: LeaderboardRow[]; most: LeaderboardRow[] }> {
  const visible = { valid: true, user: { hideFromLeaderboard: false } };
  const [fastest, most] = await Promise.all([
    db.run.groupBy({
      by: ["userId"],
      where: visible,
      _min: { durationSec: true },
      orderBy: { _min: { durationSec: "asc" } },
      take: LEADERBOARD_SIZE,
    }),
    db.run.groupBy({
      by: ["userId"],
      where: visible,
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: LEADERBOARD_SIZE,
    }),
  ]);
  const ids = [...new Set([...fastest, ...most].map((r) => r.userId))];
  const users = await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, displayUsername: true, username: true } });
  const nameOf = new Map(users.map((u) => [u.id, u.displayUsername ?? u.username ?? "?"]));
  return {
    fastest: fastest.map((r) => ({ name: nameOf.get(r.userId) ?? "?", value: r._min.durationSec ?? 0 })),
    most: most.map((r) => ({ name: nameOf.get(r.userId) ?? "?", value: r._count._all })),
  };
}

export async function readProfile(db: PrismaClient, userId: string) {
  const [user, best, count, first] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { hideFromLeaderboard: true } }),
    db.run.aggregate({ where: { userId, valid: true }, _min: { durationSec: true } }),
    db.run.count({ where: { userId, endedAt: { not: null } } }),
    db.run.findFirst({ where: { userId, endedAt: { not: null } }, orderBy: { endedAt: "asc" }, select: { endedAt: true } }),
  ]);
  return {
    hidden: user?.hideFromLeaderboard ?? false,
    bestSec: best._min.durationSec,
    endings: count,
    firstEndedAt: first?.endedAt?.toISOString() ?? null,
  };
}

export async function setHidden(db: PrismaClient, userId: string, input: unknown): Promise<boolean> {
  const hidden = typeof input === "object" && input !== null ? (input as Record<string, unknown>).hidden : undefined;
  if (typeof hidden !== "boolean") return false;
  await db.user.update({ where: { id: userId }, data: { hideFromLeaderboard: hidden } });
  return true;
}
