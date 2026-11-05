import type Decimal from "break_infinity.js";

/** Version of the save format. Bump it with a migration when GameState changes shape. */
export const SCHEMA_VERSION = 7;

export type Era = 1 | 2 | 3 | 4 | 5;

export type ResourceId = "money" | "data" | "compute" | "intelligence" | "robots" | "autonomy" | "control";

export type EraOneBuildingId = "homePage" | "forum" | "shop" | "shareware" | "portal" | "rentedServer";

export type EraTwoBuildingId = "dataCollector" | "buyScript" | "database" | "cloudCluster" | "datacenter" | "robotArm";

export type EraThreeBuildingId = "gpuServer" | "dataLab" | "agent";

export type EraFourBuildingId = "robotFactory" | "planner" | "gigafactory";

export type BuildingId = EraOneBuildingId | EraTwoBuildingId | EraThreeBuildingId | EraFourBuildingId;

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  baseCost: Decimal;
  costResource: ResourceId;
  /** Production per second, per building owned. A script produces nothing (perSecond 0). */
  produces: { resource: ResourceId; perSecond: Decimal };
  growth: number;
  /** The era that introduces the building. */
  era: Era;
}

export type UpgradeTarget =
  | { kind: "manual" }
  | { kind: "building"; building: BuildingId }
  | { kind: "all" }
  /** Each owned `source` adds `perUnit` (a fraction, e.g. 0.02 = 2 %) to `building`'s production. */
  | { kind: "synergy"; building: BuildingId; source: BuildingId; perUnit: number };

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: Decimal;
  costResource: ResourceId;
  target: UpgradeTarget;
  factor: number;
  requires: UpgradeRequirement;
  /** The era that introduces the upgrade. */
  era: Era;
}

export type UpgradeRequirement =
  | { kind: "none" }
  | { kind: "owned"; building: BuildingId; count: number }
  | { kind: "totalMoney"; amount: Decimal };

/** What a choice does when the player takes it. */
export type EventEffect =
  | { kind: "spend"; amount: Decimal }
  /** Money equal to `seconds` of current production (at least 10). */
  | { kind: "gain"; seconds: number }
  | { kind: "timed"; effect: "slowdown" | "boost"; factor: number; durationMs: number };

export interface EventChoice {
  id: string;
  label: string;
  effects: EventEffect[];
}

export interface EventDef {
  id: string;
  title: string;
  text: string;
  choices: EventChoice[];
}

export interface TimedEffect {
  kind: "slowdown" | "boost";
  factor: number;
  untilMs: number;
}

export type EventState =
  | { status: "pending" }
  | { status: "open"; id: string }
  | { status: "resolved"; id: string; choice: string };

export interface GameState {
  schemaVersion: number;
  /** Time played, in milliseconds (game time, not wall-clock). */
  elapsedMs: number;
  resources: Record<ResourceId, Decimal>;
  /** Lifetime money earned, used for unlock thresholds. */
  totalMoney: Decimal;
  /** Manual clicks, lifetime. */
  totalClicks: number;
  buildings: Record<BuildingId, number>;
  upgrades: Record<string, true>;
  /** Current event (the scripted « bug de l'an 2000 » or a random one). */
  event: EventState;
  /** Number of events answered, lifetime. */
  eventsResolved: number;
  /** Timed effects, measured in game time. */
  effects: TimedEffect[];
  /** Seed of the random generator. Stored so that a save replays the same draws. */
  rngSeed: number;
  /** Game time at which the next random event may open. */
  nextEventAtMs: number;
  /** Unlocked Human Archives (fragments). */
  archives: Record<string, true>;
  /** Unlocked achievements. */
  achievements: Record<string, true>;
  /** Current era: 1 until the first renaissance, then one more per renaissance (I, II, III). */
  era: Era;
  /** The building the owned scripts buy, as soon as it is affordable (era II). */
  scriptTarget: BuildingId | null;
  /** Renaissances completed, lifetime (I and II). */
  renaissances: number;
  /** Renaissances II completed: each one adds an algorithm slot. */
  renaissances2: number;
  /** Algorithm points, spent to buy algorithms. */
  algorithmPoints: number;
  /** Algorithms bought. */
  algorithms: Record<string, true>;
  /** Algorithms equipped, at most one per slot. */
  equippedAlgorithms: string[];
  /** Quality of each trained model (era III). */
  models: number[];
  /** Training run in progress: finishes at this game time, or null. */
  training: { endsAtMs: number } | null;
  /** Renaissances III completed. */
  renaissances3: number;
  /** Neural Cores not placed on the grid. */
  neuralCores: number;
  /** Neural grid, row by row: the core placed in each cell, or null. */
  neuralGrid: (string | null)[];
  /** Knowledge points available to spend on the Knowledge tree. */
  knowledgePoints: number;
  /** Knowledge bonuses bought. */
  knowledgeBonuses: Record<string, true>;
  /** Renaissances IV completed. */
  renaissances4: number;
  /** AI Cores not spent yet (renaissance IV). */
  aiCores: number;
  /** Civilisation policies bought with AI Cores. */
  policies: Record<string, true>;
  /** Directives given in era V, in order. */
  directives: Record<string, true>;
  /** Game time when each era began, index era − 1 (era I starts at 0). */
  eraStartedMs: number[];
  /** Notable choices for the final screen: first answer of each event, « eventId:choiceId ». */
  journal: string[];
  /** Identifies this humanity for the leaderboard; a new one per « Nouvelle humanité ». */
  runId: string;
  /** Humanities finished before this one (no bonus, only counted). */
  endings: number;
  /** Game time of the end; once set, the game is a frozen archive. */
  endedAtMs: number | null;
}
