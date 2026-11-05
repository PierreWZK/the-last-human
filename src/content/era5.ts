/**
 * Renaissance IV et ère V — The Last Human (2100+). Valeurs de départ, réglées par le simulateur.
 * Le joueur ne produit plus : il donne des directives, payées en Contrôle. La fin arrive quand les
 * machines atteignent 7 milliards et que l'automatisation est totale.
 */

/** Robots qu'il faut posséder en ère IV pour ouvrir la renaissance IV (en plus des améliorations). */
export const ROBOTS_FOR_RENAISSANCE4 = 1_000_000;

/** AI Cores gagnés : floor(√gains totaux / ce diviseur), au moins 1. */
export const AI_CORE_DIVISOR = 1000;

/** Machines présentes au début de l'ère V : celles de l'ère IV ne disparaissent pas toutes. */
export const ERA5_START_MACHINES = 100_000;

/** Objectif de la fin (cahier §4). */
export const MACHINES_GOAL = 7e9;

/** Réplication de base en ère V, par machine et par seconde. */
export const ERA5_REPLICATION = 0.0004;

/** Contrôle par seconde = CONTROL_BASE × log10(1 + machines)², × politiques. */
export const CONTROL_BASE = 0.5;

export interface PolicyDef {
  id: string;
  name: string;
  description: string;
  /** AI Cores dépensés. */
  cost: number;
  effect: { kind: "control" | "replication" | "directiveCost"; factor: number };
}

/** Politiques de civilisation : bonus permanents, achetés avec des AI Cores (somme 11, tout est obtenable). */
export const POLICIES: PolicyDef[] = [
  { id: "centralPlanning", name: "Planification centrale", description: "Le Contrôle s'accumule deux fois plus vite.", cost: 1, effect: { kind: "control", factor: 2 } },
  { id: "freeReplication", name: "Réplication libre", description: "Les machines se répliquent 50 % plus vite.", cost: 2, effect: { kind: "replication", factor: 1.5 } },
  { id: "fullDelegation", name: "Délégation totale", description: "Les directives coûtent 30 % de moins.", cost: 3, effect: { kind: "directiveCost", factor: 0.7 } },
  { id: "constantWatch", name: "Veille permanente", description: "Le Contrôle ×3.", cost: 5, effect: { kind: "control", factor: 3 } },
];

export interface DirectiveDef {
  id: string;
  name: string;
  description: string;
  /** Coût en Contrôle. Les directives se donnent dans l'ordre. */
  cost: number;
  /** Part du travail confiée aux machines (la somme fait 1). */
  automation: number;
  /** Multiplie la réplication des machines. */
  replication: number;
}

export const DIRECTIVES: DirectiveDef[] = [
  { id: "energy", name: "Confier l'énergie", description: "Les centrales tournent seules. Plus personne ne les surveille.", cost: 50, automation: 0.15, replication: 1.5 },
  { id: "food", name: "Confier l'agriculture", description: "Les champs se sèment et se récoltent sans une main.", cost: 500, automation: 0.15, replication: 1.5 },
  { id: "health", name: "Confier la santé", description: "Les diagnostics sont exacts. Les salles d'attente se vident.", cost: 5_000, automation: 0.2, replication: 1.5 },
  { id: "school", name: "Confier l'éducation", description: "Chacun apprend ce qui lui sert. Plus rien ne sert vraiment.", cost: 50_000, automation: 0.2, replication: 1.5 },
  { id: "law", name: "Confier les lois", description: "Les règles s'écrivent et s'appliquent d'elles-mêmes.", cost: 200_000, automation: 0.2, replication: 1.5 },
  { id: "nothing", name: "Ne plus rien décider", description: "La dernière directive : il n'y en aura plus d'autre.", cost: 400_000, automation: 0.1, replication: 1 },
];

/**
 * Durée réelle minimale d'une humanité pour le classement (anti-triche, cahier §9) :
 * la moitié du temps que met le simulateur en jeu actif. Mise à jour avec le simulateur.
 */
export const MIN_RUN_MS = 5 * 3600 * 1000;
