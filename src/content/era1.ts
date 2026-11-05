import { D } from "@/game/decimal";
import type { BuildingDef, UpgradeDef } from "@/game/types";

/**
 * Ère I — The Digital Age (1990–2005). Valeurs de départ : le simulateur (phase 2)
 * les ajustera. Toute ligne ici est une donnée, pas du code.
 */
export const BUILDINGS: BuildingDef[] = [
  {
    id: "homePage",
    name: "Page personnelle",
    description: "Un HTML bricolé un dimanche soir. Quelques centimes par heure, et ça tourne.",
    baseCost: D(15),
    costResource: "money",
    produces: { resource: "money", perSecond: D(0.2) },
    growth: 1.15,
  },
  {
    id: "forum",
    name: "Forum de discussion",
    description: "Des inconnus qui débattent la nuit. Ils produisent des données sans le savoir.",
    baseCost: D(120),
    costResource: "money",
    produces: { resource: "data", perSecond: D(0.5) },
    growth: 1.15,
  },
  {
    id: "shop",
    name: "Boutique en ligne",
    description: "Des cartons, un entrepôt loué et des clients qui paient par chèque.",
    baseCost: D(600),
    costResource: "money",
    produces: { resource: "money", perSecond: D(2) },
    growth: 1.15,
  },
  {
    id: "shareware",
    name: "Logiciel shareware",
    description: "Un programme gratuit à essayer, une licence à payer. Le bouton « Enregistrer » fait le reste.",
    baseCost: D(3000),
    costResource: "money",
    produces: { resource: "money", perSecond: D(9) },
    growth: 1.15,
  },
  {
    id: "portal",
    name: "Portail web",
    description: "Une page d'accueil qui ressemble à une porte. Tout le monde y passe, tout le monde laisse une trace.",
    baseCost: D(15000),
    costResource: "money",
    produces: { resource: "data", perSecond: D(6) },
    growth: 1.15,
  },
  {
    id: "rentedServer",
    name: "Serveur loué",
    description: "Une machine dans un datacenter lointain, qui ne dort jamais. Première trace de ce qui viendra après vous.",
    baseCost: D(90000),
    costResource: "money",
    produces: { resource: "money", perSecond: D(260) },
    growth: 1.15,
  },
];

const none = { kind: "none" as const };

export const UPGRADES: UpgradeDef[] = [
  // Travail manuel
  { id: "keyboard", name: "Clavier ergonomique", description: "Dix doigts, moins de fatigue : le travail manuel rapporte deux fois plus.", cost: D(50), costResource: "money", target: { kind: "manual" }, factor: 2, requires: none },
  { id: "mouse", name: "Souris optique", description: "Le clic devient deux fois plus précis, donc deux fois plus rentable.", cost: D(200), costResource: "money", target: { kind: "manual" }, factor: 2, requires: none },
  { id: "touchTyping", name: "Cours de dactylo", description: "Une disquette de cours et des heures d'exercices. Le clic devient une habitude.", cost: D(6000), costResource: "money", target: { kind: "manual" }, factor: 2, requires: { kind: "totalMoney", amount: D(4000) } },
  { id: "manualFlow", name: "Le flux tendu", description: "Un rythme de travail sans pause : le clic rapporte deux fois plus.", cost: D(40000), costResource: "money", target: { kind: "manual" }, factor: 2, requires: { kind: "totalMoney", amount: D(30000) } },

  // Page personnelle
  { id: "darkTheme", name: "Thème sombre", description: "Fond noir, texte vert : la page perso tient mieux la route. Production ×2.", cost: D(80), costResource: "money", target: { kind: "building", building: "homePage" }, factor: 2, requires: { kind: "owned", building: "homePage", count: 10 } },
  { id: "freeHosting", name: "Hébergement gratuit", description: "Un hébergeur qui affiche une bannière. Production de pages ×2.", cost: D(1200), costResource: "money", target: { kind: "building", building: "homePage" }, factor: 2, requires: { kind: "owned", building: "homePage", count: 40 } },

  // Forum
  { id: "moderation", name: "Modération", description: "Quelques modérateurs bénévoles. Le forum produit deux fois plus de données.", cost: D(500), costResource: "money", target: { kind: "building", building: "forum" }, factor: 2, requires: { kind: "owned", building: "forum", count: 10 } },
  { id: "forumCharter", name: "Charte du forum", description: "Des règles claires, des membres qui restent. Production de données ×2.", cost: D(40), costResource: "data", target: { kind: "building", building: "forum" }, factor: 2, requires: { kind: "owned", building: "forum", count: 40 } },

  // Boutique
  { id: "onlinePayment", name: "Paiement en ligne", description: "Plus besoin de chèques. Les ventes de la boutique ×2.", cost: D(2500), costResource: "money", target: { kind: "building", building: "shop" }, factor: 2, requires: { kind: "owned", building: "shop", count: 10 } },
  { id: "catalog", name: "Catalogue illustré", description: "Des photos floues et des prix en gras. Boutique ×2.", cost: D(25000), costResource: "money", target: { kind: "building", building: "shop" }, factor: 2, requires: { kind: "owned", building: "shop", count: 40 } },

  // Logiciel
  { id: "proVersion", name: "Version Pro", description: "Une édition payante avec plus de fonctions. Logiciels ×2.", cost: D(12000), costResource: "money", target: { kind: "building", building: "shareware" }, factor: 2, requires: { kind: "owned", building: "shareware", count: 10 } },
  { id: "companyLicense", name: "Licence d'entreprise", description: "Les bureaux achètent en gros. Logiciels ×2.", cost: D(150), costResource: "data", target: { kind: "building", building: "shareware" }, factor: 2, requires: { kind: "owned", building: "shareware", count: 30 } },

  // Portail
  { id: "seo", name: "Référencement", description: "Les moteurs de recherche trouvent enfin la page. Portails ×2.", cost: D(60000), costResource: "money", target: { kind: "building", building: "portal" }, factor: 2, requires: { kind: "owned", building: "portal", count: 10 } },
  { id: "targetedAds", name: "Publicité ciblée", description: "Des bannières qui savent ce que vous aimez. Portails ×2.", cost: D(400), costResource: "data", target: { kind: "building", building: "portal" }, factor: 2, requires: { kind: "owned", building: "portal", count: 25 } },

  // Serveur loué
  { id: "longContract", name: "Contrat longue durée", description: "Trois ans d'engagement, un prix cassé. Serveurs loués ×2.", cost: D(500000), costResource: "money", target: { kind: "building", building: "rentedServer" }, factor: 2, requires: { kind: "owned", building: "rentedServer", count: 10 } },
  { id: "liquidCooling", name: "Refroidissement liquide", description: "Les machines chauffent moins, donc tournent plus. Serveurs loués ×2.", cost: D(3000000), costResource: "money", target: { kind: "building", building: "rentedServer" }, factor: 2, requires: { kind: "owned", building: "rentedServer", count: 25 } },

  // Globales
  { id: "nightBackup", name: "Sauvegarde nocturne", description: "Les données ne se perdent plus. Toute la production ×1,5.", cost: D(100000), costResource: "money", target: { kind: "all" }, factor: 1.5, requires: { kind: "totalMoney", amount: D(50000) } },
  { id: "localNetwork", name: "Réseau local", description: "Un routeur, des câbles partout. Toute la production ×1,5.", cost: D(300), costResource: "data", target: { kind: "all" }, factor: 1.5, requires: { kind: "totalMoney", amount: D(10000) } },
  { id: "wordOfMouth", name: "Bouche-à-oreille", description: "Les gens en parlent. Toute la production ×2.", cost: D(2000000), costResource: "money", target: { kind: "all" }, factor: 2, requires: { kind: "totalMoney", amount: D(1000000) } },
  { id: "dialUpGone", name: "Adieu le modem", description: "Le bip du modem disparaît enfin. Toute la production ×1,5.", cost: D(8000), costResource: "data", target: { kind: "all" }, factor: 1.5, requires: { kind: "totalMoney", amount: D(200000) } },
];

/** Événement de l'ère I : le bug de l'an 2000. Déclenché une seule fois. */
export const Y2K_TRIGGER_MONEY = D(5000);
export const Y2K_PATCH_COST = D(1500);
export const Y2K_SLOWDOWN = { factor: 0.5, durationMs: 120_000 };
