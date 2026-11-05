/** Tous les textes de l'interface. Ajouter l'anglais = un second fichier de même forme. */
export const fr = {
  title: "THE LAST HUMAN",
  era: "Ère I · The Digital Age",
  years: "1990–2005",
  eras: {
    1: { name: "Ère I · The Digital Age", years: "1990–2005" },
    2: { name: "Ère II · The Automation Age", years: "2005–2020" },
    3: { name: "Ère III · The AI Revolution", years: "2020–2040" },
  },
  scripts: {
    label: "Cible des scripts d'achat",
    none: "Aucune",
    hint: "Chaque script achète la cible dès qu'elle est abordable.",
  },
  notice: "Notice",
  tabs: { produce: "Produire", buy: "Acheter", upgrade: "Améliorer", archives: "Archives" },
  windows: {
    resources: "Ressources",
    manual: "Travail manuel",
    buildings: "Achats",
    upgrades: "Améliorations",
  },
  resources: {
    money: "Argent",
    data: "Données",
    compute: "Calcul",
    perSecond: "par seconde",
    totalMoney: "Gains au total",
  },
  manual: {
    button: "Taper du code",
    gain: "+{amount} par clic",
    hint: "Le clic est votre seul travail pour l'instant.",
  },
  buildings: {
    owned: "possédé(s)",
    perUnit: "{amount} / s chacun",
    buy1: "×1",
    buy10: "×10",
    buyMax: "Max",
    nextMilestone: "Palier suivant : {count} exemplaires (production ×2)",
    lastMilestone: "Tous les paliers atteints",
  },
  upgrades: {
    buy: "Acheter",
    requires: "Demande : {requirement}",
    manual: "Travail manuel",
    all: "Toute la production",
    synergy: "Synergie : {source} → {building}",
    empty: "Toutes les améliorations sont installées.",
    requirementOwned: "{count} × {building}",
    requirementTotal: "{amount} gagnés au total",
  },
  event: {
    chosen: "Votre choix : {label}",
    y2kTitle: "Le bug de l'an 2000",
    y2kText:
      "Les vieux programmes lisent l'année sur deux chiffres. À minuit, les dates vont revenir en 1900. Corriger coûte cher ; ne rien faire, c'est ralentir toute la production le temps que ça dure.",
    patch: "Corriger · {amount}",
    ignore: "Ignorer · production ÷ 2 pendant 2 min",
    patched: "Corrigé. Les systèmes ont passé la nuit sans incident.",
    ignored: "Ignoré. Le ralentissement dure deux minutes de jeu.",
    slowdown: "Ralentissement en cours",
  },
  human: {
    gauge: "Part du travail encore faite par des humains : {percent} %",
  },
  archives: {
    title: "Archives humaines",
    count: "{count} / {total} fragments retrouvés",
    locked: "Fragment verrouillé",
  },
  achievements: {
    title: "Succès",
    count: "{count} / {total} débloqués",
    locked: "Succès verrouillé",
    bonus: "Chaque succès ajoute 1 % à toute la production et au clic.",
  },
  renaissance: {
    title: "Renaissance",
    locked: "Terminez toutes les améliorations de l'ère I pour ouvrir la renaissance.",
    start: "Préparer la renaissance",
    explainTitle: "Ce que vous perdez et ce que vous gagnez",
    lose: "Perdu : argent, données, bâtiments et améliorations de l'ère I. Le gain total repart de zéro.",
    keep: "Gardé : succès, Human Archives, bonus de Knowledge.",
    gain: "Gagné : {points} point(s) de Knowledge, à dépenser dans l'arbre, et l'accès à l'ère II.",
    confirm: "Confirmer la renaissance",
    cancel: "Annuler",
    count: "Renaissances : {count}",
  },
  knowledge: {
    title: "Arbre de Knowledge",
    points: "Points disponibles : {points}",
    cost: "{cost} point(s)",
    buy: "Acquérir",
    owned: "Acquis",
    empty: "Une renaissance donne des points à dépenser ici.",
  },
  scene: {
    label:
      "Votre bureau en 1990 : vous tapez du code devant un écran cathodique. Chaque achat apparaît dans la pièce. Touchez la scène pour taper du code.",
  },
  footer: "Tout se sauvegarde dans ce navigateur. Les gains hors ligne arriveront avec les comptes.",
} as const;

/** Remplace {clé} par sa valeur. */
export function t(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}
