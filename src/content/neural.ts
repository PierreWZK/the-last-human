/**
 * Grille neuronale (renaissance III). Chaque core se pose dans une case d'une grille 3 × 3 et
 * coûte un Neural Core ; le retirer le rend. Un core donne son bonus, augmenté de moitié par
 * core voisin (haut, bas, gauche, droite) : la disposition compte.
 */

export type CoreKind = "production" | "robots" | "autonomy";

export interface CoreDef {
  id: string;
  name: string;
  description: string;
  kind: CoreKind;
  /** Multiplicateur de base, avant le voisinage. */
  factor: number;
}

export const CORES: CoreDef[] = [
  { id: "coreProduction", name: "Core de production", description: "Toute la production +10 %.", kind: "production", factor: 1.1 },
  { id: "coreRobots", name: "Core de réplication", description: "Robots fabriqués par les usines +20 %.", kind: "robots", factor: 1.2 },
  { id: "coreAutonomy", name: "Core d'autonomie", description: "Autonomie +25 %.", kind: "autonomy", factor: 1.25 },
];

export const GRID_SIDE = 3;
export const GRID_CELLS = GRID_SIDE * GRID_SIDE;

/** Chaque voisin occupé ajoute cette part au bonus d'un core. */
export const NEIGHBOR_BONUS = 0.5;

/** Neural Cores gagnés : floor(√gains totaux / ce diviseur), au moins 1. */
export const NEURAL_CORE_DIVISOR = 200;
