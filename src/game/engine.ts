import type Decimal from "break_infinity.js";
import { BUILDINGS, UPGRADES, Y2K_PATCH_COST, Y2K_SLOWDOWN, Y2K_TRIGGER_MONEY } from "@/content/era1";
import { D, ZERO } from "./decimal";
import {
  SCHEMA_VERSION,
  type BuildingId,
  type GameState,
  type ResourceId,
  type UpgradeDef,
  type UpgradeRequirement,
  type UpgradeTarget,
} from "./types";

/** Pure game logic: no React, no DOM, no clock. Every function returns a new state. */

export const MANUAL_BASE = D(1);

export type BuyMode = 1 | 10 | 100 | "max";

const BUILDING_BY_ID = new Map(BUILDINGS.map((b) => [b.id, b]));
const UPGRADE_BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));

export function createInitialState(): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    elapsedMs: 0,
    resources: { money: ZERO, data: ZERO },
    totalMoney: ZERO,
    buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])) as Record<BuildingId, number>,
    upgrades: {},
    event: { status: "pending" },
    effects: [],
  };
}

export function getBuilding(id: BuildingId) {
  const def = BUILDING_BY_ID.get(id);
  if (!def) throw new Error(`Unknown building ${id}`);
  return def;
}

export function getUpgrade(id: string): UpgradeDef | undefined {
  return UPGRADE_BY_ID.get(id);
}

/** Multiplier applied to a target (manual work or one building), from owned upgrades. */
export function multiplier(state: GameState, target: "manual" | BuildingId): number {
  let m = 1;
  for (const u of UPGRADES) {
    if (!state.upgrades[u.id]) continue;
    if (targetMatches(u.target, target)) m *= u.factor;
  }
  return m;
}

function targetMatches(upgradeTarget: UpgradeTarget, target: "manual" | BuildingId): boolean {
  if (upgradeTarget.kind === "all") return true;
  if (upgradeTarget.kind === "manual") return target === "manual";
  return target === upgradeTarget.building;
}

function slowdown(state: GameState): number {
  return state.effects.reduce((acc, e) => acc * e.factor, 1);
}

export function requirementMet(state: GameState, req: UpgradeRequirement): boolean {
  switch (req.kind) {
    case "none":
      return true;
    case "owned":
      return state.buildings[req.building] >= req.count;
    case "totalMoney":
      return state.totalMoney.gte(req.amount);
  }
}

/** Passive production per second, per resource (buildings only). */
export function productionPerSecond(state: GameState): Record<ResourceId, Decimal> {
  const rates: Record<ResourceId, Decimal> = { money: ZERO, data: ZERO };
  const slow = slowdown(state);
  for (const def of BUILDINGS) {
    const owned = state.buildings[def.id];
    if (owned === 0) continue;
    const m = multiplier(state, def.id) * slow;
    rates[def.produces.resource] = rates[def.produces.resource].add(
      def.produces.perSecond.mul(owned).mul(m),
    );
  }
  return rates;
}

/** Gain of one manual action (the « taper du code » button). */
export function manualGain(state: GameState): Decimal {
  return MANUAL_BASE.mul(multiplier(state, "manual"));
}

/** Total price of buying `count` more buildings when `owned` are already owned. */
export function buildingCost(id: BuildingId, owned: number, count: number): Decimal {
  const def = getBuilding(id);
  if (count <= 0) return ZERO;
  const g = def.growth;
  const first = def.baseCost.mul(D(g).pow(owned));
  // Geometric series: first * (g^count - 1) / (g - 1)
  return first.mul(D(g).pow(count).sub(1)).div(g - 1);
}

/** Largest number of buildings affordable right now (0 if none). */
export function maxAffordable(state: GameState, id: BuildingId): number {
  const def = getBuilding(id);
  const money = state.resources[def.costResource];
  const owned = state.buildings[id];
  const first = def.baseCost.mul(D(def.growth).pow(owned));
  if (first.gt(money)) return 0;
  // Closed-form estimate, then exact correction against the real cost.
  const ratio = money.mul(def.growth - 1).div(first).add(1);
  let k = Math.max(0, Math.floor(ratio.log10() / Math.log10(def.growth)));
  while (k > 0 && buildingCost(id, owned, k).gt(money)) k--;
  while (buildingCost(id, owned, k + 1).lte(money)) k++;
  return k;
}

/** Cost and count for a buy mode, as the UI shows it. */
export function quote(state: GameState, id: BuildingId, mode: BuyMode) {
  const def = getBuilding(id);
  const count = mode === "max" ? maxAffordable(state, id) : mode;
  return {
    count,
    cost: buildingCost(id, state.buildings[id], count),
    resource: def.costResource,
  };
}

export function buyBuilding(state: GameState, id: BuildingId, mode: BuyMode): GameState {
  const def = getBuilding(id);
  const { count, cost } = quote(state, id, mode);
  if (count <= 0) return state;
  const money = state.resources[def.costResource];
  if (money.lt(cost)) return state;
  return {
    ...state,
    resources: { ...state.resources, [def.costResource]: money.sub(cost) },
    buildings: { ...state.buildings, [id]: state.buildings[id] + count },
  };
}

export function canBuyUpgrade(state: GameState, id: string): boolean {
  const def = getUpgrade(id);
  if (!def || state.upgrades[id]) return false;
  return requirementMet(state, def.requires) && state.resources[def.costResource].gte(def.cost);
}

export function buyUpgrade(state: GameState, id: string): GameState {
  if (!canBuyUpgrade(state, id)) return state;
  const def = getUpgrade(id)!;
  return {
    ...state,
    resources: { ...state.resources, [def.costResource]: state.resources[def.costResource].sub(def.cost) },
    upgrades: { ...state.upgrades, [id]: true },
  };
}

export function clickManual(state: GameState): GameState {
  const gain = manualGain(state);
  return {
    ...state,
    resources: { ...state.resources, money: state.resources.money.add(gain) },
    totalMoney: state.totalMoney.add(gain),
  };
}

/** Advances game time by `dtMs`: passive production, timed effects, event triggers. */
export function tick(state: GameState, dtMs: number): GameState {
  if (!(dtMs > 0)) return state;
  const seconds = dtMs / 1000;
  const rates = productionPerSecond(state);
  const gainMoney = rates.money.mul(seconds);
  const gainData = rates.data.mul(seconds);
  const next: GameState = {
    ...state,
    elapsedMs: state.elapsedMs + dtMs,
    resources: {
      money: state.resources.money.add(gainMoney),
      data: state.resources.data.add(gainData),
    },
    totalMoney: state.totalMoney.add(gainMoney),
    effects: state.effects.filter((e) => e.untilMs > state.elapsedMs + dtMs),
  };
  if (next.event.status === "pending" && next.totalMoney.gte(Y2K_TRIGGER_MONEY)) {
    return { ...next, event: { status: "open" } };
  }
  return next;
}

/** Answers the open event. Each choice has a visible cost. */
export function resolveY2K(state: GameState, choice: "patch" | "ignore"): GameState {
  if (state.event.status !== "open") return state;
  if (choice === "patch") {
    if (state.resources.money.lt(Y2K_PATCH_COST)) return state;
    return {
      ...state,
      resources: { ...state.resources, money: state.resources.money.sub(Y2K_PATCH_COST) },
      event: { status: "resolved", choice },
    };
  }
  return {
    ...state,
    effects: [
      ...state.effects,
      { kind: "slowdown", factor: Y2K_SLOWDOWN.factor, untilMs: state.elapsedMs + Y2K_SLOWDOWN.durationMs },
    ],
    event: { status: "resolved", choice },
  };
}
