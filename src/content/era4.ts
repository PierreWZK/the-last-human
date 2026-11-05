import { D } from "@/game/decimal";
import type { BuildingDef, UpgradeDef } from "@/game/types";

/**
 * Ère IV — The Autonomous Age (2040–2100). Valeurs de départ : le simulateur les réglera.
 * Les Robots se multiplient d'eux-mêmes (auto-réplication) ; l'Autonomie accélère cette
 * réplication et lance seule les entraînements de modèles.
 */
export const BUILDINGS_ERA4: BuildingDef[] = [
  {
    id: "robotFactory",
    name: "Usine de robots",
    description: "Une chaîne qui assemble des robots. Personne ne la surveille.",
    baseCost: D(5_000_000),
    costResource: "compute",
    produces: { resource: "robots", perSecond: D(1) },
    growth: 1.15,
    era: 4,
  },
  {
    id: "planner",
    name: "Planificateur autonome",
    description: "Une IA qui décide seule de ce qu'il faut construire ensuite.",
    baseCost: D(20_000_000),
    costResource: "compute",
    produces: { resource: "autonomy", perSecond: D(0.1) },
    growth: 1.15,
    era: 4,
  },
  {
    id: "gigafactory",
    name: "Gigafactory",
    description: "Une usine grande comme une ville, qui fabrique d'autres usines.",
    baseCost: D(100_000_000),
    costResource: "compute",
    produces: { resource: "robots", perSecond: D(20) },
    growth: 1.15,
    era: 4,
  },
];

/**
 * Auto-réplication : chaque robot en fabrique ce nombre par seconde, × (1 + log10(1 + Autonomie)).
 * Le logarithme garde la croissance lisible : sinon elle explose en quelques heures.
 */
export const REPLICATION_PER_SECOND = 0.0001;

/** À partir de cette Autonomie, un entraînement de modèle démarre seul dès que possible. */
export const AUTO_TRAINING_AUTONOMY = 1;

const owned = (building: BuildingDef["id"], count: number) => ({ kind: "owned" as const, building, count });

export const UPGRADES_ERA4: UpgradeDef[] = [
  { id: "selfAssembly", name: "Auto-assemblage", description: "Les robots montent leurs propres pièces. Usines de robots ×2.", cost: D(10_000_000), costResource: "compute", target: { kind: "building", building: "robotFactory" }, factor: 2, requires: owned("robotFactory", 10), era: 4 },
  { id: "darkFactory", name: "Usine sans lumière", description: "Plus besoin d'éclairer : personne n'y entre. Gigafactories ×2.", cost: D(500_000_000), costResource: "compute", target: { kind: "building", building: "gigafactory" }, factor: 2, requires: owned("gigafactory", 10), era: 4 },
  { id: "chainOfCommand", name: "Chaîne de décision", description: "Chaque planificateur ajoute 5 % aux usines de robots.", cost: D(50_000_000), costResource: "compute", target: { kind: "synergy", building: "robotFactory", source: "planner", perUnit: 0.05 }, factor: 1, requires: owned("planner", 5), era: 4 },
];
