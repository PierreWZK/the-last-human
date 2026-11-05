import { BUILDINGS, UPGRADES } from "@/content/era1";
import { BUILDINGS_ERA2, UPGRADES_ERA2 } from "@/content/era2";
import { ALGORITHMS } from "@/content/algorithms";
import { BUILDINGS_ERA3, UPGRADES_ERA3 } from "@/content/era3";
import { BUILDINGS_ERA4, UPGRADES_ERA4 } from "@/content/era4";
import { CORES, GRID_CELLS } from "@/content/neural";
import { ACHIEVEMENTS, ARCHIVES, EVENTS, EVENT_GAP_MS, RANDOM_EVENTS } from "@/content/events1";
import { KNOWLEDGE_BONUSES } from "@/content/knowledge";
import { DIRECTIVES, POLICIES } from "@/content/era5";
import { D } from "./decimal";
import { RESOURCE_IDS, createInitialState } from "./engine";
import { SCHEMA_VERSION, type BuildingId, type Era, type GameState, type ResourceId } from "./types";

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
  resources: Record<ResourceId, string>;
  renaissances3: number;
  neuralCores: number;
  neuralGrid: (string | null)[];
renaissances2: number;
algorithmPoints: number;
algorithms: Record<string, true>;
equippedAlgorithms: string[];
models: number[];
training: { endsAtMs: number } | null;
  era: number;
  scriptTarget: string | null;
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
  renaissances4: number;
  aiCores: number;
  policies: Record<string, true>;
  directives: Record<string, true>;
  eraStartedMs: number[];
  journal: string[];
  runId: string;
  endings: number;
  endedAtMs: number | null;
}

interface Envelope {
  schemaVersion: number;
  savedAt: string;
  state: SerializedState;
}

export type LoadResult =
  /** `savedAtMs`: when the save was written (UTC), or null if the envelope has no valid date. */
  | { ok: true; state: GameState; savedAtMs?: number | null }
  | { ok: false; reason: string };

const DECIMAL_PATTERN = /^\d+(\.\d+)?(e[+-]?\d+)?$/;

export function serialize(state: GameState, now: Date = new Date()): string {
  const envelope: Envelope = {
    schemaVersion: SCHEMA_VERSION,
    savedAt: now.toISOString(),
    state: {
      schemaVersion: state.schemaVersion,
      elapsedMs: state.elapsedMs,
      resources: Object.fromEntries(RESOURCE_IDS.map((r) => [r, state.resources[r].toString()])) as Record<ResourceId, string>,
      renaissances3: state.renaissances3,
      neuralCores: state.neuralCores,
      neuralGrid: [...state.neuralGrid],
      era: state.era,
      scriptTarget: state.scriptTarget,
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
      renaissances2: state.renaissances2,
      algorithmPoints: state.algorithmPoints,
      algorithms: { ...state.algorithms },
      equippedAlgorithms: [...state.equippedAlgorithms],
      models: [...state.models],
      training: state.training,
      knowledgePoints: state.knowledgePoints,
      knowledgeBonuses: { ...state.knowledgeBonuses },
      renaissances4: state.renaissances4,
      aiCores: state.aiCores,
      policies: { ...state.policies },
      directives: { ...state.directives },
      eraStartedMs: [...state.eraStartedMs],
      journal: [...state.journal],
      runId: state.runId,
      endings: state.endings,
      endedAtMs: state.endedAtMs,
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
  const result = migrate(parsed.state, version);
  if (!result.ok) return result;
  const savedAtMs = typeof parsed.savedAt === "string" ? Date.parse(parsed.savedAt) : NaN;
  return { ...result, savedAtMs: Number.isFinite(savedAtMs) ? savedAtMs : null };
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
  // v3 -> v4: era II adds Calcul and the era. A save that already had a renaissance is in era II.
  (raw) => {
    const resources = isRecord(raw.resources) ? raw.resources : {};
    const renaissances = typeof raw.renaissances === "number" ? raw.renaissances : 0;
    return {
      ...raw,
      resources: { ...resources, compute: "0" },
      era: renaissances > 0 ? 2 : 1,
      scriptTarget: null,
    };
  },
  // v4 -> v5: era III adds Intelligence, algorithms, models and training.
  (raw) => ({
    ...raw,
    resources: { ...(isRecord(raw.resources) ? raw.resources : {}), intelligence: "0" },
    renaissances2: 0,
    algorithmPoints: 0,
    algorithms: {},
    equippedAlgorithms: [],
    models: [],
    training: null,
  }),
  // v5 -> v6: era IV adds Robots, Autonomie, renaissance III and the neural grid.
  (raw) => ({
    ...raw,
    resources: { ...(isRecord(raw.resources) ? raw.resources : {}), robots: "0", autonomy: "0" },
    renaissances3: 0,
    neuralCores: 0,
    neuralGrid: Array(GRID_CELLS).fill(null),
  }),
  // v6 -> v7: era V adds Contrôle, renaissance IV, policies, directives, the end and the run id.
  // Past eras have no recorded start: they are spread evenly on the game time already played.
  (raw) => {
    const era = typeof raw.era === "number" && raw.era >= 1 && raw.era <= 4 ? raw.era : 1;
    const elapsed = typeof raw.elapsedMs === "number" && raw.elapsedMs >= 0 ? raw.elapsedMs : 0;
    const seed = typeof raw.rngSeed === "number" ? raw.rngSeed : 1;
    return {
      ...raw,
      resources: { ...(isRecord(raw.resources) ? raw.resources : {}), control: "0" },
      renaissances4: 0,
      aiCores: 0,
      policies: {},
      directives: {},
      eraStartedMs: Array.from({ length: era }, (_, i) => Math.floor((elapsed * i) / era)),
      journal: [],
      runId: `seed-${seed}`,
      endings: 0,
      endedAtMs: null,
    };
  },
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
const BUILDING_IDS = new Set<string>([...BUILDINGS, ...BUILDINGS_ERA2, ...BUILDINGS_ERA3, ...BUILDINGS_ERA4].map((b) => b.id));
const ALGORITHM_IDS = new Set(ALGORITHMS.map((a) => a.id));
const CORE_IDS = new Set(CORES.map((c) => c.id));
const POLICY_IDS = new Set(POLICIES.map((p) => p.id));
const DIRECTIVE_IDS = new Set(DIRECTIVES.map((d) => d.id));
const RUN_ID_PATTERN = /^[A-Za-z0-9-]{4,64}$/;
const JOURNAL_PATTERN = /^[A-Za-z0-9-]{1,40}:[A-Za-z0-9-]{1,40}$/;

function validate(raw: Record<string, unknown>): LoadResult {
  const { elapsedMs, resources, totalMoney, buildings, upgrades, event, effects } = raw;

  if (!isNonNegativeFinite(elapsedMs)) return bad("Temps de jeu invalide");
  if (!isRecord(resources)) return bad("Ressources invalides");
  const parsedResources = {} as GameState["resources"];
  for (const r of RESOURCE_IDS) {
    const value = parseDecimal(resources[r]);
    if (!value) return bad("Quantité de ressource invalide");
    parsedResources[r] = value;
  }
  if (!isNonNegativeFinite(raw.renaissances3) || !Number.isSafeInteger(raw.renaissances3)) return bad("Renaissances III invalides");
  if (!isNonNegativeFinite(raw.neuralCores) || !Number.isSafeInteger(raw.neuralCores)) return bad("Neural Cores invalides");
  if (
    !Array.isArray(raw.neuralGrid) ||
    raw.neuralGrid.length !== GRID_CELLS ||
    raw.neuralGrid.some((id) => id !== null && !CORE_IDS.has(id as string))
  ) {
    return bad("Grille neuronale invalide");
  }
  if (!isNonNegativeFinite(raw.renaissances2) || !Number.isSafeInteger(raw.renaissances2)) return bad("Renaissances II invalides");
  if (!isNonNegativeFinite(raw.algorithmPoints) || !Number.isSafeInteger(raw.algorithmPoints)) return bad("Points d'algorithmes invalides");
  if (!isRecord(raw.algorithms)) return bad("Algorithmes invalides");
  for (const [key, value] of Object.entries(raw.algorithms)) {
    if (!ALGORITHM_IDS.has(key) || value !== true) return bad(`Algorithme inconnu : ${key}`);
  }
  if (!Array.isArray(raw.equippedAlgorithms) || raw.equippedAlgorithms.some((id) => !ALGORITHM_IDS.has(id as string) || !isRecord(raw.algorithms) || raw.algorithms[id as string] !== true)) {
    return bad("Algorithmes équipés invalides");
  }
  if (!Array.isArray(raw.models) || raw.models.some((q) => typeof q !== "number" || !Number.isFinite(q) || q <= 0)) {
    return bad("Modèles invalides");
  }
  if (raw.training !== null && !(isRecord(raw.training) && isNonNegativeFinite(raw.training.endsAtMs))) {
    return bad("Entraînement invalide");
  }
  if (raw.era !== 1 && raw.era !== 2 && raw.era !== 3 && raw.era !== 4 && raw.era !== 5) return bad("Ère invalide");
  if (!isNonNegativeFinite(raw.renaissances4) || !Number.isSafeInteger(raw.renaissances4)) return bad("Renaissances IV invalides");
  if (!isNonNegativeFinite(raw.aiCores) || !Number.isSafeInteger(raw.aiCores)) return bad("AI Cores invalides");
  if (!isNonNegativeFinite(raw.endings) || !Number.isSafeInteger(raw.endings)) return bad("Fins invalides");
  for (const [field, ids, label] of [["policies", POLICY_IDS, "Politique"], ["directives", DIRECTIVE_IDS, "Directive"]] as const) {
    const value = raw[field];
    if (!isRecord(value)) return bad(`${label}s invalides`);
    for (const [key, v] of Object.entries(value)) if (!ids.has(key) || v !== true) return bad(`${label} inconnue : ${key}`);
  }
  if (
    !Array.isArray(raw.eraStartedMs) ||
    raw.eraStartedMs.length < 1 ||
    raw.eraStartedMs.length > (raw.era as number) || // an era set directly (import, test) may lack its date

    raw.eraStartedMs.some((t) => !isNonNegativeFinite(t))
  ) {
    return bad("Dates des ères invalides");
  }
  if (!Array.isArray(raw.journal) || raw.journal.length > 50 || raw.journal.some((j) => typeof j !== "string" || !JOURNAL_PATTERN.test(j))) {
    return bad("Journal invalide");
  }
  if (typeof raw.runId !== "string" || !RUN_ID_PATTERN.test(raw.runId)) return bad("Identifiant de partie invalide");
  if (raw.endedAtMs !== null && !isNonNegativeFinite(raw.endedAtMs)) return bad("Date de fin invalide");
  if (raw.scriptTarget !== null && !BUILDING_IDS.has(raw.scriptTarget as string)) {
    return bad("Cible de script inconnue");
  }
  const totalMoneyValue = parseDecimal(totalMoney);
  if (!totalMoneyValue) return bad("Total d'argent invalide");
  if (!isNonNegativeFinite(raw.totalClicks) || !Number.isSafeInteger(raw.totalClicks)) return bad("Clics invalides");
  if (!isNonNegativeFinite(raw.eventsResolved) || !Number.isSafeInteger(raw.eventsResolved)) {
    return bad("Compteur d'événements invalide");
  }
  if (!Number.isSafeInteger(raw.rngSeed)) return bad("Graine invalide");
  if (!isNonNegativeFinite(raw.nextEventAtMs)) return bad("Date du prochain événement invalide");

  if (!isRecord(buildings)) return bad("Bâtiments invalides");
  const buildingIds = BUILDING_IDS;
  const parsedBuildings = {} as Record<BuildingId, number>;
  for (const def of [...BUILDINGS, ...BUILDINGS_ERA2, ...BUILDINGS_ERA3, ...BUILDINGS_ERA4]) {
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
  const upgradeIds = new Set([...UPGRADES, ...UPGRADES_ERA2, ...UPGRADES_ERA3, ...UPGRADES_ERA4].map((u) => u.id));
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
    resources: parsedResources,
    renaissances3: raw.renaissances3 as number,
    neuralCores: raw.neuralCores as number,
    neuralGrid: raw.neuralGrid as (string | null)[],
    renaissances2: raw.renaissances2 as number,
    algorithmPoints: raw.algorithmPoints as number,
    algorithms: raw.algorithms as Record<string, true>,
    equippedAlgorithms: raw.equippedAlgorithms as string[],
    models: raw.models as number[],
    training: raw.training as { endsAtMs: number } | null,
    era: raw.era as Era,
    scriptTarget: raw.scriptTarget as BuildingId | null,
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
    renaissances4: raw.renaissances4 as number,
    aiCores: raw.aiCores as number,
    policies: raw.policies as Record<string, true>,
    directives: raw.directives as Record<string, true>,
    eraStartedMs: raw.eraStartedMs as number[],
    journal: raw.journal as string[],
    runId: raw.runId as string,
    endings: raw.endings as number,
    endedAtMs: raw.endedAtMs as number | null,
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
