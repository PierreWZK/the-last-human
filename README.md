# THE LAST HUMAN

> Jour 22 du défi **30 jours, 30 projets** · Next.js · TypeScript · PostgreSQL · ⏳ **En développement**

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
| Ère I jouable (production, achats, améliorations) | ⏳ Phase 1 |
| Sauvegarde locale versionnée | ⏳ Phase 1 |
| Économie longue, multiplicateurs, déblocages | ⏳ Phase 2 |
| Événements, Human Dependency, Human Archives, succès | ⏳ Phase 3 |
| Renaissances (Knowledge, Algorithms, Neural Cores, AI Cores) | ⏳ Phase 4 |
| Comptes (pseudo ou email + mot de passe), sauvegarde cloud | ⏳ Phase 5 |
| Gains hors ligne (24 h maximum, horloge serveur) | ⏳ Phase 6 |
| Expérience mobile avancée | ⏳ Phase 7 |
| Direction artistique par ère, 3D | ⏳ Phase 8 |
| Fin du jeu et classement | ⏳ Phase 9 |
| Connexion Google et Discord | ⏳ V2 |

## Stack technique

| Domaine | Choix |
|---|---|
| Framework | Next.js (App Router), TypeScript strict |
| Moteur de jeu | TypeScript pur dans `src/game/`, sans React, testé seul |
| Grands nombres | `break_infinity.js` |
| État de l'interface | Store maison exposé par `useSyncExternalStore` |
| Base de données | PostgreSQL + Prisma |
| Authentification | Better Auth (pseudo ou email + mot de passe) |
| Textes et formats | `next-intl` (français en V1), `Intl` pour les nombres et les dates |
| Styles | CSS Modules + variables CSS, un thème par ère |
| Animations | CSS, `motion` seulement si nécessaire |
| 3D | three.js chargé à la demande, avec repli 2D |
| Tests | Vitest (moteur, économie, sauvegardes), Playwright (parcours, mobile) |
| Déploiement | Docker (`output: standalone`) sur Coolify |

## Prérequis

- Node.js 22 ou plus, npm 10 ou plus
- PostgreSQL 16 ou plus, à partir de la phase 5 (comptes et sauvegarde cloud)

## Installation locale

> Le code arrive avec la phase 1. Les commandes ci-dessous sont celles qui seront en place.

```bash
npm install
cp .env.example .env
npm run dev                  # http://localhost:3000
```

## Variables d'environnement

| Variable | Rôle | Dès la phase |
|---|---|---|
| `DATABASE_URL` | Connexion PostgreSQL | 5 |
| `BETTER_AUTH_SECRET` | Secret de signature des sessions (32 octets aléatoires ou plus) | 5 |
| `BETTER_AUTH_URL` | URL publique du site (obligatoire derrière Coolify) | 5 |

Le fichier `.env` n'est jamais versionné. La liste complète sera dans `.env.example`.

## Commandes

```bash
npm run dev          # développement
npm test             # tests unitaires (Vitest)
npm run test:e2e     # parcours complets (Playwright, desktop et mobile)
npm run sim          # simulateur d'équilibrage : joue la partie en accéléré, sans interface
npm run build        # build de production
npm start            # lance le build
```

## Déploiement sur Coolify

1. Ressource **Application** depuis le dépôt GitHub, build pack **Dockerfile**.
2. Ressource **PostgreSQL** dans le même projet Coolify, puis renseigner `DATABASE_URL` avec l'adresse interne.
3. Variables de runtime : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://thelasthuman.projectp.fr`. Ne pas mettre `NODE_ENV=production` en variable de build, sinon `npm ci` n'installe pas les outils de build.
4. Domaine : `https://thelasthuman.projectp.fr`.
5. Les migrations Prisma s'appliquent au démarrage du conteneur.

## Architecture générale

```
src/
  game/        moteur pur : état, tick, économie, contenus, sauvegarde, migrations
  content/     données du jeu : bâtiments, améliorations, événements, textes narratifs
  app/         routes Next.js (pages et API)
  ui/          composants React, thèmes par ère
  i18n/        messages (fr) et formats
  server/      auth, accès base, validation des sauvegardes
tests/         Vitest (moteur) et Playwright (e2e)
scripts/sim/   simulateur d'équilibrage
```

Trois principes :

- **Le moteur ne connaît pas React.** L'interface lit l'état du moteur et lui envoie des actions, c'est tout.
- **Le serveur fait foi pour le temps.** Les gains hors ligne se calculent sur l'horloge du serveur, jamais sur celle du navigateur.
- **Les contenus sont des données.** Ajouter un bâtiment ou un événement ne demande pas d'écrire du code.

## Contribuer

- Pas de développement sur `main` : une branche par phase (`feat/...`) et une Pull Request vers `main`.
- Avant chaque PR : `npm test`, `npm run test:e2e` et `npm run build` doivent passer, avec le simulateur dans les cibles du cahier des charges.
- Aucun texte écrit en dur dans les composants : tout passe par `src/i18n`.
- Toute modification du format de sauvegarde incrémente `schemaVersion` et ajoute une migration testée.
