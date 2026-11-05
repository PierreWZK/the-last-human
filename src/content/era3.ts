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

/** Améliorations de l'ère III : à venir (pas encore de contenu validé). */
export const UPGRADES_ERA3: UpgradeDef[] = [];
