import { D } from "@/game/decimal";
import type { BuildingDef } from "@/game/types";

/**
 * Ère II — The Automation Age (2005–2020). Valeurs de départ : le simulateur les réglera.
 * Toute ligne ici est une donnée, pas du code.
 */
export const BUILDINGS_ERA2: BuildingDef[] = [
  {
    id: "dataCollector",
    name: "Script de collecte",
    description: "Un programme qui récolte les données à votre place, toute la journée.",
    baseCost: D(20000),
    costResource: "money",
    produces: { resource: "data", perSecond: D(1.5) },
    growth: 1.15,
    era: 2,
  },
  {
    id: "buyScript",
    name: "Script d'achat",
    description: "Il achète le bâtiment désigné dès qu'il est abordable. Il ne fait rien d'autre.",
    baseCost: D(60),
    costResource: "compute",
    produces: { resource: "compute", perSecond: D(0) },
    growth: 1.15,
    era: 2,
  },
  {
    id: "database",
    name: "Base de données",
    description: "Des tables, des index, et enfin des calculs qui tiennent en mémoire.",
    baseCost: D(120000),
    costResource: "money",
    produces: { resource: "compute", perSecond: D(3) },
    growth: 1.15,
    era: 2,
  },
  {
    id: "cloudCluster",
    name: "Cluster cloud",
    description: "Des machines louées par milliers, facturées à la seconde.",
    baseCost: D(400),
    costResource: "compute",
    produces: { resource: "compute", perSecond: D(12) },
    growth: 1.15,
    era: 2,
  },
  {
    id: "datacenter",
    name: "Datacenter",
    description: "Une salle climatisée où le calcul ne s'arrête jamais.",
    baseCost: D(3000),
    costResource: "compute",
    produces: { resource: "compute", perSecond: D(60) },
    growth: 1.15,
    era: 2,
  },
  {
    id: "robotArm",
    name: "Bras robotique industriel",
    description: "Le premier robot de la partie. Il travaille sans pause, sans salaire, sans question.",
    baseCost: D(25000),
    costResource: "compute",
    produces: { resource: "compute", perSecond: D(300) },
    growth: 1.15,
    era: 2,
  },
];
