/**
 * Algorithmes (renaissance II). Chaque algorithme s'achète avec des Algorithmes ; on n'en
 * équipe que deux au départ (un de plus à chaque renaissance II). La somme des coûts est
 * finie : tout se débloque par la progression normale, avant la fin du jeu.
 */

export type AlgorithmEffect =
  /** Building costs of every building are multiplied. */
  | { kind: "buildingCost"; factor: number }
  /** Production of every resource (or only one) is multiplied. */
  | { kind: "production"; resource?: "money" | "data" | "compute"; factor: number }
  /** Manual work is multiplied. */
  | { kind: "manual"; factor: number }
  /** Scripts buy this many times more units per second. */
  | { kind: "scriptRate"; factor: number }
  /** Slowdowns of events last this much (factor below 1 = shorter). */
  | { kind: "eventSlowdown"; factor: number }
  /** Money from event choices is multiplied. */
  | { kind: "eventGain"; factor: number }
  /** Model training takes this much game time. */
  | { kind: "trainingTime"; factor: number };

export interface AlgorithmDef {
  id: string;
  name: string;
  description: string;
  /** Algorithmes dépensés pour l'acheter. */
  cost: number;
  effect: AlgorithmEffect;
}

export const ALGORITHMS: AlgorithmDef[] = [
  { id: "costCompression", name: "Compression de coûts", description: "Tous les bâtiments coûtent 15 % de moins.", cost: 1, effect: { kind: "buildingCost", factor: 0.85 } },
  { id: "diskCache", name: "Cache disque", description: "Toute la production ×1,1.", cost: 2, effect: { kind: "production", factor: 1.1 } },
  { id: "assistedClick", name: "Clic assisté", description: "Le travail manuel ×1,5.", cost: 3, effect: { kind: "manual", factor: 1.5 } },
  { id: "fastScripts", name: "Scripts rapides", description: "Les scripts d'achat achètent deux fois plus vite.", cost: 4, effect: { kind: "scriptRate", factor: 2 } },
  { id: "shortOutages", name: "Pannes courtes", description: "Les ralentissements d'événements durent deux fois moins.", cost: 5, effect: { kind: "eventSlowdown", factor: 0.5 } },
  { id: "loyalVisitors", name: "Visiteurs fidèles", description: "Les données rapportent 25 % de plus.", cost: 6, effect: { kind: "production", resource: "data", factor: 1.25 } },
  { id: "paperless", name: "Bureau sans papier", description: "Les choix d'événements rapportent deux fois plus d'argent.", cost: 8, effect: { kind: "eventGain", factor: 2 } },
  { id: "fastTraining", name: "Entraînement rapide", description: "Un entraînement de modèle dure deux fois moins longtemps.", cost: 10, effect: { kind: "trainingTime", factor: 0.5 } },
];

/** Algorithmes à équiper au départ, puis un de plus à chaque renaissance II. */
export const BASE_SLOTS = 2;
