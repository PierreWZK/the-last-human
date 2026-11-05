# THE LAST HUMAN — Cahier des charges

> Jour 22 du défi **30 jours, 30 projets** · Next.js · TypeScript · PostgreSQL · Coolify (`thelasthuman.projectp.fr`)

Ce document est le contrat du projet. On le suit phase par phase. Toute décision qui s'en écarte y est d'abord notée, puis validée. Les valeurs chiffrées de l'économie sont des **valeurs de départ** : le simulateur d'équilibrage les ajuste.

---

## 1. Vision

Un incremental game narratif qui raconte, en quelques dizaines d'heures, la disparition progressive du travail humain. Le joueur ne devient jamais une machine : il reste humain jusqu'au bout, et c'est lui le dernier.

Le jeu doit être :

- **Addictif** : une progression lisible, des paliers fréquents, une raison de revenir.
- **Contemplatif** : une narration discrète, une interface qui se vide à mesure que le monde se remplit de machines.
- **Premium** : une identité visuelle forte qui évolue à chaque ère, sans ressembler à un template ni à un dashboard.
- **Fiable** : une sauvegarde qu'on ne perd jamais, sur tous les appareils.

## 2. Objectifs

| Objectif | Mesure |
|---|---|
| Durée jusqu'à la fin | 40 à 60 h de jeu actif et passif (2 à 4 semaines de retours réguliers), vérifiée par le simulateur |
| Rythme | Un nouveau déblocage toutes les 2 à 5 minutes la première heure, puis jamais plus de 30 minutes sans nouveauté en jeu actif |
| Fiabilité | Aucune perte de progression lors d'une reconnexion, d'un changement d'appareil ou d'une mise à jour |
| Plateformes | Jouable sans zoomer sur un écran de 360 px de large comme sur un écran de 2560 px |
| Fin | Une conclusion définitive, sans boucle infinie |

## 3. Concept narratif

En 1990, le joueur est un humain ordinaire avec un ordinateur. Chaque achat, chaque automatisation retire un peu de travail humain au monde. La narration passe par :

- des **fragments** courts (une phrase, un mail, un message système) déclenchés par des seuils ;
- les **Human Archives**, une collection de souvenirs du monde « d'avant » à débloquer ;
- l'**interface elle-même**, qui change d'époque.

Le ton : sobre, parfois mélancolique, jamais moralisateur. Le jeu ne juge pas : il montre.

## 4. Les cinq ères

| Ère | Années | Ressources introduites | Mécanique nouvelle | Human Dependency visée en fin d'ère |
|---|---|---|---|---|
| I · The Digital Age | 1990–2005 | Argent, Données | Travail manuel, bâtiments, améliorations | 75 % |
| II · The Automation Age | 2005–2020 | Calcul | Automatisation : scripts qui achètent et récoltent à votre place | 40 % |
| III · The AI Revolution | 2020–2040 | Intelligence | Entraînement de modèles : des tâches longues qui consomment Données et Calcul | 5 % |
| IV · The Autonomous Age | 2040–2100 | Robots, Autonomie | Auto-réplication : les machines construisent les machines | ~0 % |
| V · The Last Human | 2100+ | Contrôle | Directives : le joueur ne produit plus, il décide | 0 % |

L'année affichée avance avec la progression, pas avec le temps réel.

### Ère I — The Digital Age

Le joueur tape du code à la main (action manuelle), monte une page perso, puis un forum, une boutique en ligne, un logiciel. Les visiteurs produisent des **Données**, qui servent à des améliorations (publicité ciblée, analytique) multipliant l'Argent. L'interface évoque un bureau d'ordinateur des années 1990, sans pastiche.

### Ère II — The Automation Age

Les scripts récoltent et achètent à la place du joueur, selon des règles qu'il configure. Serveurs, bases de données, cloud et datacenters produisent du **Calcul**. Les premiers robots industriels apparaissent. La Human Dependency chute nettement.

### Ère III — The AI Revolution

Le joueur entraîne des modèles : il réserve des Données et du Calcul pendant un temps réel donné, et obtient un modèle aux propriétés aléatoires encadrées. Les modèles et les agents produisent de l'**Intelligence**, qui rend les autres systèmes plus efficaces.

### Ère IV — The Autonomous Age

Les IA conçoivent des IA, les robots construisent des robots. La population de machines croît d'elle-même. L'**Autonomie** réduit le besoin d'actions du joueur. C'est l'ère de la sensation de puissance.

### Ère V — The Last Human

L'interface est presque vide. Le joueur donne quelques **directives**, payées en **Contrôle**. Objectif : 7 000 000 000 machines, 100 % d'automatisation, 0 % de travail humain. La fin se déclenche quand les trois conditions sont réunies.

## 5. Mécaniques de gameplay

### 5.1 Ressources

| Ressource | Ère | Produite par | Sert à |
|---|---|---|---|
| Argent | I | Travail manuel, bâtiments web | Acheter des bâtiments et des améliorations |
| Données | I | Visiteurs, utilisateurs | Améliorations, entraînement des modèles |
| Calcul | II | Serveurs, datacenters | Faire tourner les scripts, entraîner des modèles |
| Intelligence | III | Modèles, agents | Multiplier toutes les productions, débloquer l'autonomie |
| Robots | IV | Usines, auto-réplication | Compteur principal de la fin (objectif : 7 milliards) |
| Autonomie | IV | Agents autonomes | Réduire le coût en actions du joueur, auto-réplication |
| Contrôle | V | Accumulé avec l'automatisation totale | Payer les directives de la dernière ère |

Règle : une ressource n'apparaît à l'écran qu'au moment où elle devient utile. Aucune ressource n'existe seulement pour compliquer le jeu.

### 5.2 Production

Chaque bâtiment a un coût de base, une production de base, un facteur de croissance du coût, une part de travail humain (voir 5.7) et des améliorations dédiées.

- Coût du n-ième exemplaire : `coût_base × croissance^n`.
- Achat ×1, ×10 et « maximum », avec un coût total calculé en forme close (série géométrique).
- Paliers à 10, 25, 50, 100, 250, 500 et 1000 exemplaires : production ×2 (le fragment narratif arrive en phase 3).
- Réglages de l'ère I (`TUNING` dans `src/content/era1.ts`), choisis avec le simulateur : coûts des bâtiments ×2, croissance 1,2, coûts des améliorations et seuils de gains ×15.
- **Le clic est le seul moteur du début** (décision du 2026-11-05) : pas de revenu passif de départ, la première page personnelle s'achète en tapant du code.

Bâtiments de l'ère I : Page personnelle, Forum de discussion, Boutique en ligne, Logiciel shareware, Portail web, Serveur loué.

### 5.3 Améliorations

Achats uniques, chacun avec un nom, une courte description en français clair et un effet affiché en chiffres. Familles :

- **Multiplicateurs** : production ×2 d'un bâtiment.
- **Synergies** : un bâtiment booste un autre (par exemple les forums augmentent les Données de la boutique).
- **Réductions de coût**.
- **Règles** : changent le jeu (le travail manuel produit aussi des Données, les scripts achètent tout seuls).
- **Déblocages** : ouvrent une ressource, un bâtiment ou une mécanique.

### 5.4 Événements

Ils cassent la monotonie et portent la narration. Types :

| Type | Exemple | Effet |
|---|---|---|
| Opportunité (aléatoire, cliquable quelques secondes) | « Un client pressé » | Gain immédiat ou bonus de 30 s |
| Événement d'époque | Le bug de l'an 2000 (1999) | **Choix** : patcher maintenant (coût) ou parier (risque de panne) |
| Technologique | La bulle Internet (2000) | **Choix** : investir (×3 temporaire, risque de krach) ou rester prudent |
| Temporaire | Panne de serveur | Production réduite tant qu'elle n'est pas réparée |
| Narratif | Un ancien collègue écrit | Fragment pour les Human Archives |
| Seuil | Premier robot industriel | Déblocage et scène courte |

Au moins un tiers des événements proposent un vrai choix, avec des conséquences visibles. Aucun événement n'est une simple notification.

### 5.5 Renaissances (prestige)

Chaque fin d'ère se conclut par une renaissance, qui ouvre l'ère suivante.

| Renaissance | Monnaie gagnée | Ce qu'elle réinitialise | Ce qu'elle conserve | Ce qu'elle apporte de neuf |
|---|---|---|---|---|
| Révolution numérique (fin I) | **Knowledge** | Argent, Données, bâtiments, améliorations de l'ère I | Succès, Human Archives, Knowledge | Arbre de Knowledge (bonus permanents à choisir), accès à l'ère II |
| Automatisation (fin II) | **Algorithms** | Ère II et ce qui précède, sauf l'arbre de Knowledge | Arbre de Knowledge, Algorithms | Emplacements d'algorithmes : des modificateurs qui changent les règles |
| Révolution IA (fin III) | **Neural Cores** | Ères I à III, sauf les arbres | Knowledge, Algorithms | Grille neuronale : placer des cores, bonus de voisinage |
| Civilisation machine (fin IV) | **AI Cores** | Ères I à IV | Tout le méta-progrès | Politiques de civilisation, accès à l'ère V |
| The Last Human (fin V) | — | — | — | **Fin du jeu** |

- La monnaie gagnée croît comme la racine de la production totale de la partie, pour récompenser la progression sans forcer à aller trop loin.
- On peut refaire une renaissance déjà débloquée pour gagner davantage de sa monnaie (couche répétable).
- La première renaissance est accompagnée pas à pas : le joueur doit comprendre ce qu'il perd et ce qu'il gagne avant de confirmer.

Décisions de la phase 4 (2026-11-05) :

- Knowledge gagné = `floor(√gains totaux / 100)`, au moins 1 point. Valeur de départ, à régler.
- Arbre de Knowledge : un bonus à choisir par point dépensé (quatre bonus de départ, un achat chacun), pas d'arbre à prérequis.
- La renaissance I demande toutes les améliorations de l'ère I, et aucun événement ouvert. En ère II, elle n'est plus proposée : la renaissance II arrive en phase 4 bis.
- Scripts d'achat (option 1) : le joueur désigne une cible ; les scripts l'achètent dès qu'elle est abordable, au rythme d'une unité par seconde de jeu et par script (décision du 2026-11-05, prise après le simulateur). Les améliorations « vitesse » et « seuil » des scripts n'ont pas de sens avec cette règle : elles sont remplacées par deux bonus de collecte (Tâches planifiées, Scripts en parallèle).
- La scène ne dessine pas encore les bâtiments de l'ère II (prévu avec les thèmes d'ère, phase 8).

Décisions de la phase 4 bis (2026-11-05) :

- Renaissance II : toutes les améliorations de l'ère II achetées, aucun événement ouvert. Elle donne `floor(√gains totaux / 50)` points d'algorithme (au moins 1), remet à zéro tout ce qui précède l'ère III, et garde l'arbre de Knowledge et les algorithmes achetés.
- Algorithmes : huit modificateurs chiffrés, achetés avec des points (coûts 1 à 10, somme finie : tout est obtenable). Deux emplacements au départ, un de plus à chaque renaissance II.
- Intelligence : produite par les modèles entraînés et par l'agent autonome. Elle multiplie toute la production de 0,1 % par point.
- Entraînement : une séance à la fois, durée de jeu (deux minutes, réduite par l'algorithme « Entraînement rapide »), coût en Données et Calcul. La qualité du modèle (entre 0,5 et 2) est tirée dans la graine de la partie. Le temps réel arrivera avec la phase 6.
- Scripts : une unité par seconde de jeu et par script (règle fixée après le simulateur).
- Équilibrage : le simulateur atteint l'ère III à 7,5 h. L'économie de l'ère III est une valeur de départ, à régler.
- Améliorations de l'ère III : ajoutées en phase 4 ter.

Décisions de la phase 4 ter (2026-11-05, valeurs par défaut proposées dans la PR, à valider) :

- Renaissance III : toutes les améliorations de l'ère III (cinq) achetées, aucun événement ouvert. Elle donne `floor(√gains totaux / 200)` Neural Cores (au moins 1), remet à zéro les ères I à III (modèles compris), et garde Knowledge, algorithmes et grille neuronale.
- Grille neuronale : 3 × 3 cases. Trois cores (production +10 %, robots fabriqués par les usines +20 %, Autonomie +25 %), un Neural Core chacun ; retirer un core le rend, la disposition se change librement. Chaque voisin occupé (haut, bas, gauche, droite) augmente le bonus d'un core de moitié.
- Ère IV : Robots et Autonomie. Trois bâtiments (usine de robots, planificateur autonome, Gigafactory) et trois améliorations. Auto-réplication : chaque robot en fabrique 0,0001 par seconde, × (1 + log10(1 + Autonomie)). La grille ne multiplie pas la réplication, sinon la croissance explose.
- Autonomie : à partir de 1, les entraînements de modèles démarrent seuls (moins d'actions du joueur). L'entraînement reste disponible en ère IV.
- Renaissance IV, AI Cores et politiques de civilisation : rattachées à la phase 9, car elles ouvrent l'ère V et la fin du jeu.
- Équilibrage : le simulateur atteint l'ère IV à 8,5 h. L'ère III ne dure qu'une heure et l'ère IV produit bien plus de 7 milliards de robots : à régler avec l'ère V.

Décisions de la phase 5 (2026-11-05) :

- Pile : Prisma 7 (adaptateur `pg`), Better Auth 1.7 avec le plugin pseudo, PostgreSQL. En local et en test, PGlite remplace PostgreSQL (aucune installation système).
- Email facultatif : Better Auth exige un email. Sans email, on stocke `pseudo@sans-email.thelasthuman.invalid` (domaine réservé, jamais de courrier) ; le serveur refuse qu'un autre pseudo l'utilise, et l'interface ne l'affiche pas.
- Sauvegarde cloud : `GET/PUT /api/save`, révision obligatoire (409 si dépassée), appareil actif (423 sinon), « Reprendre ici » via `POST /api/save/claim`, 10 dernières sauvegardes gardées, 256 Ko maximum, validation par le même `deserialize` que le client.
- Au branchement d'un compte : la partie locale est envoyée si le compte n'a pas de sauvegarde (reprise de la partie invitée) ou si elle descend de la dernière révision connue de cet appareil ; sinon la partie du serveur est chargée et la locale gardée dans l'emplacement de secours.
- Export et import en texte dans l'onglet « Compte ». La vérification des gains impossibles par l'horloge serveur arrive avec la phase 6.

Décisions de la phase 6 (2026-11-05) :

- L'absence est rejouée par pas de 10 s de jeu (`src/game/offline.ts`) : scripts, entraînements et événements avancent comme en jeu. Plafond de 24 h, récapitulatif au-delà d'une minute.
- Joueur connecté : le serveur renvoie `offlineMs` (horloge du serveur depuis la dernière sauvegarde acceptée, `lastSeenAt`). « Reprendre ici » ne remet pas `lastSeenAt` à zéro.
- Gains impossibles : entre deux sauvegardes, le temps de jeu ne peut pas avancer plus vite que l'horloge du serveur (+5 % et 2 min de marge). Sinon 422, et le client propose de recharger la partie du serveur. Importer une sauvegarde plus avancée que celle du serveur est refusé pour la même raison.
- Invité : horloge locale en UTC, rien si elle recule, `performance.now()` pendant la session. Un onglet ralenti en arrière-plan rattrape son retard de la même façon.

Décisions de la phase 7 (2026-11-05) :

- Téléphones (moins de 600 px) : barre d'onglets fixée en bas, ressources épinglées en haut, événements en feuille au-dessus de la barre, balayage horizontal pour changer d'onglet.
- Tablettes (600 à 899 px) : deux colonnes, ressources à gauche, onglet choisi à droite (« Produire » montre les achats).
- Desktop : sur un bâtiment sélectionné au clavier, 1, 2 et 3 achètent ×1, ×10 et le maximum.
- Les cinq onglets restent (Produire, Acheter, Améliorer, Archives, Compte) : « Acheter » est trop utilisé pour passer sous « Produire ».

Décisions de la phase 8 (2026-11-05, à valider) :

- Thèmes d'ère par `data-era` sur `<html>` : I ambre phosphore (monospace), II vert technique, III bleu-violet, IV blanc sur noir avec un accent rouge, V clair et serif, presque vide. Contrastes AA.
- Scènes : II une allée de datacenter (une baie par bâtiment, scripts qui circulent, bras robot), III un réseau de neurones (un nœud par modèle, barre d'entraînement), IV et V la Terre qui se couvre de machines jusqu'à 7 milliards (échelle logarithmique), avec en V une seule personne debout.
- **3D** : pas de three.js pour l'instant. La Terre est dessinée en 2D, c'est le repli prévu au §13, toujours disponible. Ajouter three.js (environ 600 Ko) reste possible si vous le validez.
- Animations : chiffre qui rebondit à l'achat, transition d'ère plein écran (3 s, sans bloquer les clics), feuilles qui montent. Tout est coupé par `prefers-reduced-motion`.

### 5.6 Succès

Catégories : progression, production, découverte, renaissance, collection (Human Archives), narration, défis (par exemple « finir l'ère I sans cliquer après la 10e minute »). Chaque succès donne +1 % de production globale. Quelques-uns débloquent un élément cosmétique (thème de terminal, son de démarrage).

### 5.7 Human Dependency

La part du travail mondial encore faite par un humain.

- Chaque bâtiment a une **part humaine**. Une page perso est faite à 100 % à la main ; un script, à 0 %.
- Human Dependency = part humaine moyenne, pondérée par la production.
- Les améliorations d'automatisation réduisent la part humaine des bâtiments existants.

Effets :

1. **Progression** : chaque renaissance exige un seuil maximal de Human Dependency (75 %, 40 %, 5 %, 0 %).
2. **Gameplay** : la puissance du travail manuel suit la Human Dependency. Plus le monde s'automatise, moins le clic compte et plus le joueur doit penser en systèmes.
3. **Narration** : fragments et Human Archives se débloquent par paliers de Human Dependency (90 %, 75 %, 50 %, 25 %, 10 %). Implémenté en phase 3 : cinq paliers, plus le fragment « 1900, une nuit sans incident » débloqué par l'an 2000. Les paliers 1 % et 0 % restent à décider.
4. **Interface** : moins il y a de travail humain, plus l'interface s'épure.

Une jauge permanente affiche « Part du travail encore faite par des humains : X % ». Formule retenue en phase 3 : chaque bâtiment pèse (nombre possédé × production de base), et sa part humaine vaut 100, 80, 60, 40, 15 ou 2 % selon le bâtiment. Sans bâtiment, la valeur est 100 %. Le travail manuel est toujours entièrement humain et n'entre pas dans la formule.

### 5.8 Human Archives

Une collection de souvenirs (un métier disparu, une photo de bureau, un objet). Ils se débloquent par la Human Dependency, les événements et les succès. Ils sont consultables à tout moment et conservés pour toujours, y compris après la fin.

## 6. Progression hors ligne

- La production continue quand le joueur est absent, **plafonnée à 24 h**.
- Au retour, un récapitulatif indique la durée d'absence, les ressources produites et les paliers atteints, puis le joueur récupère ses gains.
- Les tâches longues (entraînements de modèles) continuent pendant l'absence.

**Joueur connecté.** Le temps écoulé se mesure sur l'**horloge du serveur** (`lastSeenAt` en base), jamais sur celle du navigateur. Le serveur refuse une sauvegarde dont les gains dépassent la production maximale possible pendant le temps écoulé côté serveur, avec une marge. Les changements d'heure et de fuseau n'ont aucun effet : tout est en UTC.

**Invité.** Le temps se mesure sur l'horloge locale, avec des garde-fous : si l'heure locale recule, aucun gain ; plafond de 24 h ; `performance.now()` pendant la session. La protection est limitée, et c'est assumé : un invité n'apparaît pas au classement.

## 7. Comptes

**V1.**

- Inscription : pseudo obligatoire et unique (3 à 20 caractères, lettres, chiffres, `_` et `-`, insensible à la casse), mot de passe (8 caractères minimum, haché, jamais stocké en clair), email facultatif.
- Connexion : pseudo ou email, plus le mot de passe.
- Sans email, un mot de passe oublié n'est pas récupérable. Un avertissement le dit clairement à l'inscription.
- Mode invité : on joue sans compte, sauvegarde locale. Créer un compte reprend la partie en cours.

**V2.** Connexion Google et Discord, liaison de comptes.

## 8. Synchronisation et sauvegardes

- **Format** : document JSON avec `schemaVersion`. Les grands nombres sont sérialisés en chaînes.
- **Migrations** : une fonction par version, testée, appliquée au chargement (en local comme côté serveur).
- **Sauvegarde automatique** : locale toutes les 10 s et à la fermeture de l'onglet ; serveur toutes les 60 s et à la fermeture.
- **Révision** : chaque sauvegarde serveur porte un compteur. Une sauvegarde partie d'une révision dépassée est refusée et signalée, jamais écrasée en silence.
- **Un seul appareil actif** : l'appareil qui joue détient la session de jeu. Ouvrir le jeu ailleurs propose « Reprendre ici », et l'ancien appareil passe en lecture seule.
- **Récupération** : le serveur conserve les 10 dernières sauvegardes. Export et import d'une sauvegarde en texte depuis les paramètres.
- **Validation serveur** : schéma strict, taille maximale, cohérence (pas de ressource négative, pas de gain impossible).

## 9. Fin du jeu et classement

### Séquence finale

Quand les conditions de l'ère V sont réunies, une séquence scénarisée se lance. L'interface est presque vide, avec un dialogue lent :

> IA : « Tous les besoins humains sont satisfaits. Tous les systèmes sont opérationnels. Aucune intervention supplémentaire n'est nécessaire. »
> IA : « Y a-t-il autre chose que vous souhaiteriez que nous fassions ? »
> JOUEUR : « Non. »
> IA : « Compris. Nous nous occuperons de tout. »

Suit un écran final : le parcours (dates des cinq ères, choix marquants), les statistiques de la civilisation, et le temps qu'il a fallu pour en arriver là.

### Après la fin

- La partie devient une **archive figée** : écran final, statistiques et Human Archives consultables. Plus aucune production.
- Un seul bouton : **« Nouvelle humanité »**, une nouvelle partie de zéro, sans aucun bonus. Ce n'est pas un New Game+.

### Classement

Public, réservé aux comptes.

- **Plus rapide** : le temps réel écoulé entre le début d'une humanité et sa fin, mesuré par le serveur.
- **Le plus de fins** : le nombre d'humanités terminées.
- Le profil affiche la meilleure durée, le nombre de fins et la date de la première fin.
- Anti-triche : une durée plus courte que le minimum théorique calculé par le simulateur est rejetée.
- Possibilité de se masquer du classement depuis le profil (à confirmer en phase 9).

## 10. Interface et responsive

**Desktop.** Trois zones : ressources et Human Dependency (en haut), production et achats (au centre), événements et narration (sur le côté). Raccourcis clavier pour les achats ×1, ×10 et max.

**Mobile.** Pensé d'abord pour le pouce :

- barre d'onglets en bas (Produire, Améliorer, Archives, Profil), sans menu caché pour l'essentiel ;
- cibles tactiles de 44 px minimum ;
- ressources épinglées en haut, compactes ;
- événements en feuille qui monte du bas ;
- jouable d'une main, sans zoom, de 360 px à 430 px de large ;
- tablettes : disposition intermédiaire à deux colonnes.

Les deux mises en page peuvent différer : on ne réduit pas le desktop.

**Accessibilité.** Contrastes AA, navigation clavier complète, focus visible, `prefers-reduced-motion` respecté, chiffres lisibles par les lecteurs d'écran sans annonce à chaque tick.

## 11. Direction artistique

L'interface raconte l'époque :

| Ère | Ambiance |
|---|---|
| I | Informatique des années 1990 : fenêtres, pixels discrets, bruit de modem, beige et phosphore. Évoqué, pas pastiché. |
| II | Tableaux de bord techniques, racks, grilles, typographie plus nette. |
| III | Visualisations de données, réseaux neuronaux, mouvement plus fluide. |
| IV | Abstraction, échelle, densité, sensation de puissance. |
| V | Minimalisme, beaucoup de vide, calme. Presque rien à l'écran. |

À éviter : rendu SaaS générique, gradients partout, animations gratuites, composants incohérents. La direction précise (typographies, palette, détails) est choisie en début de phase 1, entre deux propositions.

## 12. Animations

- Elles donnent du retour (achat, palier, gain), jamais de la décoration.
- Compteurs fluides sans re-rendu React à chaque frame.
- Transitions d'ère scénarisées.
- Transformations et opacité uniquement (composition GPU).
- Tout est désactivable via `prefers-reduced-motion`.

## 13. 3D

Uniquement là où elle apporte quelque chose :

- **Ère IV–V** : une Terre où l'on voit la densité de machines croître jusqu'à 7 milliards.
- **Ère II** : éventuellement, un datacenter vu en isométrique.
- **Séquence finale**.

three.js est chargé à la demande, avec une qualité adaptée à l'appareil. Le repli 2D est automatique si WebGL est absent ou si l'image descend sous 30 images par seconde. Le jeu reste entièrement jouable sans 3D.

## 14. Architecture technique

- **Next.js (App Router) + TypeScript strict**, une seule application. Le backend passe par des Route Handlers.
- **Moteur (`src/game/`)** : TypeScript pur, déterministe, sans dépendance à React ni au navigateur.
  - Fonction `tick(état, dt)`, actions pures (`acheter`, `améliorer`, `renaître`…).
  - Contenus décrits comme des données dans `src/content/`.
- **Store** : le moteur tourne sur une boucle à pas fixe (10 ticks/s). L'interface s'abonne avec `useSyncExternalStore` et lit l'état 4 à 10 fois par seconde. Un onglet en arrière-plan rattrape le temps à son retour.
- **Grands nombres** : `break_infinity.js` pour toutes les ressources. Le formatage est en français (« 1,23 million », puis notation scientifique au-delà d'un seuil réglable).
- **Base** : PostgreSQL + Prisma. Tables `User`, `Session`, `Account` (Better Auth), `Save` (révision, données, `lastSeenAt`), `SaveSnapshot`, `Run` (début, fin, durée), `Leaderboard` en vue.
- **Authentification** : Better Auth, plugin pseudo, sessions en cookie `httpOnly`. Point à vérifier en phase 5 : comment gérer l'email facultatif avec ce schéma.
- **i18n** : `next-intl` sans routage par langue en V1. Tous les textes sont dans `src/i18n/fr`. Nombres et dates passent par `Intl`.
- **Styles** : CSS Modules + variables CSS, thème par ère via `data-era` sur `<html>`.
- **Simulateur** : `scripts/sim` joue la partie avec une stratégie raisonnable et mesure le temps jusqu'à chaque palier. Il échoue si une cible de rythme est ratée.

## 15. Sécurité

- Mots de passe hachés (scrypt ou argon2, via Better Auth). Aucun secret côté client.
- Limitation des tentatives de connexion et d'inscription.
- Cookies `httpOnly`, `Secure` et `SameSite=Lax`, protection CSRF des routes qui modifient.
- Chaque route de sauvegarde vérifie que la sauvegarde appartient à l'utilisateur de la session.
- Validation stricte des sauvegardes (schéma, taille, cohérence, plausibilité temporelle).
- En-têtes de sécurité (CSP, `X-Content-Type-Options`, `Referrer-Policy`).
- Audit avec les skills Security en phases 5 et 10.

## 16. Performances

- Aucun calcul économique dans le rendu React.
- Coûts d'achat multiples en forme close.
- Pas de fuite mémoire après 8 h de session : les journaux d'événements ont une taille bornée.
- Lighthouse mobile : Performance ≥ 85, Accessibilité ≥ 95.
- Bundle initial sans three.js ni `motion` si non utilisés à l'écran.

## 17. Tests

| Type | Outil | Couvre |
|---|---|---|
| Unitaires | Vitest | Tick, coûts, achats (jamais de ressource négative), améliorations, Human Dependency, renaissances |
| Économie | Vitest + simulateur | Rythme de progression, durée totale, monotonie de la croissance |
| Sauvegardes | Vitest | Sérialisation, migrations de chaque version, rejet des sauvegardes invalides |
| Hors ligne | Vitest | Plafond de 24 h, horloge qui recule, changement de fuseau |
| Intégration | Vitest + PostgreSQL de test | Routes de sauvegarde, révisions, isolation entre joueurs |
| Authentification | Vitest + Playwright | Inscription, connexion pseudo et email, pseudo déjà pris, limitation des tentatives |
| E2E | Playwright | Parcours de l'ère I, rechargement sans perte, deux appareils, desktop et mobile (360, 390, 768, 1440 px) |

## 18. Déploiement

- Dockerfile multi-étapes, Next.js en `output: standalone`, utilisateur non root.
- Coolify : application (Dockerfile) + PostgreSQL dans un projet dédié « The Last Human ». Domaine `thelasthuman.projectp.fr`.
- Variables en runtime : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- Migrations Prisma au démarrage, puis healthcheck sur `/api/health`.
- Indexation et aperçu de lien : `robots.txt`, `sitemap.xml`, canonical, JSON-LD `WebApplication` rattaché à ProjectP, image Open Graph 1200 × 630, lien « 30 jours, 30 projets » dans le pied de page.
- La mise à jour de la vitrine `30days30projects` se fait après validation.

## 19. Roadmap

Une branche et une Pull Request vers `main` par phase. Pas de fusion sans validation, et pas de phase suivante avant la fusion de la précédente.

| Phase | Branche | Contenu | Critères d'acceptation |
|---|---|---|---|
| 0 | `main` (docs) | Audit, choix techniques, README, cahier des charges, repo | ✅ Validé le 2026-11-05 |
| 1 | `feat/v1-playable` | Socle Next.js, moteur, ère I (travail manuel, 6 bâtiments, ~20 améliorations, premier événement), sauvegarde locale versionnée, responsive, direction visuelle « Le Poste », Dockerfile | ✅ Fusionné (PR #1) |
| 1 bis | `feat/living-scene` | Scène pixel art 2D : le personnage tape au clic, chaque bâtiment apparaît dans la pièce | ✅ Fusionné (PR #2) |
| 2 | `feat/game-economy` | Données, synergies, paliers, achats multiples, simulateur, équilibrage de l'ère I | Simulateur : rythme de la première heure (2 à 5 min) et ère I entre 6 et 10 h. La règle « 30 min sans nouveauté » est reportée à la phase 3 (décision du 2026-11-05) |
| 3 | `feat/game-events` | Événements à choix, Human Dependency, Human Archives, succès | Un tiers des événements à choix, jauge active, archives consultables, et le simulateur ne dépasse jamais 30 min sans nouveauté en jeu actif |
| 4 | `feat/prestige-system` | Renaissance I (Knowledge, arbre de bonus au choix, un bonus par point), ère II (Calcul, 6 bâtiments, 10 améliorations, scripts d'achat à cible unique) | Renaissance accompagnée en deux temps ; le simulateur atteint l'ère II sans dépasser 30 min sans nouveauté. Découpage décidé le 2026-11-05 |
| 4 bis | `feat/prestige-advanced` | Renaissance II (algorithmes en modificateurs chiffrés, deux emplacements plus un par renaissance II), ère III (Intelligence, entraînement de modèles en durée de jeu, trois bâtiments) | Tous les algorithmes obtenables par la progression ; le simulateur atteint l'ère III sans dépasser 30 min sans nouveauté |
| 4 ter | `feat/prestige-final` | Améliorations de l'ère III, renaissance III (Neural Cores), grille neuronale, ère IV (Robots, Autonomie, auto-réplication). Renaissance IV et politiques de civilisation déplacées en phase 9 | Le simulateur atteint l'ère IV |
| 5 | `feat/user-auth` (une seule PR, comptes et sauvegarde cloud) | Comptes pseudo ou email, sauvegarde cloud, révisions, appareil actif, reprise de la partie invitée | Changer d'appareil sans perte ; impossible de lire la sauvegarde d'un autre |
| 6 | `feat/offline-progress` | Gains hors ligne sur horloge serveur, récapitulatif | Jamais plus de 24 h ; manipuler l'horloge ne rapporte rien. ✅ Code écrit |
| 7 | `feat/mobile-ui` | Expérience mobile avancée, gestes, performances | Tests Playwright sur 4 tailles ; Lighthouse mobile dans les cibles. ✅ Code écrit (Lighthouse non mesuré) |
| 8 | `feat/visual-polish` | Thèmes des cinq ères, animations, 3D et repli | 3D facultative, repli 2D testé, 30 images/s minimum sur mobile milieu de gamme. ✅ Code écrit (2D seule, 3D à valider) |
| 9 | `feat/final-ending` | Renaissance IV (AI Cores, politiques de civilisation), ère V, séquence finale, écran final, archive figée, « Nouvelle humanité », classement | Fin définitive ; classement alimenté par le serveur |
| 10 | `chore/stabilize` | Audit de sécurité, tests complets, performances, déploiement Coolify, docs finales | En ligne, tous les tests verts, docs à jour |
| V2 | — | Google, Discord, anglais | — |

## 20. Critères d'acceptation globaux

- [ ] Le jeu se termine, avec une séquence finale et un écran de statistiques.
- [ ] Aucune perte de progression lors d'une reconnexion, d'un changement d'appareil ou d'une mise à jour du format.
- [ ] Les gains hors ligne ne dépassent jamais 24 h.
- [ ] Aucun achat ne crée de ressource négative.
- [ ] Un joueur ne peut ni lire ni écrire la sauvegarde d'un autre.
- [ ] Jouable sans zoom sur mobile, au clavier sur desktop.
- [ ] Aucun bouton factice : ce qui n'existe pas encore est marqué « en développement ».
- [ ] Tous les textes passent par le système de traduction.
- [ ] Les tests (unitaires, simulateur, e2e) et le build passent avant chaque PR.
