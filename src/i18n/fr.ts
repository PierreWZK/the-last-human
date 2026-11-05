/** Tous les textes de l'interface. Ajouter l'anglais = un second fichier de même forme. */
export const fr = {
  title: "THE LAST HUMAN",
  era: "Ère I · The Digital Age",
  years: "1990–2005",
  notice: "Notice",
  tabs: { produce: "Produire", buy: "Acheter", upgrade: "Améliorer" },
  windows: {
    resources: "Ressources",
    manual: "Travail manuel",
    buildings: "Achats",
    upgrades: "Améliorations",
  },
  resources: {
    money: "Argent",
    data: "Données",
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
  },
  upgrades: {
    buy: "Acheter",
    requires: "Demande : {requirement}",
    manual: "Travail manuel",
    all: "Toute la production",
    empty: "Toutes les améliorations sont installées.",
    requirementOwned: "{count} × {building}",
    requirementTotal: "{amount} gagnés au total",
  },
  event: {
    y2kTitle: "Le bug de l'an 2000",
    y2kText:
      "Les vieux programmes lisent l'année sur deux chiffres. À minuit, les dates vont revenir en 1900. Corriger coûte cher ; ne rien faire, c'est ralentir toute la production le temps que ça dure.",
    patch: "Corriger · {amount}",
    ignore: "Ignorer · production ÷ 2 pendant 2 min",
    patched: "Corrigé. Les systèmes ont passé la nuit sans incident.",
    ignored: "Ignoré. Le ralentissement dure deux minutes de jeu.",
    slowdown: "Ralentissement en cours",
  },
  footer: "Tout se sauvegarde dans ce navigateur. Les gains hors ligne arriveront avec les comptes.",
} as const;

/** Remplace {clé} par sa valeur. */
export function t(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? `{${key}}`));
}
