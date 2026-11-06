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
  dataCollector: 0.3,
  buyScript: 0.2,
  database: 0.15,
  cloudCluster: 0.08,
  datacenter: 0.04,
  robotArm: 0.01,
  gpuServer: 0.03,
  dataLab: 0.02,
  agent: 0.01,
  robotFactory: 0,
  planner: 0,
  gigafactory: 0,
};

/** Game time between two random events: 6 to 10 minutes. */
export const EVENT_GAP_MS = { min: 6 * 60_000, max: 10 * 60_000 };
