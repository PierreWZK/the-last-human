import type Decimal from "break_infinity.js";
import { BUILDINGS, MILESTONES, UPGRADES } from "@/content/era1";
import {
  ACHIEVEMENTS,
  ARCHIVES,
  EVENTS,
  EVENT_GAP_MS,
  HUMAN_SHARE,
  RANDOM_EVENTS,
  Y2K_ID,
  Y2K_TRIGGER_MONEY,
  type AchievementInput,
} from "@/content/events1";
import { KNOWLEDGE_BONUSES, KNOWLEDGE_DIVISOR } from "@/content/knowledge";
import { D, ZERO } from "./decimal";
import { nextRandom } from "./rng";
import {
  SCHEMA_VERSION,
  type BuildingId,
  type EventDef,
  type EventEffect,
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
const EVENT_BY_ID = new Map([...EVENTS, ...RANDOM_EVENTS].map((e) => [e.id, e]));

/** `seed` is only used for the random events; the game passes a fresh one per new game. */
export function createInitialState(seed = 1): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    elapsedMs: 0,
    resources: { money: ZERO, data: ZERO },
    totalMoney: ZERO,
    totalClicks: 0,
    buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])) as Record<BuildingId, number>,
    upgrades: {},
    event: { status: "pending" },
    eventsResolved: 0,
    effects: [],
    rngSeed: seed,
    nextEventAtMs: EVENT_GAP_MS.min,
    archives: {},
    achievements: {},
    renaissances: 0,
    knowledgePoints: 0,
    knowledgeBonuses: {},
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

export function getEvent(id: string): EventDef | undefined {
  return EVENT_BY_ID.get(id);
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
  if (upgradeTarget.kind === "synergy") return false; // handled by synergyBonus
  return target === upgradeTarget.building;
}

/** Bonus from synergies: 1 + Σ perUnit × owned source, for upgrades owned by the player. */
export function synergyBonus(state: GameState, building: BuildingId): number {
  let bonus = 1;
  for (const u of UPGRADES) {
    if (!state.upgrades[u.id] || u.target.kind !== "synergy") continue;
    if (u.target.building !== building) continue;
    bonus += u.target.perUnit * state.buildings[u.target.source];
  }
  return bonus;
}

/** Each milestone reached doubles the production of that building (10, 25, 50, 100…). */
export function milestoneMultiplier(owned: number): number {
  let m = 1;
  for (const threshold of MILESTONES) if (owned >= threshold) m *= 2;
  return m;
}

/** The next threshold to reach, or null once the last one is passed. */
export function nextMilestone(owned: number): number | null {
  return MILESTONES.find((threshold) => owned < threshold) ?? null;
}

/** Each unlocked achievement adds its bonus (1 %) to all production and manual work. */
export function achievementBonus(state: GameState): number {
  let bonus = 1;
  for (const a of ACHIEVEMENTS) if (state.achievements[a.id]) bonus += a.bonus;
  return bonus;
}

/** Product of the timed effects running now (slowdown < 1, boost > 1). */
export function timedFactor(state: GameState): number {
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
  const factor = timedFactor(state) * achievementBonus(state) * knowledgeMultiplier(state, "all");
  for (const def of BUILDINGS) {
    const owned = state.buildings[def.id];
    if (owned === 0) continue;
    const m = multiplier(state, def.id) * synergyBonus(state, def.id) * milestoneMultiplier(owned) * factor;
    rates[def.produces.resource] = rates[def.produces.resource].add(def.produces.perSecond.mul(owned).mul(m));
  }
  return rates;
}

/**
 * Share of the work still done by a person, from 0 to 1: buildings weighted by how many they
 * own and their base output, each with its human share (cahier §4.7). Starts at 1.
 */
export function humanDependency(state: GameState): number {
  let total = 0;
  let human = 0;
  for (const def of BUILDINGS) {
    const weight = state.buildings[def.id] * def.produces.perSecond.toNumber();
    total += weight;
    human += weight * HUMAN_SHARE[def.id];
  }
  return total === 0 ? 1 : human / total;
}

/** Gain of one manual action (the « taper du code » button). */
export function manualGain(state: GameState): Decimal {
  return MANUAL_BASE.mul(multiplier(state, "manual"))
    .mul(achievementBonus(state))
    .mul(knowledgeMultiplier(state, "manual"));
}

/** Product of the Knowledge bonuses bought for `target` (manual work, or all production). */
export function knowledgeMultiplier(state: GameState, target: "manual" | "all"): number {
  let m = 1;
  for (const b of KNOWLEDGE_BONUSES) if (state.knowledgeBonuses[b.id] && b.target === target) m *= b.factor;
  return m;
}

/** Points of Knowledge a renaissance would grant now. */
export function knowledgeGain(state: GameState): number {
  return Math.max(1, Math.floor(Math.sqrt(state.totalMoney.toNumber()) / KNOWLEDGE_DIVISOR));
}

/** The first renaissance needs every upgrade of era I. */
export function canRenaissance(state: GameState): boolean {
  return state.event.status !== "open" && UPGRADES.every((u) => state.upgrades[u.id]);
}

/**
 * Renaissance: resets money, buildings and upgrades; keeps achievements, archives, Knowledge and
 * the Knowledge bonuses. Returns the same state if the requirements are not met.
 */
export function renaissance(state: GameState): GameState {
  if (!canRenaissance(state)) return state;
  return refreshUnlocks({
    ...state,
    resources: { money: ZERO, data: ZERO },
    totalMoney: ZERO,
    buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])) as Record<BuildingId, number>,
    upgrades: {},
    effects: [],
    renaissances: state.renaissances + 1,
    knowledgePoints: state.knowledgePoints + knowledgeGain(state),
    nextEventAtMs: state.elapsedMs + EVENT_GAP_MS.min,
  });
}

/** Buys one Knowledge bonus with its point cost. Nothing changes if it is owned or unaffordable. */
export function buyKnowledgeBonus(state: GameState, id: string): GameState {
  const def = KNOWLEDGE_BONUSES.find((b) => b.id === id);
  if (!def || state.knowledgeBonuses[id] || state.knowledgePoints < def.cost) return state;
  return {
    ...state,
    knowledgePoints: state.knowledgePoints - def.cost,
    knowledgeBonuses: { ...state.knowledgeBonuses, [id]: true },
  };
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
  return refreshUnlocks({
    ...state,
    resources: { ...state.resources, [def.costResource]: money.sub(cost) },
    buildings: { ...state.buildings, [id]: state.buildings[id] + count },
  });
}

export function canBuyUpgrade(state: GameState, id: string): boolean {
  const def = getUpgrade(id);
  if (!def || state.upgrades[id]) return false;
  return requirementMet(state, def.requires) && state.resources[def.costResource].gte(def.cost);
}

export function buyUpgrade(state: GameState, id: string): GameState {
  if (!canBuyUpgrade(state, id)) return state;
  const def = getUpgrade(id)!;
  return refreshUnlocks({
    ...state,
    resources: { ...state.resources, [def.costResource]: state.resources[def.costResource].sub(def.cost) },
    upgrades: { ...state.upgrades, [id]: true },
  });
}

export function clickManual(state: GameState): GameState {
  const gain = manualGain(state);
  return refreshUnlocks({
    ...state,
    resources: { ...state.resources, money: state.resources.money.add(gain) },
    totalMoney: state.totalMoney.add(gain),
    totalClicks: state.totalClicks + 1,
  });
}

/** Advances game time by `dtMs`: production, timed effects, event schedule, unlocks. */
export function tick(state: GameState, dtMs: number): GameState {
  if (!(dtMs > 0)) return state;
  const seconds = dtMs / 1000;
  const rates = productionPerSecond(state);
  const gainMoney = rates.money.mul(seconds);
  const gainData = rates.data.mul(seconds);
  const elapsedMs = state.elapsedMs + dtMs;
  let next: GameState = {
    ...state,
    elapsedMs,
    resources: {
      money: state.resources.money.add(gainMoney),
      data: state.resources.data.add(gainData),
    },
    totalMoney: state.totalMoney.add(gainMoney),
    effects: state.effects.filter((e) => e.untilMs > elapsedMs),
  };

  // The scripted event comes first; random events only after it has been answered.
  if (next.event.status === "pending" && next.totalMoney.gte(Y2K_TRIGGER_MONEY)) {
    next = { ...next, event: { status: "open", id: Y2K_ID } };
  } else if (next.event.status === "resolved" && elapsedMs >= next.nextEventAtMs) {
    next = openRandomEvent(next);
  }
  return refreshUnlocks(next);
}

function openRandomEvent(state: GameState): GameState {
  const draw = nextRandom(state.rngSeed);
  const index = Math.floor(draw.value * RANDOM_EVENTS.length);
  const gap = nextRandom(draw.seed);
  const gapMs = EVENT_GAP_MS.min + gap.value * (EVENT_GAP_MS.max - EVENT_GAP_MS.min);
  return {
    ...state,
    rngSeed: gap.seed,
    nextEventAtMs: state.elapsedMs + gapMs,
    event: { status: "open", id: RANDOM_EVENTS[index].id },
  };
}

/** Answers the open event with one of its choices. Costs are checked before anything changes. */
export function resolveEvent(state: GameState, choiceId: string): GameState {
  if (state.event.status !== "open") return state;
  const def = getEvent(state.event.id);
  const choice = def?.choices.find((c) => c.id === choiceId);
  if (!def || !choice) return state;

  const spend = choice.effects.reduce((acc, e) => (e.kind === "spend" ? acc.add(e.amount) : acc), ZERO);
  if (state.resources.money.lt(spend)) return state;

  let next: GameState = {
    ...state,
    resources: { ...state.resources, money: state.resources.money.sub(spend) },
  };
  for (const effect of choice.effects) next = applyEffect(next, effect);
  return refreshUnlocks({
    ...next,
    event: { status: "resolved", id: def.id, choice: choice.id },
    eventsResolved: next.eventsResolved + 1,
    nextEventAtMs: Math.max(next.nextEventAtMs, next.elapsedMs + EVENT_GAP_MS.min),
  });
}

function applyEffect(state: GameState, effect: EventEffect): GameState {
  switch (effect.kind) {
    case "spend":
      return state; // already deducted above
    case "gain": {
      const perSecond = productionPerSecond(state).money.toNumber();
      const gain = D(Math.max(10, perSecond * effect.seconds));
      return {
        ...state,
        resources: { ...state.resources, money: state.resources.money.add(gain) },
        totalMoney: state.totalMoney.add(gain),
      };
    }
    case "timed":
      return {
        ...state,
        effects: [
          ...state.effects,
          { kind: effect.effect, factor: effect.factor, untilMs: state.elapsedMs + effect.durationMs },
        ],
      };
  }
}

/** Answers the scripted « bug de l'an 2000 » (kept as a named entry point for the scene). */
export function resolveY2K(state: GameState, choice: "patch" | "ignore"): GameState {
  return resolveEvent(state, choice);
}

/** Achievements and archives are monotonic: once unlocked, they stay. */
export function refreshUnlocks(state: GameState): GameState {
  const archives = { ...state.archives };
  const human = humanDependency(state);
  let archivesChanged = false;
  for (const a of ARCHIVES) {
    if (archives[a.id]) continue;
    const t = a.trigger;
    const open =
      t.kind === "human" ? human < t.below : state.event.status === "resolved" && state.event.id === t.id;
    if (open) {
      archives[a.id] = true;
      archivesChanged = true;
    }
  }

  const input: AchievementInput = {
    totalClicks: state.totalClicks,
    totalMoney: state.totalMoney.toNumber(),
    ownedBuildings: Object.values(state.buildings).reduce((a, b) => a + b, 0),
    maxBuilding: Math.max(0, ...Object.values(state.buildings)),
    eventsResolved: state.eventsResolved,
    upgrades: Object.keys(state.upgrades).length,
  };
  const achievements = { ...state.achievements };
  let achievementsChanged = false;
  for (const a of ACHIEVEMENTS) {
    if (!achievements[a.id] && a.check(input)) {
      achievements[a.id] = true;
      achievementsChanged = true;
    }
  }

  if (!archivesChanged && !achievementsChanged) return state;
  return {
    ...state,
    archives: archivesChanged ? archives : state.archives,
    achievements: achievementsChanged ? achievements : state.achievements,
  };
}
