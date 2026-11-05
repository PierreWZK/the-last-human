import { BUILDINGS, UPGRADES } from "@/content/era1";
import { D } from "./decimal";
import { createInitialState } from "./engine";
import { SCHEMA_VERSION, type BuildingId, type GameState } from "./types";

/**
 * Save format. A save is an envelope with a schemaVersion; numbers are stored as strings
 * so that break_infinity values survive JSON. Anything that does not validate is refused,
 * never silently replaced.
 */

export const SAVE_KEY = "the-last-human:save";
export const BACKUP_KEY = "the-last-human:save-backup";

interface SerializedState {
  schemaVersion: number;
  elapsedMs: number;
  resources: { money: string; data: string };
  totalMoney: string;
  buildings: Record<string, number>;
  upgrades: Record<string, true>;
  event: GameState["event"];
  effects: GameState["effects"];
}

interface Envelope {
  schemaVersion: number;
  savedAt: string;
  state: SerializedState;
}

export type LoadResult =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };

const DECIMAL_PATTERN = /^\d+(\.\d+)?(e[+-]?\d+)?$/;

export function serialize(state: GameState, now: Date = new Date()): string {
  const envelope: Envelope = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: now.toISOString(),
    state: {
      schemaVersion: state.schemaVersion,
      elapsedMs: state.elapsedMs,
      resources: { money: state.resources.money.toString(), data: state.resources.data.toString() },
      totalMoney: state.totalMoney.toString(),
      buildings: { ...state.buildings },
      upgrades: { ...state.upgrades },
      event: state.event,
      effects: state.effects,
    },
  };
  return JSON.stringify(envelope);
}

export function deserialize(raw: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "JSON invalide" };
  }
  if (!isRecord(parsed)) return { ok: false, reason: "Enveloppe absente" };
  const version = parsed.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: "Version de sauvegarde inconnue" };
  }
  if (version > SCHEMA_VERSION) {
    return { ok: false, reason: "Sauvegarde créée par une version plus récente du jeu" };
  }
  if (!isRecord(parsed.state)) return { ok: false, reason: "État absent" };
  return migrate(parsed.state, version);
}

/** Migrations: one step per version, applied in order. V1 is the first version. */
const MIGRATIONS: Array<(raw: Record<string, unknown>) => Record<string, unknown>> = [];

function migrate(raw: Record<string, unknown>, fromVersion: number): LoadResult {
  let current = raw;
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v - 1];
    if (!step) return { ok: false, reason: `Pas de migration depuis la version ${v}` };
    current = step(current);
  }
  return validate(current);
}

function validate(raw: Record<string, unknown>): LoadResult {
  const { elapsedMs, resources, totalMoney, buildings, upgrades, event, effects } = raw;

  if (!isNonNegativeFinite(elapsedMs)) return bad("Temps de jeu invalide");
  if (!isRecord(resources)) return bad("Ressources invalides");
  const money = parseDecimal(resources.money);
  const data = parseDecimal(resources.data);
  if (!money || !data) return bad("Quantité de ressource invalide");
  const totalMoneyValue = parseDecimal(totalMoney);
  if (!totalMoneyValue) return bad("Total d'argent invalide");

  if (!isRecord(buildings)) return bad("Bâtiments invalides");
  const buildingIds = new Set<string>(BUILDINGS.map((b) => b.id));
  const parsedBuildings = {} as Record<BuildingId, number>;
  for (const def of BUILDINGS) {
    const count = buildings[def.id];
    if (count === undefined) {
      parsedBuildings[def.id] = 0;
      continue;
    }
    if (!Number.isSafeInteger(count) || (count as number) < 0) return bad(`Nombre invalide pour ${def.id}`);
    parsedBuildings[def.id] = count as number;
  }
  for (const key of Object.keys(buildings)) {
    if (!buildingIds.has(key)) return bad(`Bâtiment inconnu : ${key}`);
  }

  if (!isRecord(upgrades)) return bad("Améliorations invalides");
  const upgradeIds = new Set(UPGRADES.map((u) => u.id));
  const parsedUpgrades: Record<string, true> = {};
  for (const [key, value] of Object.entries(upgrades)) {
    if (!upgradeIds.has(key) || value !== true) return bad(`Amélioration inconnue : ${key}`);
    parsedUpgrades[key] = true;
  }

  if (!isRecord(event) || !["pending", "open", "resolved"].includes(event.status as string)) {
    return bad("Événement invalide");
  }
  if (event.status === "resolved" && event.choice !== "patch" && event.choice !== "ignore") {
    return bad("Choix d'événement invalide");
  }

  if (!Array.isArray(effects)) return bad("Effets invalides");
  for (const e of effects) {
    if (!isRecord(e) || e.kind !== "slowdown" || typeof e.factor !== "number" || e.factor <= 0 || e.factor > 1) {
      return bad("Effet invalide");
    }
    if (!isNonNegativeFinite(e.untilMs)) return bad("Durée d'effet invalide");
  }

  const base = createInitialState();
  const state: GameState = {
    ...base,
    elapsedMs: elapsedMs as number,
    resources: { money, data },
    totalMoney: totalMoneyValue,
    buildings: parsedBuildings,
    upgrades: parsedUpgrades,
    event: event as GameState["event"],
    effects: effects as GameState["effects"],
  };
  return { ok: true, state };
}

function bad(reason: string): LoadResult {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function parseDecimal(value: unknown) {
  if (typeof value !== "string" || !DECIMAL_PATTERN.test(value)) return null;
  return D(value);
}
