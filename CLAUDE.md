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

### Reste à faire (phase 5)
- [ ] **Tests E2E de compte** : `tests/e2e/account.spec.ts`. Le test « second appareil » échoue (5 échecs sur 4 largeurs). Cause probable : PGlite ne gère qu'une connexion à la fois. `scripts/e2e-server.mjs` et `package.json` (`db:dev`) passent à `maxConnections: 1` : **à relancer pour vérifier**.
- [ ] **Commit et PR** : rien n'est commité. La branche `feat/user-auth` existe localement. Le commit a été interrompu.
- [ ] **Fichiers parasites** de `prisma init` à la racine : `.agents/`, `.claude/`, `.windsurf/`, `skills-lock.json`. Leur suppression a été refusée par l'outil. **Ne pas les commiter**. À supprimer à la main ou à valider.
- [ ] **Validation utilisateur** de la phase 5 (test manuel), puis fusion de la PR. Ne jamais fusionner sans accord.

### Phases suivantes
- [ ] Phase 6 : gains hors ligne (24 h max, horloge serveur), récapitulatif
- [ ] Phase 7 : expérience mobile avancée, gestes, performances
- [ ] Phase 8 : thèmes des cinq ères, animations, 3D facultative, scène pour les ères II à IV
- [ ] Phase 9 : renaissance IV (AI Cores, politiques de civilisation), ère V, fin, classement
- [ ] Équilibrage des ères II à IV (le simulateur atteint l'ère IV à 8,5 h ; l'ère IV dépasse 7 milliards de robots)
- [ ] Docker : image jamais testée (pas de Docker en local)
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
