import type Decimal from "break_infinity.js";
import { ZERO } from "./decimal";
import { RESOURCE_IDS, productionPerSecond, tick } from "./engine";
import type { GameState, ResourceId } from "./types";

/**
 * Progression hors ligne (cahier §6). Le temps d'absence est rejoué par pas de 10 s de jeu :
 * scripts, entraînements et événements avancent comme en jeu, plafonnés à 24 h.
 * Pur : la durée vient de l'appelant (horloge du serveur ou horloge locale protégée).
 */

export const OFFLINE_CAP_MS = 24 * 3600 * 1000;
export const OFFLINE_STEP_MS = 10_000;
/** En dessous, pas de récapitulatif : c'est un simple rechargement. */
export const OFFLINE_REPORT_MIN_MS = 60_000;

export interface OfflineReport {
  /** Absence réelle, avant plafond. */
  awayMs: number;
  /** Temps rejoué : l'absence, plafonnée à 24 h. */
  durationMs: number;
  capped: boolean;
  produced: Record<ResourceId, Decimal>;
  buildingsBought: number;
  modelsTrained: number;
  archivesFound: number;
  achievementsUnlocked: number;
}

/** Rejoue `awayMs` d'absence. Une durée nulle, négative ou invalide (horloge qui recule) ne rapporte rien. */
export function offlineProgress(state: GameState, awayMs: number): { state: GameState; report: OfflineReport } | null {
  if (!Number.isFinite(awayMs) || awayMs <= 0) return null;
  const durationMs = Math.min(awayMs, OFFLINE_CAP_MS);
  const produced = Object.fromEntries(RESOURCE_IDS.map((r) => [r, ZERO])) as Record<ResourceId, Decimal>;
  let s = state;
  for (let done = 0; done < durationMs; done += OFFLINE_STEP_MS) {
    const dt = Math.min(OFFLINE_STEP_MS, durationMs - done);
    const rates = productionPerSecond(s);
    for (const r of RESOURCE_IDS) produced[r] = produced[r].add(rates[r].mul(dt / 1000));
    s = tick(s, dt);
  }
  const count = (rec: Record<string, unknown>) => Object.keys(rec).length;
  const owned = (g: GameState) => Object.values(g.buildings).reduce((a, b) => a + b, 0);
  return {
    state: s,
    report: {
      awayMs,
      durationMs,
      capped: awayMs > OFFLINE_CAP_MS,
      produced,
      buildingsBought: Math.max(0, owned(s) - owned(state)),
      modelsTrained: Math.max(0, s.models.length - state.models.length),
      archivesFound: count(s.archives) - count(state.archives),
      achievementsUnlocked: count(s.achievements) - count(state.achievements),
    },
  };
}

/**
 * Absence d'un invité, mesurée sur l'horloge locale (en UTC, donc insensible aux fuseaux et aux
 * changements d'heure). Une date de sauvegarde dans le futur veut dire que l'horloge a reculé : rien.
 */
export function guestAwayMs(savedAtMs: number | null, nowMs: number): number {
  if (savedAtMs === null || !Number.isFinite(savedAtMs)) return 0;
  return Math.max(0, nowMs - savedAtMs);
}
