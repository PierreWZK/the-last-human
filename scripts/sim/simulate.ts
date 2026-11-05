/**
 * Balance simulator. Plays era I with a simple, reasonable player and measures how often
 * something new happens (an unlock). Targets come from CAHIER-DES-CHARGES.md §2 and §5:
 *  - first hour: median gap between unlocks between 2 and 5 minutes;
 *  - active play: never more than 30 minutes without something new.
 * Run with `npm run sim`. Exits with code 1 when an active-play target is missed.
 */
import { BUILDINGS, MILESTONES, UPGRADES, Y2K_PATCH_COST } from "@/content/era1";
import {
  buyBuilding,
  buyUpgrade,
  canBuyUpgrade,
  clickManual,
  requirementMet as requirementsMet,
  createInitialState,
  multiplier,
  productionPerSecond,
  quote,
  resolveY2K,
  synergyBonus,
  tick,
} from "@/game/engine";
import { formatNumber } from "@/game/decimal";
import type { BuildingId, GameState } from "@/game/types";

export interface Unlock {
  minute: number;
  label: string;
}

export interface SimOptions {
  hours: number;
  /** Manual clicks per second of game time. */
  clicksPerSecond: number;
}

export interface SimResult {
  unlocks: Unlock[];
  finalMoney: string;
  finalRate: string;
  /** Game minute when every upgrade of era I is bought, or null if never. */
  eraDoneMinute: number | null;
  buildingsOwned: Record<BuildingId, number>;
}

const MAX_ACTIONS_PER_SECOND = 40;

export function simulate({ hours, clicksPerSecond }: SimOptions): SimResult {
  let state: GameState = createInitialState();
  const unlocks: Unlock[] = [];
  let clickCarry = 0;
  let eraDoneMinute: number | null = null;

  const totalSeconds = Math.round(hours * 3600);
  for (let second = 1; second <= totalSeconds; second++) {
    clickCarry += clicksPerSecond;
    while (clickCarry >= 1) {
      state = clickManual(state);
      clickCarry -= 1;
    }
    state = tick(state, 1000);

    const minute = second / 60;
    for (let action = 0; action < MAX_ACTIONS_PER_SECOND; action++) {
      const next = decide(state);
      if (next === state) break;
      const label = describeChange(state, next);
      if (label) unlocks.push({ minute, label });
      state = next;
    }
    if (eraDoneMinute === null && UPGRADES.every((u) => state.upgrades[u.id])) eraDoneMinute = minute;
  }

  const rates = productionPerSecond(state);
  return {
    unlocks,
    finalMoney: formatNumber(state.resources.money),
    finalRate: formatNumber(rates.money),
    eraDoneMinute,
    buildingsOwned: { ...state.buildings },
  };
}

/**
 * One action, by a simple rule: answer the event, else buy the cheapest affordable upgrade,
 * else buy the building with the shortest payback (cost ÷ real gain of one unit).
 */
function decide(state: GameState): GameState {
  if (state.event.status === "open") {
    const answer = state.resources.money.gte(Y2K_PATCH_COST) ? "patch" : "ignore";
    return resolveY2K(state, answer);
  }

  const affordableUpgrade = UPGRADES.filter((u) => canBuyUpgrade(state, u.id)).sort((a, b) =>
    a.cost.lt(b.cost) ? -1 : a.cost.gt(b.cost) ? 1 : 0,
  )[0];
  if (affordableUpgrade) return buyUpgrade(state, affordableUpgrade.id);

  // Save for the cheapest upgrade whose requirement is already met: a building is bought only
  // if the player can still afford that upgrade afterwards (a real player saves, too).
  const savingFor = UPGRADES.filter((u) => !state.upgrades[u.id] && requirementsMet(state, u.requires)).sort(
    (a, b) => (a.cost.lt(b.cost) ? -1 : a.cost.gt(b.cost) ? 1 : 0),
  )[0];

  let best: { id: BuildingId; payback: number } | null = null;
  for (const def of BUILDINGS) {
    const q = quote(state, def.id, 1);
    if (q.count === 0 || state.resources[def.costResource].lt(q.cost)) continue;
    if (savingFor && savingFor.costResource === def.costResource) {
      if (state.resources[def.costResource].sub(q.cost).lt(savingFor.cost)) continue;
    }
    const unitGain = def.produces.perSecond.toNumber() * multiplier(state, def.id) * synergyBonus(state, def.id);
    const payback = q.cost.toNumber() / Math.max(unitGain, 1e-9);
    if (!best || payback < best.payback) best = { id: def.id, payback };
  }
  if (best) return buyBuilding(state, best.id, 1);
  return state;
}

function describeChange(before: GameState, after: GameState): string | null {
  for (const def of BUILDINGS) {
    if (before.buildings[def.id] === 0 && after.buildings[def.id] > 0) return `Nouveau bâtiment : ${def.name}`;
  }
  // Milestones are novelties too (they double a building's output and carry a fragment).
  for (const def of BUILDINGS) {
    const crossed = MILESTONES.find((t) => before.buildings[def.id] < t && after.buildings[def.id] >= t);
    if (crossed !== undefined) return `Palier : ${crossed} × ${def.name}`;
  }
  for (const u of UPGRADES) {
    if (!before.upgrades[u.id] && after.upgrades[u.id]) return `Amélioration : ${u.name}`;
  }
  if (before.event.status !== "resolved" && after.event.status === "resolved") {
    return after.event.choice === "patch" ? "Événement : corrigé" : "Événement : ignoré";
  }
  return null;
}

function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function gapsOf(minutes: number[]): number[] {
  const gaps: number[] = [];
  let previous = 0;
  for (const m of minutes) {
    gaps.push(m - previous);
    previous = m;
  }
  return gaps;
}

function report(label: string, result: SimResult, hours: number): boolean {
  const { unlocks } = result;
  const gaps = gapsOf(unlocks.map((u) => u.minute));
  const firstHourGaps = gapsOf(unlocks.filter((u) => u.minute <= 60).map((u) => u.minute));
  const medianFirstHour = median(firstHourGaps);
  const maxGap = gaps.length ? Math.max(...gaps) : Infinity;

  console.log(`\n== ${label}, ${hours} h de jeu ==`);
  console.log(`Déblocages : ${unlocks.length}, premier à ${unlocks[0]?.minute.toFixed(1) ?? "—"} min`);
  console.log(`Écart médian, première heure : ${medianFirstHour.toFixed(1)} min (cible 2 à 5)`);
  console.log(`Plus long écart sans nouveauté : ${maxGap.toFixed(1)} min (cible 30 au plus)`);
  console.log(
    `Toutes les améliorations : ${result.eraDoneMinute === null ? "jamais" : `à ${(result.eraDoneMinute / 60).toFixed(1)} h`}`,
  );
  console.log(`Argent final : ${result.finalMoney} (+${result.finalRate} / s)`);
  console.log("Premiers déblocages :");
  for (const u of unlocks.slice(0, 12)) console.log(`  ${u.minute.toFixed(1).padStart(6)} min  ${u.label}`);

  const longest = unlocks
    .map((u, i) => ({ minute: u.minute, label: u.label, gap: gaps[i] }))
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);
  console.log("Plus longs écarts :");
  for (const g of longest) console.log(`  ${g.gap.toFixed(1).padStart(6)} min avant  ${g.label} (à ${g.minute.toFixed(1)} min)`);

  if (!label.startsWith("actif")) return true;
  const eraHours = result.eraDoneMinute === null ? Infinity : result.eraDoneMinute / 60;
  const ok =
    medianFirstHour >= 2 && medianFirstHour <= 5 && maxGap <= 30 && eraHours >= 6 && eraHours <= 10;
  console.log(ok ? "→ cibles atteintes" : "→ cibles NON atteintes (rythme 2–5 min, écart ≤ 30 min, ère I entre 6 et 10 h)");
  return ok;
}

function main() {
  const hours = Number(process.env.SIM_HOURS ?? 8);
  const active = simulate({ hours, clicksPerSecond: 1 });
  const idle = simulate({ hours, clicksPerSecond: 0 });
  const ok = report("actif, 1 clic/s", active, hours);
  report("sans clic (production seule)", idle, hours);
  if (!ok) process.exitCode = 1;
}

main();
