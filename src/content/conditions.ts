import type { BuildingId, GameState } from "@/game/types";
import { BUILDINGS } from "./era1";
import { BUILDINGS_ERA2 } from "./era2";
import { BUILDINGS_ERA3 } from "./era3";
import { BUILDINGS_ERA4 } from "./era4";

/**
 * Conditions shared by achievements and Human Archives. Each one checks the game and carries the
 * sentence that tells the player how to get it, so the two can never disagree.
 * Pure data helpers: no engine import (the engine imports the milestones, not the reverse).
 */

/** What a condition looks at: the state, plus the Human Dependency computed once by the engine. */
export interface MilestoneView {
  state: GameState;
  /** Share of the work still done by humans, 0 to 1. */
  human: number;
}

export interface Condition {
  check: (v: MilestoneView) => boolean;
  /** How to unlock it, in French, shown to the player even while it is locked. */
  hint: string;
}

const NAMES = new Map<BuildingId, string>(
  [...BUILDINGS, ...BUILDINGS_ERA2, ...BUILDINGS_ERA3, ...BUILDINGS_ERA4].map((b) => [b.id, b.name]),
);
export const buildingName = (id: BuildingId) => NAMES.get(id) ?? id;

const fmt = (n: number) => n.toLocaleString("fr-FR");
const count = (rec: Record<string, unknown>) => Object.keys(rec).length;
const ERA_NAMES = ["", "I", "II", "III", "IV", "V"];

export const when = {
  owned: (id: BuildingId, n: number): Condition => ({
    check: ({ state }) => state.buildings[id] >= n,
    hint: n === 1 ? `Acheter un premier exemplaire de « ${buildingName(id)} ».` : `Posséder ${fmt(n)} × « ${buildingName(id)} » en même temps.`,
  }),
  clicks: (n: number): Condition => ({
    check: ({ state }) => state.totalClicks >= n,
    hint: `Taper du code à la main ${fmt(n)} fois (au total).`,
  }),
  money: (n: number): Condition => ({
    check: ({ state }) => state.totalMoney.gte(n),
    hint: `Gagner ${fmt(n)} d'argent au cours d'une même ère.`,
  }),
  events: (n: number): Condition => ({
    check: ({ state }) => state.eventsResolved >= n,
    hint: `Répondre à ${fmt(n)} événements.`,
  }),
  answered: (eventId: string, title: string, choice?: string, choiceLabel?: string): Condition => ({
    check: ({ state }) => state.journal.some((j) => (choice ? j === `${eventId}:${choice}` : j.startsWith(`${eventId}:`))),
    hint: choice ? `Répondre « ${choiceLabel} » à l'événement « ${title} ».` : `Répondre à l'événement « ${title} ».`,
  }),
  upgrades: (n: number): Condition => ({
    check: ({ state }) => count(state.upgrades) >= n,
    hint: `Posséder ${n} améliorations en même temps.`,
  }),
  era: (n: number): Condition => ({
    check: ({ state }) => state.era >= n,
    hint: `Atteindre l'ère ${ERA_NAMES[n]}.`,
  }),
  knowledge: (n: number, all = false): Condition => ({
    check: ({ state }) => count(state.knowledgeBonuses) >= n,
    hint: all ? "Acquérir tous les bonus de l'arbre de Knowledge." : "Acquérir un bonus de l'arbre de Knowledge.",
  }),
  algorithms: (n: number, all = false): Condition => ({
    check: ({ state }) => count(state.algorithms) >= n,
    hint: all ? "Acquérir tous les algorithmes." : n === 1 ? "Acquérir un premier algorithme." : `Acquérir ${n} algorithmes.`,
  }),
  equipped: (n: number): Condition => ({
    check: ({ state }) => state.equippedAlgorithms.length >= n,
    hint: `Équiper ${n} algorithmes en même temps.`,
  }),
  models: (n: number): Condition => ({
    check: ({ state }) => state.models.length >= n,
    hint: n === 1 ? "Entraîner un premier modèle." : `Avoir ${n} modèles entraînés en même temps.`,
  }),
  cores: (n: number): Condition => ({
    check: ({ state }) => state.neuralGrid.filter(Boolean).length >= n,
    hint: n >= 9 ? "Remplir les 9 cases de la grille neuronale." : n === 1 ? "Placer un premier core sur la grille neuronale." : `Placer ${n} cores sur la grille neuronale.`,
  }),
  robots: (n: number): Condition => ({
    check: ({ state }) => state.resources.robots.gte(n),
    hint: `Réunir ${fmt(n)} robots (ou machines).`,
  }),
  autonomy: (n: number): Condition => ({
    check: ({ state }) => state.resources.autonomy.gte(n),
    hint: `Atteindre ${fmt(n)} d'Autonomie.`,
  }),
  policies: (n: number, all = false): Condition => ({
    check: ({ state }) => count(state.policies) >= n,
    hint: all ? "Adopter toutes les politiques de civilisation." : "Adopter une première politique de civilisation.",
  }),
  directive: (id: string, name: string): Condition => ({
    check: ({ state }) => Boolean(state.directives[id]),
    hint: `Donner la directive « ${name} ».`,
  }),
  directives: (n: number): Condition => ({
    check: ({ state }) => count(state.directives) >= n,
    hint: n >= 6 ? "Donner toutes les directives de l'ère V." : `Donner ${n} directives.`,
  }),
  control: (n: number): Condition => ({
    check: ({ state }) => state.resources.control.gte(n),
    hint: `Accumuler ${fmt(n)} de Contrôle.`,
  }),
  human: (below: number): Condition => ({
    check: ({ human }) => human < below,
    hint:
      below <= 0.000001
        ? "Faire tomber la part du travail humain à 0 %."
        : `Faire tomber la part du travail humain sous ${fmt(Math.round(below * 1000) / 10)} %.`,
  }),
  archives: (n: number): Condition => ({
    check: ({ state }) => count(state.archives) >= n,
    hint: `Retrouver ${n} fragments des Human Archives.`,
  }),
  models_quality: (q: number): Condition => ({
    check: ({ state }) => state.models.some((m) => m >= q),
    hint: `Entraîner un modèle de qualité ${String(q).replace(".", ",")} ou plus.`,
  }),
  renaissances: (n: number): Condition => ({
    check: ({ state }) => state.renaissances >= n,
    hint: n === 1 ? "Faire une première renaissance." : `Faire ${n} renaissances au total.`,
  }),
  ended: (): Condition => ({
    check: ({ state }) => state.endedAtMs !== null || state.endings > 0,
    hint: "Terminer une humanité.",
  }),
  endings: (n: number): Condition => ({
    check: ({ state }) => state.endings + (state.endedAtMs !== null ? 1 : 0) >= n,
    hint: `Terminer ${n} humanités.`,
  }),
};
