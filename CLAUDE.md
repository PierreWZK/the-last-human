# THE LAST HUMAN : suivi de projet

> Fichier mis à jour à **la fin de chaque message** de l'assistant. Il sert de mémoire de travail : ce qui est fait, ce qui reste, et les pièges.

## Checklist

### Fait
- [x] Phases 1 à 4 bis : socle, scène, économie, événements, renaissance I, ère II, renaissance II, algorithmes, ère III (PR #1 à #6 fusionnées)
- [x] Phase 4 ter : améliorations de l'ère III, renaissance III, grille neuronale 3 × 3, ère IV (Robots, Autonomie) (PR #7 fusionnée)
- [x] Phase 5, code écrit : Prisma 7 + Better Auth (pseudo + mot de passe, email facultatif), API `/api/save` (révisions, appareil actif, « Reprendre ici »), client de synchronisation, onglet « Compte » (inscription, connexion, export/import), `/api/health`, Dockerfile avec migrations
- [x] Migration `prisma/migrations/0001_init` appliquée sur PGlite
- [x] Tests unitaires : 116 verts (dont 7 d'intégration sur PostgreSQL PGlite)
- [x] Tests E2E des phases 1 à 4 ter : 40 verts sur 4 largeurs
- [x] README et CAHIER-DES-CHARGES mis à jour pour la phase 5, `.env.example` ajouté

- [x] Succès (107) et archives (108) dans `src/content/milestones.ts`, conditions partagées dans `conditions.ts` (chaque entrée a sa phrase « comment l'obtenir »)
- [x] Page Succès (onglet dédié, par catégorie) et Archives (par époque, indices visibles tant que verrouillé)
- [x] Sections dépliables (`Section.tsx`, état dans localStorage)
- [x] Prix affiché sur chaque bouton d'achat ; filtre des améliorations (seulement abordables, bouton « afficher tout »)
- [x] « Cible des scripts d'achat » seulement si un script d'achat est possédé
- [x] Anti-triche : `isTrusted` (clic script ignoré), 20 clics/s côté store, plausibilité des clics côté serveur (422)
- [x] Fond animé (`Backdrop.tsx`) : racks clignotants sur les bords, robots qui volent, désactivé si mouvement réduit
- [x] Tests : 151 unitaires, E2E 70/70 (relance d'un test de compte, échec de timing sous charge)
- Limites connues : un invité peut modifier localStorage ; le classement reste réservé aux comptes.

### Mise en ligne (2026-11-06)
- PR #8 à #13 fusionnées dans `main` (phases 5 à 9, plus `public/robots.txt` pour le Dockerfile).
- En ligne : https://thelasthuman.projectp.fr (Coolify, suit `main`, déploiement par API avec `COOLIFY_URL` / `COOLIFY_TOKEN`).
- Coolify : projet `3yyirs89ghfas0kxefn1wdie`, application `93iarcbnw0pjl8w8dqc1i8id`, base PostgreSQL `9cncziz9dffgahqvtyrsvui1`. Variables en runtime seulement : `DATABASE_URL` (URL interne), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- Healthcheck : `/api/health` sur `127.0.0.1:3000`, délai de démarrage 30 s (`localhost` se résout en IPv6 dans l'image alpine : connexion refusée).
- Compte de test créé en production pendant la vérification : `smokeb39105d5` (à supprimer).
- Reste : validation des valeurs (3D, ère V, durée minimale 5 h), équilibrage (10 h au lieu de 40 à 60 h), Lighthouse, SEO du §18 (sitemap, OG, JSON-LD), vitrine 30days30projects, phase 10.

### Phases suivantes
- [ ] Phase 6 : gains hors ligne (24 h max, horloge serveur), récapitulatif
- [ ] Phase 7 : expérience mobile avancée, gestes, performances
- [ ] Phase 8 : thèmes des cinq ères, animations, 3D facultative, scène pour les ères II à IV
- [ ] Phase 9 : renaissance IV (AI Cores, politiques de civilisation), ère V, fin, classement
- [ ] Équilibrage des ères II à IV (le simulateur atteint l'ère IV à 8,5 h ; l'ère IV dépasse 7 milliards de robots)
- [x] Docker : image construite et déployée sur Coolify
- [ ] V2 : connexion Google et Discord

## Règles de travail (rappel de l'utilisateur)
- Travailler étape par étape, **ne jamais développer sur `main`**, une PR par phase.
- **Ne jamais fusionner une PR sans validation** de l'utilisateur.
- Tests complets **à la fin** de chaque phase, pas à chaque sous-étape.
- Ne jamais supprimer un fichier sans avoir vérifié qu'il ne contient rien d'utile.
- Commits et PR finissent par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` et `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Tout en français. Pas de bouton factice.
- Décisions de structure : demander avant de coder.

## Commandes utiles
```bash
npm test                      # unitaires + intégration (Vitest)
npx playwright test           # E2E sur 4 largeurs (lance scripts/e2e-server.mjs)
npm run sim                   # simulateur d'équilibrage (exit 0 = cibles atteintes)
npx tsc --noEmit -p .         # typage
node node_modules/eslint/bin/eslint.js src tests scripts   # lint
npm run db:dev                # base locale PGlite sur le port 5433 (à laisser ouverte)
npx prisma migrate deploy     # applique les migrations à la base locale
```

## État technique

### Architecture
- `src/game/` : moteur pur (engine, save, store, cloud, types). Pas de React.
- `src/content/` : données (bâtiments, améliorations, événements, algorithmes, neural, era1 à era4).
- `src/server/` : `auth.ts` (Better Auth), `db.ts` (Prisma), `saves.ts` (logique de sauvegarde, testée).
- `src/app/api/` : `auth/[...all]`, `save`, `save/claim`, `health`.
- `src/lib/` : `account.ts` (règles de pseudo et email, partagées), `auth-client.ts`.
- `src/components/` : `GameScreen.tsx`, `AccountPanel.tsx` (onglet Compte et bandeau « Reprendre ici »).
- `prisma/schema.prisma`, `prisma.config.ts`, migration `0001_init`.
- `src/generated/prisma` : généré, ignoré par git.

### Décisions de la phase 5
- Email facultatif : sans email, on stocke `pseudo@sans-email.thelasthuman.invalid`. Le serveur refuse qu'un autre pseudo utilise cette adresse.
- Sauvegarde : révision obligatoire (409 si dépassée), appareil actif (423 si un autre joue), 10 sauvegardes gardées, 256 Ko maximum.
- Au branchement : la partie locale monte si le compte est vide ou si elle descend de la dernière révision connue ; sinon la partie du serveur est chargée et la locale part en secours.
- Limite de requêtes Better Auth active : en test, chaque visiteur reçoit une IP via `x-forwarded-for`.
- Le client envoie toutes les 60 s et à la fermeture de l'onglet.

### Pièges rencontrés
- `prisma init` a créé des fichiers parasites (voir plus haut).
- `npm install` échoue sans `legacy-peer-deps` : d'où le fichier `.npmrc`.
- Prisma 7 : `env()` lève une erreur si la variable manque. La config lit `process.env` directement.
- Un identifiant d'amélioration en double a bloqué l'ère I sans erreur. Un test d'unicité existe.
- Une classe CSS `.grid` existait déjà et écrasait la mise en page de la grille neuronale (renommée `.coreGrid`).
- Le dossier de la base PGlite doit être à la racine (`.pglite/`), pas dans `.data/`.
- Les tests d'inscription en rafale tombent sur la limite de requêtes (429).
- PGlite ne sert qu'une session : en E2E, `maxConnections: 1` **et** `DATABASE_POOL_MAX=1` pour Prisma. Sinon `ConnectionClosed` (pool > 1) ou `bind message supplies…` (plusieurs connexions entremêlées).
- Les sauvegardes de test doivent être datées du moment du test, sinon le rattrapage hors ligne les fausse.
