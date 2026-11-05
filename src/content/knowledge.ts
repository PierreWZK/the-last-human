/**
 * Arbre de Knowledge (renaissance I). Chaque point de Knowledge achète un bonus permanent.
 * Valeurs de départ, à régler avec le simulateur avant la fin de la phase 4.
 */

/** Points gagnés = floor(sqrt(gains totaux de la partie) / KNOWLEDGE_DIVISOR), au moins 1. */
export const KNOWLEDGE_DIVISOR = 100;

export interface KnowledgeBonusDef {
  id: string;
  name: string;
  description: string;
  /** Points de Knowledge dépensés pour l'acheter. */
  cost: number;
  target: "manual" | "all";
  factor: number;
}

export const KNOWLEDGE_BONUSES: KnowledgeBonusDef[] = [
  { id: "touch-typing", name: "Frappe aveugle", description: "Le travail manuel rapporte deux fois plus.", cost: 1, target: "manual", factor: 2 },
  { id: "lean-team", name: "Équipe réduite", description: "Toute la production ×1,5.", cost: 2, target: "all", factor: 1.5 },
  { id: "dial-up", name: "Connexion ADSL", description: "Toute la production ×2.", cost: 4, target: "all", factor: 2 },
  { id: "keyboard-memory", name: "Mémoire musculaire", description: "Le travail manuel ×3.", cost: 6, target: "manual", factor: 3 },
];
