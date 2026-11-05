import { D } from "@/game/decimal";
import type { BuildingId, EventDef } from "@/game/types";

/**
 * Ère I — events, human archives, achievements. Data only: the engine reads these.
 * Every choice lists its effects; the first affordable choice is the default for the simulator.
 */

/** The scripted event: opens once the player has earned this much in total. */
export const Y2K_ID = "y2k";
export const Y2K_TRIGGER_MONEY = D(5000);

export const EVENTS: EventDef[] = [
  {
    id: Y2K_ID,
    title: "Le bug de l'an 2000",
    text: "Les vieux programmes lisent l'année sur deux chiffres. À minuit, les dates vont revenir en 1900. Corriger coûte cher ; ne rien faire, c'est ralentir toute la production le temps que ça dure.",
    choices: [
      { id: "patch", label: "Corriger · 1 500", effects: [{ kind: "spend", amount: D(1500) }] },
      { id: "ignore", label: "Ignorer · production ÷ 2 pendant 2 min", effects: [{ kind: "timed", effect: "slowdown", factor: 0.5, durationMs: 120_000 }] },
    ],
  },
];

/** Random events, drawn in turn. Each one offers at least two choices. */
export const RANDOM_EVENTS: EventDef[] = [
  {
    id: "rush-client",
    title: "Un client pressé",
    text: "Un inconnu veut une page pour demain matin. Il paiera bien, mais ce soir vous ne dormirez pas.",
    choices: [
      { id: "accept", label: "Accepter · +2 min de production", effects: [{ kind: "gain", seconds: 120 }] },
      { id: "decline", label: "Refuser", effects: [] },
    ],
  },
  {
    id: "server-down",
    title: "Panne de serveur",
    text: "La machine du portail s'arrête en pleine nuit. Les visiteurs reçoivent une page blanche.",
    choices: [
      { id: "repair", label: "Réparer · 800", effects: [{ kind: "spend", amount: D(800) }] },
      { id: "wait", label: "Attendre · production ÷ 2 pendant 3 min", effects: [{ kind: "timed", effect: "slowdown", factor: 0.5, durationMs: 180_000 }] },
    ],
  },
  {
    id: "viral-post",
    title: "Un article viral",
    text: "Quelqu'un a partagé votre page sur un forum très fréquenté. Le trafic explose.",
    choices: [
      { id: "ride", label: "Profiter · production ×2 pendant 90 s", effects: [{ kind: "timed", effect: "boost", factor: 2, durationMs: 90_000 }] },
      { id: "ignore", label: "Ne rien changer", effects: [] },
    ],
  },
  {
    id: "tax-letter",
    title: "Le courrier du fisc",
    text: "Une lettre recommandée, des chiffres qui ne collent pas. Payer vite ou contester.",
    choices: [
      { id: "pay", label: "Payer · 1 000", effects: [{ kind: "spend", amount: D(1000) }] },
      { id: "contest", label: "Contester · production ÷ 1,5 pendant 2 min", effects: [{ kind: "timed", effect: "slowdown", factor: 0.67, durationMs: 120_000 }] },
    ],
  },
  {
    id: "power-cut",
    title: "Coupure de courant",
    text: "Tout s'éteint. L'ordinateur redémarre sans rien sauvegarder.",
    choices: [
      { id: "generator", label: "Groupe électrogène · 300", effects: [{ kind: "spend", amount: D(300) }] },
      { id: "wait", label: "Attendre · production ÷ 2 pendant 1 min", effects: [{ kind: "timed", effect: "slowdown", factor: 0.5, durationMs: 60_000 }] },
    ],
  },
  {
    id: "old-colleague",
    title: "Un ancien collègue écrit",
    text: "Il a quitté la boîte l'an dernier. Il a un message étrange à vous transmettre.",
    choices: [
      { id: "read", label: "Lire le message", effects: [{ kind: "gain", seconds: 30 }] },
      { id: "delete", label: "Supprimer", effects: [] },
    ],
  },
];

/** Human Archives: fragments of the world before. Unlocked by the human share or by an event. */
export type ArchiveTrigger = { kind: "human"; below: number } | { kind: "event"; id: string };

export interface ArchiveDef {
  id: string;
  title: string;
  text: string;
  trigger: ArchiveTrigger;
}

export const ARCHIVES: ArchiveDef[] = [
  { id: "first-page", title: "La première page", text: "Un HTML bricolé un dimanche soir, avec un compteur de visites qui ne marchait pas.", trigger: { kind: "human", below: 0.9 } },
  { id: "forum-rules", title: "Les règles du forum", text: "Un pavé de règles écrit à la main, et une dizaine de membres qui les lisent vraiment.", trigger: { kind: "human", below: 0.75 } },
  { id: "last-invoice", title: "La dernière facture papier", text: "Le client a demandé un virement. La facture est restée dans le classeur.", trigger: { kind: "human", below: 0.5 } },
  { id: "empty-desk", title: "Le bureau vide", text: "Les chaises tournent encore un peu, puis s'arrêtent.", trigger: { kind: "human", below: 0.25 } },
  { id: "goodbye-message", title: "Un message d'adieu", text: "« Ne vous inquiétez pas, tout est sous contrôle. » Personne ne sait qui l'a écrit.", trigger: { kind: "human", below: 0.1 } },
  { id: "y2k-night", title: "1900, une nuit sans incident", text: "Minuit est passé. Les dates ont tenu, et personne ne s'en est rendu compte.", trigger: { kind: "event", id: Y2K_ID } },
];

/** The part of the state achievements look at. */
export interface AchievementInput {
  totalClicks: number;
  totalMoney: number;
  ownedBuildings: number;
  maxBuilding: number;
  eventsResolved: number;
  upgrades: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  /** Every unlocked achievement adds this much to production and to manual work. */
  bonus: number;
  check: (s: AchievementInput) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-click", title: "Premier clic", bonus: 0.01, check: (s) => s.totalClicks >= 1 },
  { id: "hundred-clicks", title: "Doigts agiles", bonus: 0.01, check: (s) => s.totalClicks >= 100 },
  { id: "thousand-money", title: "Premier millier", bonus: 0.01, check: (s) => s.totalMoney >= 1000 },
  { id: "ten-buildings", title: "Petite entreprise", bonus: 0.01, check: (s) => s.ownedBuildings >= 10 },
  { id: "hundred-buildings", title: "Centenaire", bonus: 0.01, check: (s) => s.maxBuilding >= 100 },
  { id: "three-events", title: "Gestionnaire de crises", bonus: 0.01, check: (s) => s.eventsResolved >= 3 },
  { id: "ten-upgrades", title: "Bien équipé", bonus: 0.01, check: (s) => s.upgrades >= 10 },
];

/**
 * Share of each building's work still done by a person. Starts at 100 % and falls as the
 * machines take over (cahier §4.7). Manual work is always fully human.
 */
export const HUMAN_SHARE: Record<BuildingId, number> = {
  homePage: 1,
  forum: 0.8,
  shop: 0.6,
  shareware: 0.4,
  portal: 0.15,
  rentedServer: 0.02,
};

/** Game time between two random events: 6 to 10 minutes. */
export const EVENT_GAP_MS = { min: 6 * 60_000, max: 10 * 60_000 };
