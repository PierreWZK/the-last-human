# THE LAST HUMAN

> Jour 22 du défi **30 jours, 30 projets** · Next.js · TypeScript · PostgreSQL · ✅ **En ligne** : [thelasthuman.projectp.fr](https://thelasthuman.projectp.fr)

Un jeu incremental narratif, jouable dans le navigateur, sur PC comme sur téléphone.

Vous commencez en 1990, seul devant un ordinateur beige et une connexion qui grésille. Vous finirez en 2100 et quelques, à la tête de 7 milliards de robots et d'intelligences artificielles qui font tout le travail du monde. Il ne reste alors qu'un seul humain : vous.

📄 Le document de référence est le [cahier des charges](CAHIER-DES-CHARGES.md).

## Concept

- **Cinq ères** : The Digital Age, The Automation Age, The AI Revolution, The Autonomous Age, The Last Human.
- **Une économie qui change avec l'époque** : l'argent, puis les données, le calcul, l'intelligence, les robots, l'autonomie, le contrôle.
- **Human Dependency** : la part du travail encore faite par un humain. Elle passe de 100 % à 0 %, et le jeu change avec elle.
- **Des renaissances** qui ouvrent chaque nouvelle ère et transforment la façon de jouer.
- **Une vraie fin**, scénarisée et définitive, suivie d'un classement.

## Fonctionnalités

Légende : ✅ fait · 🚧 en cours · ⏳ prévu.

| Fonctionnalité | État |
|---|---|
| Ère I jouable (clic, 6 bâtiments, 22 améliorations, événement du bug de l'an 2000) | ✅ Phase 1 |
| Sauvegarde locale versionnée (v7), migrations testées, refus des données illisibles | ✅ Phase 1 |
| Scène pixel art : le personnage tape au clic, chaque bâtiment apparaît dans la pièce | ✅ Phase 1 bis |
| Économie longue, paliers, synergies, simulateur d'équilibrage | ✅ Phase 2 |
| Événements à choix (aléatoires à graine), Human Dependency, 8 Human Archives, 7 succès | ✅ Phase 3 |
| Renaissance I (Knowledge, 4 bonus), ère II (Calcul, 6 bâtiments, scripts d'achat) | ✅ Phase 4 |
| Renaissance II (Algorithmes, emplacements), ère III (Intelligence, entraînement de modèles) | ✅ Phase 4 bis |
| Renaissance III (Neural Cores, grille neuronale 3 × 3), ère IV (Robots, Autonomie, auto-réplication) | ✅ Phase 4 ter |
| Comptes (pseudo ou email + mot de passe), sauvegarde cloud, appareil actif, « Reprendre ici », export/import | ✅ Phase 5 |
| Gains hors ligne (24 h maximum, horloge du serveur), récapitulatif au retour, refus des gains impossibles | ✅ Phase 6 |
| Mobile : onglets en bas, ressources épinglées, balayage entre onglets ; tablette en deux colonnes ; raccourcis clavier | ✅ Phase 7 |
| Un thème par ère, scènes des ères II à V (datacenter, réseau de neurones, Terre couverte de machines), transitions | ✅ Phase 8 (3D en repli 2D) |
| Renaissance IV (AI Cores, politiques de civilisation), ère V (Contrôle, directives) | ✅ Phase 9 |
| Fin scénarisée, écran final, archive figée, « Nouvelle humanité », classement public et profil masquable | ✅ Phase 9 |
| Équilibrage complet (40 à 60 h visées, 10 h aujourd'hui), audit de sécurité, Lighthouse | ⏳ Phase 10 |
| Connexion Google et Discord, anglais | ⏳ V2 |

## Stack technique

| Domaine | Choix |
|---|---|
| Framework | Next.js (App Router), TypeScript strict |
| Moteur de jeu | TypeScript pur dans `src/game/`, sans React, testé seul |
| Grands nombres | `break_infinity.js` |
| État de l'interface | Store maison exposé par `useSyncExternalStore` |
| Base de données | PostgreSQL + Prisma |
| Authentification | Better Auth (pseudo ou email + mot de passe) |
| Textes | Un module `src/i18n/fr.ts` (français), même forme pour l'anglais en V2 |
| Styles | CSS Modules + variables CSS (`globals.css`), un thème par ère, direction « Le Poste » en ère I |
| Animations | CSS, `motion` seulement si nécessaire |
| Scènes | Canvas 2D en pixel art, une scène par ère ; la Terre de l'ère IV est le repli 2D du globe 3D prévu |
| Tests | Vitest (moteur, économie, sauvegardes, hors ligne, intégration PostgreSQL), Playwright (parcours, comptes, fin, 4 largeurs) |
| Déploiement | Docker (`output: standalone`) sur Coolify |

## Prérequis

- Node.js 22 ou plus, npm 10 ou plus
- PostgreSQL 16 ou plus en production. En local et en test, PGlite le remplace (aucune installation).

## Installation locale

Sans PostgreSQL installé, la base locale est PGlite (PostgreSQL en WebAssembly, installé par npm) :

```bash
npm install
cp .env.example .env         # puis remplir BETTER_AUTH_SECRET
npm run db:dev               # base locale sur le port 5433, à laisser ouverte
npx prisma migrate deploy    # dans un second terminal
npm run dev                  # http://localhost:3000
```

Le jeu reste jouable sans compte et sans base : seuls l'onglet « Compte » et la sauvegarde cloud en ont besoin.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `BETTER_AUTH_SECRET` | Secret de signature des sessions (32 octets aléatoires ou plus) |
| `BETTER_AUTH_URL` | URL publique du site (obligatoire derrière Coolify) |
| `DATABASE_POOL_MAX` | Facultatif : taille du pool Prisma (`1` pour la base PGlite des tests) |

Le fichier `.env` n'est jamais versionné. Modèle : `.env.example`.

## Commandes

```bash
npm run dev          # développement
npm test             # tests unitaires du moteur et des sauvegardes (Vitest)
npm run test:e2e     # parcours complets sur 4 largeurs (Playwright : 360, 390, 768, 1440 px)
npm run sim          # simulateur d'équilibrage : joue la partie jusqu'à la fin et vérifie le rythme
npm run build        # build de production
npm start            # lance le build
NEXT_OUTPUT=standalone npm run build   # build pour l'image Docker
```

## Déploiement sur Coolify

1. Ressource **Application** depuis le dépôt GitHub, build pack **Dockerfile**.
2. Ressource **PostgreSQL** dans le même projet Coolify, puis renseigner `DATABASE_URL` avec l'adresse interne.
3. Variables de runtime : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://thelasthuman.projectp.fr`. Ne pas mettre `NODE_ENV=production` en variable de build, sinon `npm ci` n'installe pas les outils de build.
4. Domaine : `https://thelasthuman.projectp.fr`.
5. Healthcheck : `GET /api/health` sur l'hôte `127.0.0.1`, port 3000, délai de démarrage 30 s. Avec `localhost`, l'image alpine passe par IPv6 et la connexion est refusée.
6. Les migrations Prisma s'appliquent au démarrage du conteneur. L'application suit `main` : chaque fusion redéploie.

## Architecture générale

```
src/
  game/        moteur pur (engine, types, save, store, offline, cloud, décimaux) + tests Vitest
  content/     données : bâtiments, améliorations, événements, ères I à V, algorithmes, grille, politiques
  server/      Better Auth, Prisma, sauvegardes cloud, classement (+ tests d'intégration PGlite)
  app/         page, layout, favicon et routes API (auth, save, leaderboard, profile, health)
  components/  interface de jeu (GameScreen, Scene, AccountPanel, EndingScreen, Leaderboard)
  scene/       scènes Canvas : modèle pur (testé), pièce de l'ère I, scènes des ères II à V
  lib/         règles de compte partagées, client d'authentification
  i18n/        textes en français
prisma/        schéma et migrations
scripts/       simulateur d'équilibrage, serveur des tests E2E
tests/e2e/     parcours Playwright
```

Trois principes :

- **Le moteur ne connaît pas React.** L'interface lit l'état du moteur et lui envoie des actions, c'est tout.
- **Le serveur fait foi pour le temps.** Les gains hors ligne se calculent sur l'horloge du serveur, jamais sur celle du navigateur.
- **Les contenus sont des données.** Ajouter un bâtiment ou un événement ne demande pas d'écrire du code.

## Contribuer

- Pas de développement sur `main` : une branche par phase (`feat/...`) et une Pull Request vers `main`.
- Avant chaque PR : `npm test`, `npm run test:e2e` et `npm run build` doivent passer.
- Aucun texte écrit en dur dans les composants : tout passe par `src/i18n/fr.ts`.
- Toute modification du format de sauvegarde incrémente `schemaVersion` et ajoute une migration testée.
