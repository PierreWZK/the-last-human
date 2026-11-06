import type Decimal from "break_infinity.js";
import { BUILDINGS, MILESTONES, UPGRADES } from "@/content/era1";
import { BUILDINGS_ERA2, UPGRADES_ERA2 } from "@/content/era2";
import { ALGORITHMS, BASE_SLOTS, type AlgorithmEffect } from "@/content/algorithms";
import { BUILDINGS_ERA3, INTELLIGENCE_BONUS, MODEL_INTELLIGENCE_PER_SECOND, TRAINING, UPGRADES_ERA3 } from "@/content/era3";
import {
  EVENTS,
  EVENT_GAP_MS,
  HUMAN_SHARE,
  RANDOM_EVENTS,
  Y2K_ID,
  Y2K_TRIGGER_MONEY,
} from "@/content/events1";
import { KNOWLEDGE_BONUSES, KNOWLEDGE_DIVISOR } from "@/content/knowledge";
import { SNIPPET_MIN_CLICKS, SNIPPET_SECONDS } from "@/content/snippets";
import { ACHIEVEMENTS, ARCHIVES } from "@/content/milestones";
import {
  AUTO_TRAINING_AUTONOMY,
  BUILDINGS_ERA4,
  REPLICATION_PER_SECOND,
  UPGRADES_ERA4,
} from "@/content/era4";
import {
  AI_CORE_DIVISOR,
  CONTROL_BASE,
  DIRECTIVES,
  ERA5_REPLICATION,
  ERA5_START_MACHINES,
  MACHINES_GOAL,
  POLICIES,
  ROBOTS_FOR_RENAISSANCE4,
  type PolicyDef,
} from "@/content/era5";
import { CORES, GRID_CELLS, GRID_SIDE, NEIGHBOR_BONUS, NEURAL_CORE_DIVISOR, type CoreKind } from "@/content/neural";
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

export type BuyMode = number | "max";

/** Every building of every era. Eras only decide which ones the player can see. */
export const ALL_BUILDINGS = [...BUILDINGS, ...BUILDINGS_ERA2, ...BUILDINGS_ERA3, ...BUILDINGS_ERA4];

export const ALL_UPGRADES = [...UPGRADES, ...UPGRADES_ERA2, ...UPGRADES_ERA3, ...UPGRADES_ERA4];

export const RESOURCE_IDS: ResourceId[] = ["money", "data", "compute", "intelligence", "robots", "autonomy", "control"];

function emptyResources(): Record<ResourceId, Decimal> {
  return { money: ZERO, data: ZERO, compute: ZERO, intelligence: ZERO, robots: ZERO, autonomy: ZERO, control: ZERO };
}

const CORE_BY_ID = new Map(CORES.map((c) => [c.id, c]));

const ALGORITHM_BY_ID = new Map(ALGORITHMS.map((a) => [a.id, a]));

const BUILDING_BY_ID = new Map(ALL_BUILDINGS.map((b) => [b.id, b]));
const UPGRADE_BY_ID = new Map(ALL_UPGRADES.map((u) => [u.id, u]));

/** Buildings the player can see and buy in the current era. */
export function visibleBuildings(state: GameState) {
  if (state.era === 5) return []; // era V: nothing left to build
  return ALL_BUILDINGS.filter((b) => b.era <= state.era);
}

/** Upgrades the player can see and buy in the current era. */
export function visibleUpgrades(state: GameState) {
  if (state.era === 5) return [];
  return ALL_UPGRADES.filter((u) => u.era <= state.era);
}
const EVENT_BY_ID = new Map([...EVENTS, ...RANDOM_EVENTS].map((e) => [e.id, e]));

/** `seed` is only used for the random events; the game passes a fresh one per new game. */
export function createInitialState(seed = 1, runId = `seed-${seed}`): GameState {
  return {
    schemaVersion: SCHEMA_VERSION,
    elapsedMs: 0,
    resources: emptyResources(),
    totalMoney: ZERO,
    totalClicks: 0,
    buildings: Object.fromEntries(ALL_BUILDINGS.map((b) => [b.id, 0])) as Record<BuildingId, number>,
    upgrades: {},
    event: { status: "pending" },
    eventsResolved: 0,
    effects: [],
    rngSeed: seed,
    nextEventAtMs: EVENT_GAP_MS.min,
    archives: {},
    achievements: {},
    era: 1,
    scriptTarget: null,
    renaissances: 0,
    renaissances2: 0,
    algorithmPoints: 0,
    algorithms: {},
    equippedAlgorithms: [],
    models: [],
    training: null,
    renaissances3: 0,
    neuralCores: 0,
    neuralGrid: Array<string | null>(GRID_CELLS).fill(null),
    knowledgePoints: 0,
    knowledgeBonuses: {},
    renaissances4: 0,
    aiCores: 0,
    policies: {},
    directives: {},
    eraStartedMs: [0],
    journal: [],
    runId,
    endings: 0,
    endedAtMs: null,
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
  for (const u of ALL_UPGRADES) {
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
  for (const u of ALL_UPGRADES) {
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

/** Product of the equipped algorithms' factors of one kind (and of one resource, if given). */
export function algorithmFactor(state: GameState, kind: AlgorithmEffect["kind"], resource?: ResourceId): number {
  let m = 1;
  for (const id of state.equippedAlgorithms) {
    const e = ALGORITHM_BY_ID.get(id)?.effect;
    if (!e || e.kind !== kind) continue;
    if (e.kind === "production" && e.resource !== undefined && e.resource !== resource) continue;
    m *= e.factor;
  }
  return m;
}

/** Discount on every building cost, from the algorithms. */
export function costScale(state: GameState): number {
  return algorithmFactor(state, "buildingCost");
}

/** Number of algorithms that can be equipped: two, plus one per renaissance II. */
export function algorithmSlots(state: GameState): number {
  return BASE_SLOTS + state.renaissances2;
}

/** Intelligence multiplies all production: 1 + Intelligence × INTELLIGENCE_BONUS. */
export function intelligenceMultiplier(state: GameState): number {
  return 1 + state.resources.intelligence.toNumber() * INTELLIGENCE_BONUS;
}

/** Passive production per second, per resource (buildings only). */
export function productionPerSecond(state: GameState): Record<ResourceId, Decimal> {
  const rates = emptyResources();
  const factor =
    timedFactor(state) * achievementBonus(state) * knowledgeMultiplier(state, "all") * gridFactor(state, "production");
  for (const def of ALL_BUILDINGS) {
    const owned = state.buildings[def.id];
    if (owned === 0) continue;
    const resource = def.produces.resource;
    const m =
      multiplier(state, def.id) *
      synergyBonus(state, def.id) *
      milestoneMultiplier(owned) *
      factor *
      algorithmFactor(state, "production", resource);
    rates[resource] = rates[resource].add(def.produces.perSecond.mul(owned).mul(m));
  }
  // Trained models produce Intelligence, which multiplies everything else.
  const modelRate = state.models.reduce((acc, quality) => acc + quality * MODEL_INTELLIGENCE_PER_SECOND, 0);
  rates.intelligence = rates.intelligence.add(modelRate);
  const boost = intelligenceMultiplier(state);
  rates.money = rates.money.mul(boost);
  rates.data = rates.data.mul(boost);
  rates.compute = rates.compute.mul(boost);
  // Era IV: robots build robots, faster with Autonomie; the neural grid boosts both.
  // The grid boosts the factories only: boosting replication would multiply the exponent.
  rates.robots = rates.robots.mul(gridFactor(state, "robots")).add(state.resources.robots.mul(replicationRate(state)));
  rates.autonomy = rates.autonomy.mul(gridFactor(state, "autonomy"));
  // Era V: the player no longer produces. Machines replicate, Contrôle accumulates.
  if (state.era === 5) {
    rates.robots = state.resources.robots.mul(era5Replication(state));
    rates.control = D(controlRate(state));
  }
  return rates;
}

/**
 * Share of the work still done by a person, from 0 to 1: buildings weighted by how many they
 * own and their base output, each with its human share (cahier §4.7). Starts at 1.
 */
export function humanDependency(state: GameState): number {
  if (state.era === 5) return Math.max(0, 1 - automation(state));
  let total = 0;
  let human = 0;
  for (const def of ALL_BUILDINGS) {
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
    .mul(knowledgeMultiplier(state, "manual"))
    .mul(algorithmFactor(state, "manual"));
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
  return state.era === 1 && state.event.status !== "open" && UPGRADES.every((u) => state.upgrades[u.id]);
}

/** Script d'achat (ère II): choose the building the owned scripts buy. Null clears it. */
export function setScriptTarget(state: GameState, id: BuildingId | null): GameState {
  if (id === "buyScript") return state;
  if (id !== null && !BUILDING_BY_ID.has(id)) return state;
  return { ...state, scriptTarget: id };
}

/**
 * Renaissance: resets money, buildings and upgrades; keeps achievements, archives, Knowledge and
 * the Knowledge bonuses. Returns the same state if the requirements are not met.
 */
export function renaissance(state: GameState): GameState {
  if (!canRenaissance(state)) return state;
  return refreshUnlocks({
    ...state,
    resources: emptyResources(),
    totalMoney: ZERO,
    buildings: Object.fromEntries(ALL_BUILDINGS.map((b) => [b.id, 0])) as Record<BuildingId, number>,
    upgrades: {},
    effects: [],
    era: 2,
    eraStartedMs: [...state.eraStartedMs, state.elapsedMs],
    scriptTarget: null,
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

/** Total price of buying `count` more buildings when `owned` are already owned. `scale` is the algorithm discount. */
export function buildingCost(id: BuildingId, owned: number, count: number, scale = 1): Decimal {
  const def = getBuilding(id);
  if (count <= 0) return ZERO;
  const g = def.growth;
  const first = def.baseCost.mul(D(g).pow(owned));
  // Geometric series: first * (g^count - 1) / (g - 1)
  return first.mul(D(g).pow(count).sub(1)).div(g - 1).mul(scale);
}

/** Largest number of buildings affordable right now (0 if none). */
export function maxAffordable(state: GameState, id: BuildingId): number {
  const def = getBuilding(id);
  const money = state.resources[def.costResource];
  const owned = state.buildings[id];
  const scale = costScale(state);
  const first = def.baseCost.mul(D(def.growth).pow(owned)).mul(scale);
  if (first.gt(money)) return 0;
  // Closed-form estimate, then exact correction against the real cost.
  const ratio = money.mul(def.growth - 1).div(first).add(1);
  let k = Math.max(0, Math.floor(ratio.log10() / Math.log10(def.growth)));
  while (k > 0 && buildingCost(id, owned, k, scale).gt(money)) k--;
  while (buildingCost(id, owned, k + 1, scale).lte(money)) k++;
  return k;
}

/** Cost and count for a buy mode, as the UI shows it. */
export function quote(state: GameState, id: BuildingId, mode: BuyMode) {
  const def = getBuilding(id);
  const count = mode === "max" ? maxAffordable(state, id) : mode;
  return {
    count,
    cost: buildingCost(id, state.buildings[id], count, costScale(state)),
    resource: def.costResource,
  };
}

export function buyBuilding(state: GameState, id: BuildingId, mode: BuyMode): GameState {
  const def = getBuilding(id);
  const { count, cost } = quote(state, id, mode);
  if (count <= 0 || def.era > state.era) return state;
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
  if (!def || state.upgrades[id] || def.era > state.era) return false;
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

/** No human taps faster than this: the store drops extra clicks, the server refuses the save (anti-triche). */
export const MAX_CLICKS_PER_SECOND = 20;

export function clickManual(state: GameState): GameState {
  const gain = manualGain(state);
  return refreshUnlocks({
    ...state,
    resources: { ...state.resources, money: state.resources.money.add(gain) },
    totalMoney: state.totalMoney.add(gain),
    totalClicks: state.totalClicks + 1,
  });
}

/** What a bonus line typed without a mistake pays: a minute of production, never less than 30 clicks. */
export function snippetReward(state: GameState): Decimal {
  const fromProduction = productionPerSecond(state).money.mul(SNIPPET_SECONDS);
  const floor = manualGain(state).mul(SNIPPET_MIN_CLICKS);
  return fromProduction.gt(floor) ? fromProduction : floor;
}

export function completeSnippet(state: GameState): GameState {
  if (state.era === 5 || state.endedAtMs !== null) return state;
  const gain = snippetReward(state);
  return refreshUnlocks({
    ...state,
    resources: { ...state.resources, money: state.resources.money.add(gain) },
    totalMoney: state.totalMoney.add(gain),
  });
}

/** Advances game time by `dtMs`: production, timed effects, event schedule, unlocks. */
export function tick(state: GameState, dtMs: number): GameState {
  if (!(dtMs > 0) || state.endedAtMs !== null) return state;
  const seconds = dtMs / 1000;
  const rates = productionPerSecond(state);
  const gainMoney = rates.money.mul(seconds);
  const elapsedMs = state.elapsedMs + dtMs;
  let next: GameState = {
    ...state,
    elapsedMs,
    resources: Object.fromEntries(
      RESOURCE_IDS.map((r) => [r, state.resources[r].add(rates[r].mul(seconds))]),
    ) as Record<ResourceId, Decimal>,
    totalMoney: state.totalMoney.add(gainMoney),
    effects: state.effects.filter((e) => e.untilMs > elapsedMs),
  };

  // Scripts buy the chosen building as soon as it is affordable (era II).
  // Each script buys at most one unit per second of game time (decision of 2026-11-05).
  const secondsCrossed = Math.floor(elapsedMs / 1000) - Math.floor(state.elapsedMs / 1000);
  const scripts = next.buildings.buyScript;
  if (secondsCrossed > 0 && scripts > 0 && next.scriptTarget) {
    const perSecond = Math.floor(scripts * algorithmFactor(next, "scriptRate"));
    const units = Math.min(perSecond * secondsCrossed, maxAffordable(next, next.scriptTarget));
    if (units > 0) next = buyBuilding(next, next.scriptTarget, units);
  }

  // A training run that has finished adds a model.
  if (next.training && elapsedMs >= next.training.endsAtMs) next = finishTraining(next);
  // With enough Autonomie, a new run starts on its own (era IV: fewer player actions).
  if (!next.training && next.resources.autonomy.gte(AUTO_TRAINING_AUTONOMY)) next = startTraining(next);

  // The scripted event comes first; random events only after it has been answered.
  if (next.event.status === "pending" && next.totalMoney.gte(Y2K_TRIGGER_MONEY)) {
    next = { ...next, event: { status: "open", id: Y2K_ID } };
  } else if (next.era < 5 && next.event.status === "resolved" && elapsedMs >= next.nextEventAtMs) {
    next = openRandomEvent(next);
  }
  next = refreshUnlocks(next);
  return isEndReached(next) ? { ...next, endedAtMs: next.elapsedMs } : next;
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
  const firstAnswer = !next.journal.some((j) => j.startsWith(`${def.id}:`));
  return refreshUnlocks({
    ...next,
    journal: firstAnswer ? [...next.journal, `${def.id}:${choice.id}`] : next.journal,
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
      const gain = D(Math.max(10, perSecond * effect.seconds)).mul(algorithmFactor(state, "eventGain"));
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
          {
            kind: effect.effect,
            factor: effect.factor,
            untilMs:
              state.elapsedMs +
              effect.durationMs * (effect.effect === "slowdown" ? algorithmFactor(state, "eventSlowdown") : 1),
          },
        ],
      };
  }
}

/** Answers the scripted « bug de l'an 2000 » (kept as a named entry point for the scene). */
export function resolveY2K(state: GameState, choice: "patch" | "ignore"): GameState {
  return resolveEvent(state, choice);
}

/** Starts a training run (era III): one at a time, paid in Données and Calcul. */
export function startTraining(state: GameState): GameState {
  if (state.era < 3 || state.training) return state;
  const data = D(TRAINING.dataCost);
  const compute = D(TRAINING.computeCost);
  if (state.resources.data.lt(data) || state.resources.compute.lt(compute)) return state;
  const duration = TRAINING.durationMs * algorithmFactor(state, "trainingTime");
  return {
    ...state,
    resources: { ...state.resources, data: state.resources.data.sub(data), compute: state.resources.compute.sub(compute) },
    training: { endsAtMs: state.elapsedMs + duration },
  };
}

/** Ends the training run: the model's quality is drawn from the game seed. */
function finishTraining(state: GameState): GameState {
  const draw = nextRandom(state.rngSeed);
  const quality = TRAINING.qualityMin + draw.value * (TRAINING.qualityMax - TRAINING.qualityMin);
  return {
    ...state,
    rngSeed: draw.seed,
    models: [...state.models, Math.round(quality * 100) / 100],
    training: null,
  };
}

/** Renaissance II: needs every upgrade of era II. Opens era III. */
export function canRenaissance2(state: GameState): boolean {
  return state.era === 2 && state.event.status !== "open" && UPGRADES_ERA2.every((u) => state.upgrades[u.id]);
}

/** Algorithm points a renaissance II would grant now: floor(√gains totaux / 50), at least 1. */
export function algorithmPointGain(state: GameState): number {
  return Math.max(1, Math.floor(Math.sqrt(state.totalMoney.toNumber()) / 50));
}

/** Renaissance II: resets everything up to era II. Keeps Knowledge, algorithms and achievements. */
export function renaissance2(state: GameState): GameState {
  if (!canRenaissance2(state)) return state;
  return refreshUnlocks({
    ...state,
    resources: emptyResources(),
    totalMoney: ZERO,
    buildings: Object.fromEntries(ALL_BUILDINGS.map((b) => [b.id, 0])) as Record<BuildingId, number>,
    upgrades: {},
    effects: [],
    era: 3,
    eraStartedMs: [...state.eraStartedMs, state.elapsedMs],
    scriptTarget: null,
    models: [],
    training: null,
    renaissances: state.renaissances + 1,
    renaissances2: state.renaissances2 + 1,
    algorithmPoints: state.algorithmPoints + algorithmPointGain(state),
    nextEventAtMs: state.elapsedMs + EVENT_GAP_MS.min,
  });
}

/** Buys an algorithm with algorithm points. It is not equipped automatically. */
export function buyAlgorithm(state: GameState, id: string): GameState {
  const def = ALGORITHM_BY_ID.get(id);
  if (!def || state.algorithms[id] || state.algorithmPoints < def.cost) return state;
  return { ...state, algorithmPoints: state.algorithmPoints - def.cost, algorithms: { ...state.algorithms, [id]: true } };
}

/** Equips an owned algorithm, if a slot is free. */
export function equipAlgorithm(state: GameState, id: string): GameState {
  if (!state.algorithms[id] || state.equippedAlgorithms.includes(id)) return state;
  if (state.equippedAlgorithms.length >= algorithmSlots(state)) return state;
  return { ...state, equippedAlgorithms: [...state.equippedAlgorithms, id] };
}

export function unequipAlgorithm(state: GameState, id: string): GameState {
  if (!state.equippedAlgorithms.includes(id)) return state;
  return { ...state, equippedAlgorithms: state.equippedAlgorithms.filter((x) => x !== id) };
}

/** Achievements and archives are monotonic: once unlocked, they stay. */
export function refreshUnlocks(state: GameState): GameState {
  const view = { state, human: humanDependency(state) };
  const archives = { ...state.archives };
  let archivesChanged = false;
  for (const a of ARCHIVES) {
    if (!archives[a.id] && a.check(view)) {
      archives[a.id] = true;
      archivesChanged = true;
    }
  }
  // Achievements see the archives found in this same pass (« Mémoire vive », « Conservateur »).
  const after = { state: archivesChanged ? { ...state, archives } : state, human: view.human };
  const achievements = { ...state.achievements };
  let achievementsChanged = false;
  for (const a of ACHIEVEMENTS) {
    if (!achievements[a.id] && a.check(after)) {
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

/** Robots made per robot and per second: REPLICATION_PER_SECOND × (1 + log10(1 + Autonomie)). */
export function replicationRate(state: GameState): number {
  return REPLICATION_PER_SECOND * (1 + Math.log10(1 + state.resources.autonomy.toNumber()));
}

/** Renaissance III: needs every upgrade of era III. Opens era IV. */
export function canRenaissance3(state: GameState): boolean {
  return state.era === 3 && state.event.status !== "open" && UPGRADES_ERA3.every((u) => state.upgrades[u.id]);
}

/** Neural Cores a renaissance III would grant now: floor(√gains totaux / NEURAL_CORE_DIVISOR), at least 1. */
export function neuralCoreGain(state: GameState): number {
  return Math.max(1, Math.floor(Math.sqrt(state.totalMoney.toNumber()) / NEURAL_CORE_DIVISOR));
}

/** Renaissance III: resets eras I to III. Keeps Knowledge, algorithms, the neural grid and achievements. */
export function renaissance3(state: GameState): GameState {
  if (!canRenaissance3(state)) return state;
  return refreshUnlocks({
    ...state,
    resources: emptyResources(),
    totalMoney: ZERO,
    buildings: Object.fromEntries(ALL_BUILDINGS.map((b) => [b.id, 0])) as Record<BuildingId, number>,
    upgrades: {},
    effects: [],
    era: 4,
    eraStartedMs: [...state.eraStartedMs, state.elapsedMs],
    scriptTarget: null,
    models: [],
    training: null,
    renaissances: state.renaissances + 1,
    renaissances3: state.renaissances3 + 1,
    neuralCores: state.neuralCores + neuralCoreGain(state),
    nextEventAtMs: state.elapsedMs + EVENT_GAP_MS.min,
  });
}

/** Places a core in an empty cell, for one Neural Core. */
export function placeCore(state: GameState, cell: number, coreId: string): GameState {
  if (!CORE_BY_ID.has(coreId) || state.neuralCores < 1) return state;
  if (!Number.isInteger(cell) || cell < 0 || cell >= GRID_CELLS || state.neuralGrid[cell] !== null) return state;
  const neuralGrid = [...state.neuralGrid];
  neuralGrid[cell] = coreId;
  return { ...state, neuralCores: state.neuralCores - 1, neuralGrid };
}

/** Removes the core of a cell and gives its Neural Core back. */
export function removeCore(state: GameState, cell: number): GameState {
  if (!state.neuralGrid[cell]) return state;
  const neuralGrid = [...state.neuralGrid];
  neuralGrid[cell] = null;
  return { ...state, neuralCores: state.neuralCores + 1, neuralGrid };
}

/** Number of occupied cells next to `cell` (up, down, left, right). */
export function coreNeighbors(grid: (string | null)[], cell: number): number {
  const row = Math.floor(cell / GRID_SIDE);
  const col = cell % GRID_SIDE;
  let n = 0;
  if (row > 0 && grid[cell - GRID_SIDE]) n++;
  if (row < GRID_SIDE - 1 && grid[cell + GRID_SIDE]) n++;
  if (col > 0 && grid[cell - 1]) n++;
  if (col < GRID_SIDE - 1 && grid[cell + 1]) n++;
  return n;
}

/** Multiplier of one cell's core: its bonus, plus half of it per occupied neighbour. */
export function coreFactor(grid: (string | null)[], cell: number): number {
  const id = grid[cell];
  const def = id ? CORE_BY_ID.get(id) : undefined;
  if (!def) return 1;
  return 1 + (def.factor - 1) * (1 + NEIGHBOR_BONUS * coreNeighbors(grid, cell));
}

/** Product of the grid's cores of one kind. */
export function gridFactor(state: GameState, kind: CoreKind): number {
  let m = 1;
  state.neuralGrid.forEach((id, cell) => {
    if (id && CORE_BY_ID.get(id)?.kind === kind) m *= coreFactor(state.neuralGrid, cell);
  });
  return m;
}

// Renaissance IV and era V ----------------------------------------------

/** Product of the bought policies' factors of one kind. */
export function policyFactor(state: GameState, kind: PolicyDef["effect"]["kind"]): number {
  let m = 1;
  for (const p of POLICIES) if (state.policies[p.id] && p.effect.kind === kind) m *= p.effect.factor;
  return m;
}

/** Renaissance IV: every upgrade of era IV and enough robots. Opens era V. */
export function canRenaissance4(state: GameState): boolean {
  return (
    state.era === 4 &&
    state.event.status !== "open" &&
    UPGRADES_ERA4.every((u) => state.upgrades[u.id]) &&
    state.resources.robots.gte(ROBOTS_FOR_RENAISSANCE4)
  );
}

/** AI Cores a renaissance IV would grant now: floor(√gains totaux / AI_CORE_DIVISOR), at least 1. */
export function aiCoreGain(state: GameState): number {
  return Math.max(1, Math.floor(Math.sqrt(state.totalMoney.toNumber()) / AI_CORE_DIVISOR));
}

/** Renaissance IV: resets eras I to IV. Keeps every meta-progress; era V starts with a fleet of machines. */
export function renaissance4(state: GameState): GameState {
  if (!canRenaissance4(state)) return state;
  return refreshUnlocks({
    ...state,
    resources: { ...emptyResources(), robots: D(ERA5_START_MACHINES) },
    totalMoney: ZERO,
    buildings: Object.fromEntries(ALL_BUILDINGS.map((b) => [b.id, 0])) as Record<BuildingId, number>,
    upgrades: {},
    effects: [],
    era: 5,
    eraStartedMs: [...state.eraStartedMs, state.elapsedMs],
    scriptTarget: null,
    models: [],
    training: null,
    directives: {},
    renaissances: state.renaissances + 1,
    renaissances4: state.renaissances4 + 1,
    aiCores: state.aiCores + aiCoreGain(state),
    nextEventAtMs: state.elapsedMs + EVENT_GAP_MS.min,
  });
}

export function buyPolicy(state: GameState, id: string): GameState {
  const def = POLICIES.find((p) => p.id === id);
  if (!def || state.policies[id] || state.aiCores < def.cost || state.endedAtMs !== null) return state;
  return { ...state, aiCores: state.aiCores - def.cost, policies: { ...state.policies, [id]: true } };
}

/** Share of the work given to the machines by the directives, 0 to 1. */
export function automation(state: GameState): number {
  const sum = DIRECTIVES.reduce((acc, d) => (state.directives[d.id] ? acc + d.automation : acc), 0);
  return Math.min(1, Math.round(sum * 1e9) / 1e9); // 0.15 + 0.15 + … must land exactly on 1
}

/** Machines made per machine and per second in era V. */
export function era5Replication(state: GameState): number {
  const fromDirectives = DIRECTIVES.reduce((acc, d) => (state.directives[d.id] ? acc * d.replication : acc), 1);
  return ERA5_REPLICATION * fromDirectives * policyFactor(state, "replication");
}

/** Contrôle per second in era V: grows with the machines, on a log scale. */
export function controlRate(state: GameState): number {
  const log = Math.log10(1 + state.resources.robots.toNumber());
  return CONTROL_BASE * log * log * policyFactor(state, "control");
}

export function directiveCost(state: GameState, id: string): number {
  const def = DIRECTIVES.find((d) => d.id === id);
  return def ? def.cost * policyFactor(state, "directiveCost") : Infinity;
}

/** The next directive to give (they come in order), or null once they are all given. */
export function nextDirective(state: GameState) {
  return DIRECTIVES.find((d) => !state.directives[d.id]) ?? null;
}

export function giveDirective(state: GameState, id: string): GameState {
  const next = nextDirective(state);
  if (state.era !== 5 || state.endedAtMs !== null || !next || next.id !== id) return state;
  const cost = D(directiveCost(state, id));
  if (state.resources.control.lt(cost)) return state;
  const after = refreshUnlocks({
    ...state,
    resources: { ...state.resources, control: state.resources.control.sub(cost) },
    directives: { ...state.directives, [id]: true },
  });
  return isEndReached(after) ? { ...after, endedAtMs: after.elapsedMs } : after;
}

/** The end (cahier §4, ère V): 7 billion machines, full automation, no human work left. */
export function isEndReached(state: GameState): boolean {
  return (
    state.era === 5 &&
    state.endedAtMs === null &&
    state.resources.robots.gte(MACHINES_GOAL) &&
    automation(state) >= 1 &&
    humanDependency(state) === 0
  );
}

/**
 * « Nouvelle humanité » : a new game from zero, without any bonus (not a New Game+). Only the
 * Human Archives (memories, no bonus) and the count of endings carry over.
 */
export function newHumanity(state: GameState, seed: number, runId: string): GameState {
  if (state.endedAtMs === null) return state;
  return { ...createInitialState(seed, runId), archives: { ...state.archives }, endings: state.endings + 1 };
}
