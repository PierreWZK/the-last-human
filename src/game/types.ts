import type Decimal from "break_infinity.js";

/** Version of the save format. Bump it with a migration when GameState changes shape. */
export const SCHEMA_VERSION = 1;

export type ResourceId = "money" | "data";

export type BuildingId = "homePage" | "forum" | "shop" | "shareware" | "portal" | "rentedServer";

export interface BuildingDef {
  id: BuildingId;
  name: string;
  description: string;
  baseCost: Decimal;
  costResource: ResourceId;
  /** Production per second, per building owned. */
  produces: { resource: ResourceId; perSecond: Decimal };
  growth: number;
}

export type UpgradeTarget =
  | { kind: "manual" }
  | { kind: "building"; building: BuildingId }
  | { kind: "all" };

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  cost: Decimal;
  costResource: ResourceId;
  target: UpgradeTarget;
  factor: number;
  requires: UpgradeRequirement;
}

export type UpgradeRequirement =
  | { kind: "none" }
  | { kind: "owned"; building: BuildingId; count: number }
  | { kind: "totalMoney"; amount: Decimal };

export interface GameState {
  schemaVersion: number;
  /** Time played, in milliseconds (game time, not wall-clock). */
  elapsedMs: number;
  resources: Record<ResourceId, Decimal>;
  /** Lifetime money earned, used for unlock thresholds. */
  totalMoney: Decimal;
  buildings: Record<BuildingId, number>;
  upgrades: Record<string, true>;
  event: EventState;
  /** Timed effects, measured in game time. */
  effects: Array<{ kind: "slowdown"; factor: number; untilMs: number }>;
}

export type EventState =
  | { status: "pending" }
  | { status: "open" }
  | { status: "resolved"; choice: "patch" | "ignore" };
