import { BUILDINGS, UPGRADES } from "@/content/era1";
import { ACHIEVEMENTS, ARCHIVES, EVENTS, EVENT_GAP_MS, RANDOM_EVENTS } from "@/content/events1";
import { KNOWLEDGE_BONUSES } from "@/content/knowledge";
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
  totalClicks: number;
  buildings: Record<string, number>;
  upgrades: Record<string, true>;
  event: GameState["event"];
  eventsResolved: number;
  effects: GameState["effects"];
  rngSeed: number;
  nextEventAtMs: number;
  archives: Record<string, true>;
  achievements: Record<string, true>;
  renaissances: number;
  knowledgePoints: number;
  knowledgeBonuses: Record<string, true>;
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
      totalClicks: state.totalClicks,
      buildings: { ...state.buildings },
      upgrades: { ...state.upgrades },
      event: state.event,
      eventsResolved: state.eventsResolved,
      effects: state.effects,
      rngSeed: state.rngSeed,
      nextEventAtMs: state.nextEventAtMs,
      archives: { ...state.archives },
      achievements: { ...state.achievements },
      renaissances: state.renaissances,
      knowledgePoints: state.knowledgePoints,
      knowledgeBonuses: { ...state.knowledgeBonuses },
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

/**
 * Migrations: one step per version, applied in order. Step n turns a version-n state into
 * version n+1. Keep old steps forever: a player may come back after months.
 */
const MIGRATIONS: Array<(raw: Record<string, unknown>) => Record<string, unknown>> = [
  // v1 -> v2: scripted event gets its id; random events, archives, achievements appear.
  (raw) => {
    const event = raw.event;
    let migratedEvent: Record<string, unknown> = { status: "pending" };
    if (isRecord(event) && event.status === "open") migratedEvent = { status: "open", id: "y2k" };
    if (isRecord(event) && event.status === "resolved") {
      migratedEvent = { status: "resolved", id: "y2k", choice: event.choice };
    }
    const elapsed = typeof raw.elapsedMs === "number" ? raw.elapsedMs : 0;
    return {
      ...raw,
      event: migratedEvent,
      totalClicks: 0,
      eventsResolved: migratedEvent.status === "resolved" ? 1 : 0,
      rngSeed: 1,
      nextEventAtMs: elapsed + EVENT_GAP_MS.min,
      archives: {},
      achievements: {},
    };
  },
  // v2 -> v3: renaissance I adds the Knowledge counters, all empty at first.
  (raw) => ({ ...raw, renaissances: 0, knowledgePoints: 0, knowledgeBonuses: {} }),
];

function migrate(raw: Record<string, unknown>, fromVersion: number): LoadResult {
  let current = raw;
  for (let v = fromVersion; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v - 1];
    if (!step) return { ok: false, reason: `Pas de migration depuis la version ${v}` };
    current = step(current);
  }
  return validate(current);
}

const EVENT_IDS = new Set([...EVENTS, ...RANDOM_EVENTS].map((e) => e.id));
const ARCHIVE_IDS = new Set(ARCHIVES.map((a) => a.id));
const ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((a) => a.id));
const KNOWLEDGE_IDS = new Set(KNOWLEDGE_BONUSES.map((b) => b.id));

function validate(raw: Record<string, unknown>): LoadResult {
  const { elapsedMs, resources, totalMoney, buildings, upgrades, event, effects } = raw;

  if (!isNonNegativeFinite(elapsedMs)) return bad("Temps de jeu invalide");
  if (!isRecord(resources)) return bad("Ressources invalides");
  const money = parseDecimal(resources.money);
  const data = parseDecimal(resources.data);
  if (!money || !data) return bad("Quantité de ressource invalide");
  const totalMoneyValue = parseDecimal(totalMoney);
  if (!totalMoneyValue) return bad("Total d'argent invalide");
  if (!isNonNegativeFinite(raw.totalClicks) || !Number.isSafeInteger(raw.totalClicks)) return bad("Clics invalides");
  if (!isNonNegativeFinite(raw.eventsResolved) || !Number.isSafeInteger(raw.eventsResolved)) {
    return bad("Compteur d'événements invalide");
  }
  if (!Number.isSafeInteger(raw.rngSeed)) return bad("Graine invalide");
  if (!isNonNegativeFinite(raw.nextEventAtMs)) return bad("Date du prochain événement invalide");

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
  if (event.status !== "pending" && !EVENT_IDS.has(event.id as string)) return bad("Événement inconnu");
  if (event.status === "resolved" && typeof event.choice !== "string") return bad("Choix d'événement invalide");

  if (!isRecord(raw.archives)) return bad("Archives invalides");
  for (const [key, value] of Object.entries(raw.archives)) {
    if (!ARCHIVE_IDS.has(key) || value !== true) return bad(`Archive inconnue : ${key}`);
  }
  if (!isRecord(raw.achievements)) return bad("Succès invalides");
  for (const [key, value] of Object.entries(raw.achievements)) {
    if (!ACHIEVEMENT_IDS.has(key) || value !== true) return bad(`Succès inconnu : ${key}`);
  }

  if (!isNonNegativeFinite(raw.renaissances) || !Number.isSafeInteger(raw.renaissances)) return bad("Renaissances invalides");
  if (!isNonNegativeFinite(raw.knowledgePoints) || !Number.isSafeInteger(raw.knowledgePoints)) {
    return bad("Points de Knowledge invalides");
  }
  if (!isRecord(raw.knowledgeBonuses)) return bad("Bonus de Knowledge invalides");
  for (const [key, value] of Object.entries(raw.knowledgeBonuses)) {
    if (!KNOWLEDGE_IDS.has(key) || value !== true) return bad(`Bonus de Knowledge inconnu : ${key}`);
  }

  if (!Array.isArray(effects)) return bad("Effets invalides");
  for (const e of effects) {
    const kindOk = isRecord(e) && (e.kind === "slowdown" || e.kind === "boost");
    if (!kindOk || typeof e.factor !== "number" || e.factor <= 0 || e.factor > 4) {
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
    totalClicks: raw.totalClicks as number,
    buildings: parsedBuildings,
    upgrades: parsedUpgrades,
    event: event as GameState["event"],
    eventsResolved: raw.eventsResolved as number,
    effects: effects as GameState["effects"],
    rngSeed: raw.rngSeed as number,
    nextEventAtMs: raw.nextEventAtMs as number,
    archives: raw.archives as Record<string, true>,
    achievements: raw.achievements as Record<string, true>,
    renaissances: raw.renaissances as number,
    knowledgePoints: raw.knowledgePoints as number,
    knowledgeBonuses: raw.knowledgeBonuses as Record<string, true>,
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
