import type Decimal from "break_infinity.js";

/** Version of the save format. Bump it with a migration when GameState changes shape. */
export const SCHEMA_VERSION = 5;

export type ResourceId = "money" | "data" | "compute" | "intelligence";

export type EraOneBuildingId = "homePage" | "forum" | "shop" | "shareware" | "portal" | "rentedServer";

export type EraTwoBuildingId = "dataCollector" | "buyScript" | "database" | "cloudCluster" | "datacenter" | "robotArm";

export type EraThreeBuildingId = "gpuServer" | "dataLab" | "agent";

export type BuildingId = EraOneBuildingId | EraTwoBuildingId | EraThreeBuildingId;

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
  era: 1 | 2 | 3;
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
  era: 1 | 2 | 3;
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
  /** Current era: 1 until the first renaissance, 2 after it, 3 after the second. */
  era: 1 | 2 | 3;
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
  /** Knowledge points available to spend on the Knowledge tree. */
  knowledgePoints: number;
  /** Knowledge bonuses bought. */
  knowledgeBonuses: Record<string, true>;
}
