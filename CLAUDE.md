# Catalogue de Noël en Pharmaco 2026

Site ludique de Noël d'une équipe hospitalière de pharmacotechnie. Quatre pages, appelées par le menu de l'en-tête :
le **catalogue** de jeux de société, le **sapin de l'Avent**, les **Pharmacogames** (concours individuel à points)
et le **palmarès** (vote de chacun pour son jeu préféré, avec hall of fame). Le dépôt est **public**.

## Règles de travail
- Répondre en français, sans tiret cadratin. Aller à l'essentiel, signaler erreurs et incertitudes sans complaisance.
- Demande ambiguë : poser une question au lieu de deviner. Modification : ne toucher qu'à ce qui est demandé.
- Vérifier le résultat avant de conclure (bancs d'essai, captures), et dire ce qui n'a pas pu être vérifié.
- Étayer les faits (questions du concours comprises) par une source vérifiable.
- Ton du site : humour de pharmacotechnie (flacons, dosage, lot, scellé, libération), jamais moqueur.
- Jeux : créations originales dans l'esprit arcade. Ne pas recopier un jeu existant (nom, personnages, niveaux, apparence).
- Pas de pull request sans demande explicite.

## Carte du dépôt
| Fichier | Rôle |
|---|---|
| `index.html` | Le catalogue et le sapin. C'est la copie de l'artefact claude.ai, qui reste la source de vérité : ne pas le modifier ici, sauf les lignes « propres au site » : l'icône de favori dans l'en-tête, et en fin de fichier les scripts `menu.js`, `badges.js`, `vote.js`, `enigme.js`. |
| `menu.js`, `img/menu-*.webp` | Menu à quatre boutons ronds : le logo de l'unité décliné par page. |
| `img/favicon*`, `img/apple-touch-icon.png`, `img/icone-*.png` | Icône de favori : le meeple sur son jeton. |
| `badges.js` | Habille les huit pastilles d'indication du catalogue (`#presets .chip`) en badges ronds, sans toucher à `index.html`. Sans ce fichier, les pastilles d'origine restent. |
| `vote.js`, `api/votes.js` | Palmarès : un vote par prénom, hall of fame des jeux. |
| `enigme.js`, `api/enigme.js` | Pharmacogames : 25 portes, une par jour du 1er au 25 décembre, ouvertes jusqu'à J+2. Le serveur décide de tout : dates (heure de Paris), chrono, tentatives, points, classement. |
| `api/_banque.js` | Les 25 portes, **chiffrées** : dix cases de cinq questions sur un thème (portes 2, 4, 7, 9, 12, 14, 17, 19, 22, 24) et quinze jeux d'adresse. Ne jamais écrire de question ni de réponse en clair dans le dépôt. |
| `jeux.js` | Les quatorze jeux d'adresse, chargés à la demande : bowling, tir (la hotte), flipper, tennis, labyrinthe, puis, chacun entre ses repères `Repère [nom]` / `Fin [nom]` : basket, penalty, volley, haies, etageres, pastilles, twirling, tour, seringue. Cœur du jeu séparé du dessin. |
| `outils/` | Outils de développement, non publiés sur le site (voir `.vercelignore`). |

Le stockage des votes et des parties est un magasin Vercel Blob privé. Les modules `vote.js` et `enigme.js` ne s'affichent que si leur serveur répond.

## Règles du concours (à ne pas casser)
- Question : l'énoncé ne sort du serveur qu'au lancement du chrono (30 ou 40 s), une seule tentative, réponse scellée.
- Case de cinq questions : elles s'enchaînent, chacune avec son chrono ; 2 points par question, 10 par case. QCM : 2 points. Dosage de 0 à 100 : 2 points à 2 près de la cible, 1 point à 10 près.
- Jeu d'adresse : `onFin(note, bilan, brut)` rend une note de 0 à 10 (affichée au joueur) et un score brut (classé par le serveur), deux tentatives, la meilleure compte. À la clôture, les points viennent du rang parmi ceux qui ont marqué : 10 au premier, 1 au dernier, répartition régulière, ex aequo à égalité ; sans rien marquer, 0.
- Solution, points et classement ne sortent qu'à la clôture de la porte.

## Secrets
Deux codes existent : le **code d'équipe** (donné aux joueurs) et le **code d'administration** (variable `ADMIN_CODE`,
clé de la banque et de l'atelier, mode relecture). Ils ne sont jamais écrits dans le dépôt : l'utilisateur les fournit.

## Outils
- `node outils/essai-jeux.js <dossier>` : joue une partie automatique du bowling, de la hotte et du flipper dans Chromium, avec captures. Le tennis et le labyrinthe ont leurs propres outils (`essai-tennis.js`, `etalon-tennis.js`, `essai-labyrinthe.js`, `etalon-labyrinthe.js`).
- `node outils/etalon.js ['{"elan":190}']` : simule des milliers de manches pour régler la difficulté (`REGL` dans `jeux.js`).
- `ADMIN_CODE=… node outils/atelier.js sortir` : ressort le dossier `atelier/` (ignoré par git), qui contient la fabrique
  de la banque, les bancs d'essai complets et les contrôles en ligne. Son `LISEZMOI.md` détaille chaque commande.
- `ADMIN_CODE=… node outils/banque.js chiffrer <banque.json>` : régénère `api/_banque.js`.
- Playwright et Chromium sont préinstallés dans les sessions cloud ; `npm install` fournit `@vercel/blob`.

## Organisation en sessions
Le travail est réparti pour garder chaque contexte léger. Chaque session reste dans son périmètre et sa branche ;
pour une demande qui en sort, elle indique la session concernée.

| Session | Périmètre | Branche |
|---|---|---|
| Jeu : Bowling des flacons | La partie bowling de `jeux.js` et ses réglages | `claude/jeu-bowling` |
| Jeu : La hotte en folie | La partie tir de `jeux.js` et ses réglages | `claude/jeu-hotte` |
| Jeu : Le flipper du préparatoire | La partie flipper de `jeux.js` et ses réglages | `claude/jeu-flipper` |
| Jeu : Le tennis de paillasse | La partie tennis de `jeux.js`, `outils/essai-tennis.js`, `outils/etalon-tennis.js` | `claude/jeu-tennis` |
| Jeu : Le labyrinthe de la ZAC | La partie labyrinthe de `jeux.js`, `outils/essai-labyrinthe.js`, `outils/etalon-labyrinthe.js` | `claude/jeu-labyrinthe` |
| Jeu : un par nouveau jeu (basket, penalty, volley, haies, étagères, pastilles, twirling, tour, seringue, minigolf) | Le bloc du jeu entre ses repères dans `jeux.js`, `outils/essai-<nom>.js`, `outils/etalon-<nom>.js` | `claude/jeu-<nom>` |
| Quiz | Les cases de cinq questions (dans l'atelier) | `claude/quiz` |
| Palmarès : hall of fame et résultats | Structure et contenu du hall of fame (`vote.js`) et du classement (`enigme.js`) | `claude/resultats` |
| Sapin, Catalogue | Le sapin de l'Avent, le catalogue (artefact, `index.html`) | `claude/sapin`, `claude/catalogue` |
| Design | Apparence : `menu.js`, `badges.js`, logos, blocs de styles de `enigme.js` et `vote.js`, habillage des jeux | `claude/design` |
| Organisation et orchestration | Serveur, banque, intégration des branches, bancs d'essai complets, publication, suivi | `claude/vibrant-edison-rs93fn` |

- La branche de publication est `claude/vibrant-edison-rs93fn`. Seule la session d'orchestration y fusionne et publie.
- Une session de jeu ou de design livre en poussant sa branche, puis prévient l'utilisateur : « à intégrer par l'orchestration ».
- Un nouveau jeu d'adresse : une nouvelle session sur le même modèle, avec sa branche.
- Interface des jeux à respecter : `PharmacoJeux.<nom>(element, { duree, onFin })` rend une fonction d'arrêt ; `onFin(note, bilan, brut)`, avec `brut` entier positif sous le plafond du jeu (`PLAFOND` dans `api/enigme.js`).
