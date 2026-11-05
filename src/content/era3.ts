import { D } from "@/game/decimal";
import type { BuildingDef, UpgradeDef } from "@/game/types";

/**
 * Ère III — The AI Revolution (2020–2040). Valeurs de départ : le simulateur les réglera.
 * L'Intelligence vient des agents (bâtiments) et des modèles entraînés (une seule séance à la fois).
 */
export const BUILDINGS_ERA3: BuildingDef[] = [
  {
    id: "gpuServer",
    name: "Serveur de calcul GPU",
    description: "Des cartes graphiques qui font tourner les calculs de tout le monde.",
    baseCost: D(200000),
    costResource: "compute",
    produces: { resource: "compute", perSecond: D(2000) },
    growth: 1.15,
    era: 3,
  },
  {
    id: "dataLab",
    name: "Laboratoire de données",
    description: "Des jeux de données nettoyés à la main, puis avalés par des modèles.",
    baseCost: D(500000),
    costResource: "compute",
    produces: { resource: "data", perSecond: D(400) },
    growth: 1.15,
    era: 3,
  },
  {
    id: "agent",
    name: "Agent autonome",
    description: "Un programme qui lit, décide et apprend. Il produit de l'Intelligence sans relâche.",
    baseCost: D(2000000),
    costResource: "compute",
    produces: { resource: "intelligence", perSecond: D(0.5) },
    growth: 1.15,
    era: 3,
  },
];

/** Séance d'entraînement : durée de jeu et coût en Données et Calcul (avant les algorithmes). */
export const TRAINING = {
  durationMs: 120_000,
  dataCost: 2000,
  computeCost: 50000,
  /** Qualité d'un modèle : tirée au sort entre ces deux bornes. */
  qualityMin: 0.5,
  qualityMax: 2,
};

/** Intelligence produite par seconde et par modèle, multipliée par sa qualité. */
export const MODEL_INTELLIGENCE_PER_SECOND = 0.2;

/** Bonus de production par point d'Intelligence : toute la production × (1 + Intelligence × ce facteur). */
export const INTELLIGENCE_BONUS = 0.001;

const owned = (building: BuildingDef["id"], count: number) => ({ kind: "owned" as const, building, count });

/** Améliorations de l'ère III : toutes requises pour la renaissance III. */
export const UPGRADES_ERA3: UpgradeDef[] = [
  { id: "tensorCores", name: "Cœurs tensoriels", description: "Des circuits faits pour multiplier des matrices. Serveurs GPU ×2.", cost: D(1_000_000), costResource: "compute", target: { kind: "building", building: "gpuServer" }, factor: 2, requires: owned("gpuServer", 10), era: 3 },
  { id: "immersionCooling", name: "Refroidissement par immersion", description: "Les cartes tournent plus vite quand elles baignent. Serveurs GPU ×2.", cost: D(5_000_000), costResource: "compute", target: { kind: "building", building: "gpuServer" }, factor: 2, requires: owned("gpuServer", 25), era: 3 },
  { id: "syntheticData", name: "Données synthétiques", description: "Les modèles écrivent leurs propres exemples. Laboratoires ×2.", cost: D(200_000), costResource: "data", target: { kind: "building", building: "dataLab" }, factor: 2, requires: owned("dataLab", 10), era: 3 },
  { id: "toolUse", name: "Usage d'outils", description: "Chaque laboratoire ajoute 5 % aux agents autonomes.", cost: D(10_000_000), costResource: "compute", target: { kind: "synergy", building: "agent", source: "dataLab", perUnit: 0.05 }, factor: 1, requires: owned("agent", 5), era: 3 },
  { id: "selfReview", name: "Relecture automatique", description: "Les agents vérifient le travail des agents. Agents ×2.", cost: D(30_000_000), costResource: "compute", target: { kind: "building", building: "agent" }, factor: 2, requires: owned("agent", 10), era: 3 },
];
