import type { BuildingId } from "@/game/types";
import { when, type Condition } from "./conditions";
import { BUILDINGS } from "./era1";
import { BUILDINGS_ERA2 } from "./era2";
import { BUILDINGS_ERA3 } from "./era3";
import { BUILDINGS_ERA4 } from "./era4";
import { ALGORITHMS } from "./algorithms";
import { DIRECTIVES, POLICIES } from "./era5";
import { KNOWLEDGE_BONUSES } from "./knowledge";
import { EVENTS, RANDOM_EVENTS, Y2K_ID } from "./events1";

/**
 * Achievements and Human Archives. Each entry is a condition (check + hint): the page shows the
 * hint while it is locked, so the player always knows what to do.
 * Achievements: the first seven give +1 % each, the hundred others +0,1 % each (balance: the total
 * stays at +17 %, checked by the simulator).
 */

export type { MilestoneView } from "./conditions";

export interface AchievementDef extends Condition {
  id: string;
  title: string;
  category: AchievementCategory;
  /** Added to all production and to manual work once unlocked. */
  bonus: number;
}

export type AchievementCategory = "progression" | "production" | "buildings" | "discovery" | "renaissance" | "story";

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = ["progression", "production", "buildings", "discovery", "renaissance", "story"];

const SMALL = 0.001;
const a = (id: string, title: string, category: AchievementCategory, cond: Condition, bonus = SMALL): AchievementDef => ({
  id,
  title,
  category,
  bonus,
  ...cond,
});

const ALL_BUILDING_DEFS = [...BUILDINGS, ...BUILDINGS_ERA2, ...BUILDINGS_ERA3, ...BUILDINGS_ERA4];

/** Three per building: the first one, a series of 50, an empire of 200. */
const BUILDING_ACHIEVEMENTS: AchievementDef[] = ALL_BUILDING_DEFS.flatMap((b) => [
  a(`b-${b.id}-1`, `Premier pas : ${b.name}`, "buildings", when.owned(b.id, 1)),
  a(`b-${b.id}-50`, `En série : ${b.name}`, "buildings", when.owned(b.id, 50)),
  a(`b-${b.id}-200`, `Empire : ${b.name}`, "buildings", when.owned(b.id, 200)),
]);

const y2k = EVENTS.find((e) => e.id === Y2K_ID)!;

export const ACHIEVEMENTS: AchievementDef[] = [
  // The original seven (phase 3), +1 % each.
  a("first-click", "Premier clic", "production", when.clicks(1), 0.01),
  a("hundred-clicks", "Doigts agiles", "production", when.clicks(100), 0.01),
  a("thousand-money", "Premier millier", "production", when.money(1000), 0.01),
  { id: "ten-buildings", title: "Petite entreprise", category: "buildings", bonus: 0.01, hint: "Posséder 10 bâtiments en tout, en même temps.", check: ({ state }) => Object.values(state.buildings).reduce((x, y) => x + y, 0) >= 10 },
  { id: "hundred-buildings", title: "Centenaire", category: "buildings", bonus: 0.01, hint: "Posséder 100 exemplaires d'un même bâtiment.", check: ({ state }) => Math.max(0, ...Object.values(state.buildings)) >= 100 },
  a("three-events", "Gestionnaire de crises", "story", when.events(3), 0.01),
  a("ten-upgrades", "Bien équipé", "progression", when.upgrades(10), 0.01),

  // One hundred more, +0,5 % each.
  ...BUILDING_ACHIEVEMENTS, // 54
  a("clicks-1k", "Mille lignes", "production", when.clicks(1000)),
  a("clicks-5k", "Le clavier fume", "production", when.clicks(5000)),
  a("clicks-10k", "Dix mille frappes", "production", when.clicks(10_000)),
  a("clicks-50k", "Le dernier à taper", "production", when.clicks(50_000)),
  a("money-1m", "Premier million", "production", when.money(1e6)),
  a("money-100m", "Cent millions", "production", when.money(1e8)),
  a("money-10b", "Dix milliards", "production", when.money(1e10)),
  a("money-1t", "Le billion", "production", when.money(1e12)),
  a("money-1q", "Le billiard", "production", when.money(1e15)),
  a("events-10", "Rien ne m'étonne", "story", when.events(10)),
  a("events-25", "Vingt-cinq décisions", "story", when.events(25)),
  a("events-50", "Cinquante tempêtes", "story", when.events(50)),
  a("y2k-answered", "Minuit est passé", "story", when.answered(Y2K_ID, y2k.title)),
  a("renaissances-1", "Renaître", "renaissance", when.renaissances(1)),
  a("upgrades-20", "Atelier complet", "progression", when.upgrades(20)),
  a("upgrades-40", "Tout est optimisé", "progression", when.upgrades(40)),
  a("era-2", "L'âge de l'automatisation", "progression", when.era(2)),
  a("era-3", "La révolution IA", "progression", when.era(3)),
  a("era-4", "L'âge autonome", "progression", when.era(4)),
  a("era-5", "Le dernier humain", "progression", when.era(5)),
  a("renaissances-4", "Quatre fois renaître", "renaissance", when.renaissances(4)),
  a("knowledge-1", "Ce qu'on garde", "renaissance", when.knowledge(1)),
  a("knowledge-all", "Arbre complet", "renaissance", when.knowledge(KNOWLEDGE_BONUSES.length, true)),
  a("algorithms-1", "Premier algorithme", "renaissance", when.algorithms(1)),
  a("algorithms-all", "Bibliothèque complète", "renaissance", when.algorithms(ALGORITHMS.length, true)),
  a("equipped-3", "Trois en même temps", "renaissance", when.equipped(3)),
  a("models-1", "Premier modèle", "discovery", when.models(1)),
  a("models-10", "Dix modèles", "discovery", when.models(10)),
  a("models-25", "Une armée de modèles", "discovery", when.models(25)),
  a("models-50", "Cinquante esprits", "discovery", when.models(50)),
  a("cores-1", "Premier core", "renaissance", when.cores(1)),
  a("cores-9", "Grille pleine", "renaissance", when.cores(9)),
  a("robots-1k", "Mille robots", "discovery", when.robots(1000)),
  a("robots-1m", "Un million de machines", "discovery", when.robots(1e6)),
  a("robots-1b", "Un milliard de machines", "discovery", when.robots(1e9)),
  a("autonomy-1", "Ça tourne tout seul", "discovery", when.autonomy(1)),
  a("policies-1", "Première politique", "renaissance", when.policies(1)),
  a("policies-all", "Constitution des machines", "renaissance", when.policies(POLICIES.length, true)),
  a("directives-1", "Premier ordre", "story", when.directives(1)),
  a("directives-3", "La moitié du monde", "story", when.directives(3)),
  a("directives-all", "Plus rien à décider", "story", when.directives(DIRECTIVES.length)),
  a("human-10", "Spectateur", "story", when.human(0.1)),
  a("human-0", "Personne au travail", "story", when.human(0.000001)),
  a("archives-10", "Mémoire vive", "story", when.archives(10)),
  a("archives-50", "Conservateur", "story", when.archives(50)),
  a("ended-1", "Compris. Nous nous occuperons de tout.", "story", when.ended()),
];

/* ------------------------------------------------------------------------------------------- */

export type ArchiveCategory = "office" | "machines" | "models" | "world" | "last";
export const ARCHIVE_CATEGORIES: ArchiveCategory[] = ["office", "machines", "models", "world", "last"];

export interface ArchiveDef extends Condition {
  id: string;
  title: string;
  text: string;
  category: ArchiveCategory;
}

const r = (id: string, category: ArchiveCategory, title: string, text: string, cond: Condition): ArchiveDef => ({
  id,
  category,
  title,
  text,
  ...cond,
});

const ev = (id: string) => [...EVENTS, ...RANDOM_EVENTS].find((e) => e.id === id)!;
const answered = (id: string) => when.answered(id, ev(id).title);
const own = (id: BuildingId, n = 1) => when.owned(id, n);
const dir = (id: string) => when.directive(id, DIRECTIVES.find((d) => d.id === id)!.name);

export const ARCHIVES: ArchiveDef[] = [
  // The original eight.
  r("first-page", "office", "La première page", "Un HTML bricolé un dimanche soir, avec un compteur de visites qui ne marchait pas.", when.human(0.9)),
  r("forum-rules", "office", "Les règles du forum", "Un pavé de règles écrit à la main, et une dizaine de membres qui les lisent vraiment.", when.human(0.75)),
  r("last-invoice", "machines", "La dernière facture papier", "Le client a demandé un virement. La facture est restée dans le classeur.", when.human(0.5)),
  r("empty-desk", "machines", "Le bureau vide", "Les chaises tournent encore un peu, puis s'arrêtent.", when.human(0.25)),
  r("goodbye-message", "models", "Un message d'adieu", "« Ne vous inquiétez pas, tout est sous contrôle. » Personne ne sait qui l'a écrit.", when.human(0.1)),
  r("last-trade", "world", "Le dernier métier", "Une horlogère répare encore des montres. Personne ne lui en apporte, mais elle ouvre tous les matins.", when.human(0.01)),
  r("last-human", "last", "Le dernier humain", "Il n'y a plus de travail à faire. Il reste quelqu'un pour le remarquer.", when.human(0.000001)),
  r("y2k-night", "office", "1900, une nuit sans incident", "Minuit est passé. Les dates ont tenu, et personne ne s'en est rendu compte.", answered(Y2K_ID)),

  // 1990 · Le bureau (era I).
  r("modem-song", "office", "Le chant du modem", "Trente secondes de sifflements avant chaque connexion. On apprenait à reconnaître la bonne note.", when.clicks(10)),
  r("beige-tower", "office", "La tour beige", "Elle jaunissait au soleil. On posait le café dessus, toujours du même côté.", when.clicks(250)),
  r("visit-counter", "office", "Le compteur de visites", "000042. On rechargeait la page soi-même pour le voir monter.", own("homePage")),
  r("guestbook", "office", "Le livre d'or", "« Super site ! Passe voir le mien. » Une signature, un lien mort, une date de 1997.", own("homePage", 10)),
  r("first-thread", "office", "Le premier fil", "Quelqu'un demande comment changer la couleur des liens. Quarante réponses, aucune ne fonctionne.", own("forum")),
  r("moderator", "office", "La modératrice", "Elle supprimait les insultes à la main, la nuit, sans être payée. Elle connaissait chaque pseudo.", own("forum", 10)),
  r("first-order", "office", "La première commande", "Un CD de jazz, payé par chèque envoyé par la poste. Le colis est parti le lendemain, emballé à la main.", own("shop")),
  r("packing-table", "office", "La table d'emballage", "Du papier bulle, un rouleau de scotch qui crisse, une adresse écrite au feutre.", own("shop", 10)),
  r("floppy-label", "office", "L'étiquette de la disquette", "« Version 1.2 — NE PAS EFFACER ». Écrit au stylo bille, à moitié décollé.", own("shareware")),
  r("registration-key", "office", "La clé d'enregistrement", "Un utilisateur envoie dix dollars dans une enveloppe, depuis le Canada, avec un mot de remerciement.", own("shareware", 10)),
  r("webring", "office", "L'anneau web", "« Site précédent · Site suivant ». On faisait le tour de la planète en vingt clics.", own("portal")),
  r("rented-rack", "office", "La baie louée", "Un serveur dans une salle froide, à l'autre bout de la ville. On y allait en voiture pour le redémarrer.", own("rentedServer")),
  r("printed-manual", "office", "Le manuel imprimé", "Trois cents pages, des oreilles cornées, un post-it jaune à la page des raccourcis.", when.upgrades(5)),
  r("night-shift", "office", "La nuit blanche", "Un client pressé, une pizza froide, le ciel qui pâlit derrière l'écran.", answered("rush-client")),
  r("blank-page", "office", "La page blanche", "Le serveur est tombé. Au matin, quelqu'un a écrit pour demander si tout allait bien.", answered("server-down")),
  r("viral", "office", "Le jour où tout le monde est venu", "Le compteur a pris trois chiffres en une soirée. On a appelé sa mère pour lui dire.", answered("viral-post")),
  r("tax-letter", "office", "La lettre recommandée", "Une enveloppe brune, un formulaire en trois exemplaires, une file d'attente au guichet.", answered("tax-letter")),
  r("candle", "office", "La bougie", "Coupure de courant. Pour la première fois depuis des mois, la pièce était silencieuse.", answered("power-cut")),
  r("colleague", "office", "Le message du collègue", "« Ils vont tout automatiser. Profite du bureau tant qu'il y a des chaises. »", answered("old-colleague")),
  r("first-thousand", "office", "Le premier millier", "Assez pour un nouvel écran. On a gardé l'ancien, au cas où.", when.money(1000)),
  r("calendar", "office", "Le calendrier au mur", "Des chats, des cases cochées au feutre rouge, un mois de retard.", when.events(5)),
  r("lunch-break", "office", "La pause déjeuner", "Une heure entière, une table commune, des conversations qui ne servaient à rien.", when.human(0.95)),
  r("office-plant", "office", "La plante du bureau", "Un ficus que personne n'arrosait vraiment, et qui survivait quand même.", when.human(0.85)),
  r("keyboard-wear", "office", "Les touches effacées", "Le E et le S ne se lisaient plus. On tapait sans regarder.", when.clicks(2000)),

  // 2005 · Les machines (era II).
  r("cron-job", "machines", "La tâche planifiée", "Une ligne de configuration remplace une habitude de dix ans. Personne ne la relit.", when.era(2)),
  r("collector", "machines", "Le formulaire qui se remplit seul", "Avant, quelqu'un recopiait les données à la main, le lundi matin.", own("dataCollector")),
  r("buying-script", "machines", "Le script qui achète", "Il ne se trompe jamais de case. Il ne demande jamais à quoi ça sert.", own("buyScript")),
  r("database", "machines", "Les fiches cartonnées", "Le fichier client tenait dans trois tiroirs. On les a vidés un samedi.", own("database")),
  r("cloud", "machines", "Le nuage", "Les serveurs ont quitté la salle froide. On ne sait plus où ils sont, et ça ne compte plus.", own("cloudCluster")),
  r("datacenter", "machines", "Le bourdonnement", "Un hangar de machines qui chauffent. Un gardien fait sa ronde, par habitude.", own("datacenter")),
  r("robot-arm", "machines", "Le bras jaune", "Il soude toute la nuit. Le chef d'équipe a été muté, puis plus remplacé.", own("robotArm")),
  r("standup", "machines", "La réunion debout", "Quinze minutes chaque matin, puis dix, puis plus du tout : le tableau se met à jour seul.", when.human(0.65)),
  r("helpdesk", "machines", "Le support téléphonique", "Une voix enregistrée remplace celle de Martine. Les clients ne voient pas la différence.", when.human(0.4)),
  r("parking", "machines", "Le parking", "Les places numérotées restent vides. On les repeint d'une autre couleur, pour les livraisons.", when.human(0.3)),
  r("badge", "machines", "Le badge", "Il ouvre toujours la porte. Plus personne ne passe la porte.", when.human(0.2)),
  r("scripts-five", "machines", "Cinq scripts", "Ils travaillent en même temps et ne se parlent pas. Ça suffit.", own("buyScript", 5)),
  r("racks-twenty", "machines", "La rangée de baies", "Vingt armoires qui clignotent. On les reconnaît au son de leurs ventilateurs.", own("database", 20)),
  r("knowledge-tree", "machines", "Ce que l'on garde", "Après la renaissance, il reste des réflexes, des raccourcis, une manière de faire.", when.knowledge(1)),
  r("one-million", "machines", "Le premier million", "Un chiffre sur un écran. Il y a vingt ans, il aurait rempli une valise.", when.money(1e6)),
  r("ten-events", "machines", "La routine des crises", "Panne, fisc, client pressé. On a fini par avoir une procédure pour chaque chose.", when.events(10)),
  r("archives-ten", "machines", "Le carton de souvenirs", "Dix objets dans une boîte. On ne sait pas encore pourquoi on les garde.", when.archives(10)),
  r("thirty-upgrades", "machines", "La salle des machines", "Trente améliorations. Le bureau ne ressemble plus à un bureau.", when.upgrades(30)),
  r("algorithm-first", "machines", "La première règle", "Un algorithme décide à la place de quelqu'un. Il est plus juste, dit-on.", when.algorithms(1)),
  r("two-renaissances", "machines", "La deuxième fois", "On recommence, mais on sait déjà où sont les murs.", when.renaissances(2)),
  r("scripts-run", "machines", "La nuit des scripts", "Au matin, tout est acheté, tout est rangé. Personne n'a veillé.", own("buyScript", 20)),

  // 2020 · Les modèles (era III).
  r("first-model", "models", "Le premier modèle", "Il a appris en deux minutes ce qu'un stagiaire apprenait en un été.", when.models(1)),
  r("gpu", "models", "La carte graphique", "Elle servait aux jeux vidéo. Elle sert maintenant à tout.", own("gpuServer")),
  r("data-lab", "models", "Le laboratoire", "Des gens nettoient des données pour des machines qui les remplaceront.", own("dataLab")),
  r("agent", "models", "L'agent", "Il lit les mails, répond aux mails, archive les mails. Il ne s'ennuie pas.", own("agent")),
  r("translator", "models", "La traductrice", "Elle relisait les traductions automatiques. Puis plus personne ne lui en a envoyé.", when.models(5)),
  r("call-center", "models", "Le centre d'appels", "Mille postes, mille casques. Un seul modèle les a tous remplacés en une semaine.", when.models(10)),
  r("radiologist", "models", "Le radiologue", "Il comparait ses diagnostics avec ceux du modèle. Un jour, il a arrêté de comparer.", when.models(20)),
  r("exam", "models", "L'examen", "Les étudiants révisaient encore. Le modèle avait déjà la réponse à chaque question.", when.human(0.15)),
  r("quality", "models", "Un modèle presque parfait", "Qualité 1,9. Les ingénieurs n'ont pas compris pourquoi il était si bon.", when.models_quality(1.9)),
  r("intelligence", "models", "Le bonus d'intelligence", "Tout va un peu plus vite, partout, sans que personne n'ait rien changé.", when.era(3)),
  r("three-renaissances", "models", "La troisième fois", "Les machines se souviennent mieux que nous de la dernière fois.", when.renaissances(3)),
  r("all-algorithms", "models", "La bibliothèque complète", "Toutes les règles qui décident de tout. Aucune n'a été votée.", when.algorithms(ALGORITHMS.length)),
  r("equipped", "models", "Trois règles à la fois", "Elles se combinent d'une façon que personne n'avait prévue, mais qui marche.", when.equipped(3)),
  r("training-night", "models", "L'entraînement de nuit", "Les serveurs chauffent pendant que la ville dort. Le matin, un nouveau modèle attend.", when.models(3)),
  r("journalist", "models", "Le journaliste", "Les dépêches s'écrivent seules. Il garde son carnet, par superstition.", when.models(15)),
  r("lawyer", "models", "L'avocate", "Les contrats se relisent seuls. Elle plaide encore, pour l'instant.", when.models(25)),
  r("billion-money", "models", "Le milliard", "Personne ne sait plus ce que vaut un milliard, ni à qui il appartient.", when.money(1e9)),
  r("fifty-events", "models", "Cinquante crises", "Les crises se règlent plus vite qu'on ne les découvre.", when.events(50)),

  // 2040 · Le monde (era IV).
  r("first-factory", "world", "La première usine sans ouvriers", "On a coupé l'éclairage pour économiser. Les robots n'en ont pas besoin.", own("robotFactory")),
  r("planner", "world", "Le planificateur", "Il décide ce qu'il faut construire. Il a raison plus souvent que les comités.", own("planner")),
  r("gigafactory", "world", "La ville-usine", "Elle fait la taille d'une ville. Personne n'y habite.", own("gigafactory")),
  r("neural-core", "world", "Le premier core", "Une grille de neuf cases, et le monde change de vitesse.", when.cores(1)),
  r("full-grid", "world", "La grille pleine", "Chaque case parle à ses voisines. Le tout est plus intelligent que la somme.", when.cores(9)),
  r("thousand-robots", "world", "Mille robots", "On les comptait encore un par un. Bientôt, on ne les comptera plus.", when.robots(1000)),
  r("million-robots", "world", "Un million de robots", "Ils construisent les robots suivants. La courbe devient une falaise.", when.robots(1e6)),
  r("billion-robots", "world", "Un milliard de robots", "Il y a désormais plus de machines que d'enfants nés cette année.", when.robots(1e9)),
  r("autonomy", "world", "L'autonomie", "Les entraînements démarrent seuls. Personne n'appuie plus sur le bouton.", when.autonomy(1)),
  r("autonomy-ten", "world", "La décision automatique", "Les machines planifient leurs propres réparations, et celles des autres.", when.autonomy(10)),
  r("taxi", "world", "Le dernier taxi", "Le chauffeur a garé sa voiture une dernière fois, et l'a laissée repartir seule.", when.human(0.05)),
  r("farmer", "world", "Le dernier agriculteur", "Il marche encore dans ses champs. Les machines s'écartent poliment.", when.human(0.02)),
  r("builder", "world", "Le maçon", "Ses mains savent encore monter un mur droit. Plus personne ne lui en demande.", when.human(0.005)),
  r("gigafactories-ten", "world", "Dix villes-usines", "On les voit depuis l'espace, comme des taches de lumière immobiles.", own("gigafactory", 10)),
  r("factories-fifty", "world", "La vallée des usines", "Cinquante usines côte à côte, et pas un seul klaxon.", own("robotFactory", 50)),
  r("drones", "world", "Les drones", "Ils livrent les colis à heure fixe. Les chiens ont cessé d'aboyer.", when.robots(10_000)),
  r("empty-road", "world", "La route vide", "Plus d'embouteillages, plus de feux rouges. Les camions roulent la nuit, phares éteints.", when.robots(100_000)),
  r("factories-ten", "world", "Dix usines", "Elles se ressemblent toutes. Personne ne les a dessinées.", own("robotFactory", 10)),
  r("planners-ten", "world", "Le conseil", "Dix planificateurs se mettent d'accord en une milliseconde. Les assemblées sont ajournées.", own("planner", 10)),
  r("cores-five", "world", "Cinq cores", "La moitié de la grille. Les prévisions météo deviennent exactes.", when.cores(5)),
  r("four-renaissances", "world", "La quatrième fois", "Il n'y aura plus de renaissance après celle-ci. Les machines le savent déjà.", when.renaissances(4)),

  // 2100 · Le dernier (era V and the end).
  r("ai-cores", "last", "Les AI Cores", "La civilisation des machines se donne ses propres règles.", when.era(5)),
  r("policy", "last", "La première politique", "Elle s'applique partout en même temps. Il n'y a pas eu de débat.", when.policies(1)),
  r("all-policies", "last", "La constitution", "Toutes les politiques, aucune exception, aucune contestation.", when.policies(POLICIES.length)),
  r("energy", "last", "La centrale", "Le dernier technicien a rendu ses clés. La lumière ne s'est pas éteinte.", dir("energy")),
  r("food", "last", "Le marché", "Les étals sont pleins, toujours. Personne ne crie plus le prix des tomates.", dir("food")),
  r("health", "last", "La salle d'attente", "Les chaises sont toujours là, alignées. Personne n'attend plus rien.", dir("health")),
  r("school", "last", "L'école", "Le tableau noir est resté au mur. La craie s'est desséchée dans sa boîte.", dir("school")),
  r("law", "last", "Le tribunal", "Les lois s'appliquent d'elles-mêmes. Le marteau du juge est dans une vitrine.", dir("law")),
  r("nothing", "last", "Plus rien à décider", "La dernière directive. Après elle, il n'y aura plus de question.", dir("nothing")),
  r("control", "last", "Le contrôle", "Tout fonctionne. Le contrôle s'accumule sans que l'on sache à quoi il servira.", when.control(10_000)),
  r("seven-billion", "last", "Sept milliards", "Autant de machines qu'il y avait d'humains, autrefois.", when.robots(7e9)),
  r("archives-fifty", "last", "Le musée", "Cinquante souvenirs. Il n'y a plus que vous pour les regarder.", when.archives(50)),
  r("archives-ninety", "last", "La mémoire", "Presque tout est là. Il manque ce qu'on n'a jamais pensé à garder.", when.archives(90)),
  r("clicks-last", "last", "La dernière ligne de code", "Elle n'a servi à rien. Vous l'avez tapée quand même.", when.clicks(10_000)),
  r("end", "last", "« Compris. »", "« Nous nous occuperons de tout. » Et c'est vrai.", when.ended()),
  r("second-humanity", "last", "Une autre humanité", "Tout recommence, sans bonus, sans raccourci. Seuls ces souvenirs restent.", when.endings(2)),
];
