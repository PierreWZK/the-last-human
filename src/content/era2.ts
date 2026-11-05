import { D } from "@/game/decimal";
import type { BuildingDef, UpgradeDef } from "@/game/types";

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

const owned = (building: BuildingDef["id"], count: number) => ({ kind: "owned" as const, building, count });

/**
 * Améliorations de l'ère II. Avec l'option 1 (achat immédiat), « vitesse » et « seuil » d'un
 * script n'ont pas de sens : les deux améliorations de script renforcent donc la collecte.
 */
export const UPGRADES_ERA2: UpgradeDef[] = [
  { id: "compression", name: "Compression", description: "Les données prennent moins de place. Scripts de collecte ×2.", cost: D(100), costResource: "compute", target: { kind: "building", building: "dataCollector" }, factor: 2, requires: owned("dataCollector", 10), era: 2 },
  { id: "cronJobs", name: "Tâches planifiées", description: "Les scripts tournent la nuit, à heure fixe. Scripts de collecte ×2.", cost: D(2000), costResource: "data", target: { kind: "building", building: "dataCollector" }, factor: 2, requires: owned("dataCollector", 25), era: 2 },
  { id: "parallelScripts", name: "Scripts en parallèle", description: "Chaque script d'achat ajoute 5 % à la collecte de données.", cost: D(500), costResource: "compute", target: { kind: "synergy", building: "dataCollector", source: "buyScript", perUnit: 0.05 }, factor: 1, requires: owned("buyScript", 5), era: 2 },
  { id: "memoryCache", name: "Mémoire cache", description: "Les réponses fréquentes restent en mémoire. Bases de données ×2.", cost: D(200), costResource: "compute", target: { kind: "building", building: "database" }, factor: 2, requires: owned("database", 10), era: 2 },
  { id: "replication", name: "Réplication", description: "Chaque base de données ajoute 2 % au calcul des clusters cloud.", cost: D(2000), costResource: "compute", target: { kind: "synergy", building: "cloudCluster", source: "database", perUnit: 0.02 }, factor: 1, requires: owned("database", 15), era: 2 },
  { id: "cloudContract", name: "Contrat cloud", description: "Un engagement sur trois ans, des machines à prix cassé. Clusters cloud ×2.", cost: D(3000), costResource: "compute", target: { kind: "building", building: "cloudCluster" }, factor: 2, requires: owned("cloudCluster", 10), era: 2 },
  { id: "siteFiber", name: "Fibre entre sites", description: "Chaque cluster cloud ajoute 2 % au calcul des datacenters.", cost: D(10000), costResource: "compute", target: { kind: "synergy", building: "datacenter", source: "cloudCluster", perUnit: 0.02 }, factor: 1, requires: owned("cloudCluster", 15), era: 2 },
  { id: "maintenancePlan", name: "Plan de maintenance", description: "Les pannes sont prévues avant d'arriver. Toute la production ×1,5.", cost: D(5000), costResource: "compute", target: { kind: "all" }, factor: 1.5, requires: owned("datacenter", 5), era: 2 },
  { id: "connectedFactory", name: "Usine connectée", description: "Chaque datacenter ajoute 3 % au travail des bras robotiques.", cost: D(80000), costResource: "compute", target: { kind: "synergy", building: "robotArm", source: "datacenter", perUnit: 0.03 }, factor: 1, requires: owned("datacenter", 10), era: 2 },
  { id: "securityAudit", name: "Audit de sécurité", description: "Plus personne n'entre sans badge, pas même vous. Toute la production ×2.", cost: D(50000), costResource: "compute", target: { kind: "all" }, factor: 2, requires: owned("robotArm", 1), era: 2 },
];
