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
| `menu.js`, `img/menu-*.webp` | Menu à quatre boutons ronds (le logo de l'unité décliné par page), plus une cinquième pastille « Pharmacomeeple » en tête de page (`.pm-haut`, vers `#pharmacomeeple`). Les pancartes des pages pas encore ouvertes (champ `pancarte` de `PAGES` : « En quarantaine », « En attente de libération », « Jury sous hotte ») sont datées (champ `ouvre`, heure de Paris ; sans date, elles restent jusqu'à leur retrait) : simple affichage, la barrière reste le serveur. |
| `img/favicon*`, `img/apple-touch-icon.png`, `img/icone-*.png` | Icône de favori : le meeple sur son jeton. |
| `badges.js` | Habille les huit pastilles d'indication du catalogue (`#presets .chip`) en badges ronds, sans toucher à `index.html`. Sans ce fichier, les pastilles d'origine restent. |
| `vote.js`, `api/votes.js` | Palmarès : un vote par prénom, hall of fame des jeux. |
| `enigme.js`, `api/enigme.js` | Pharmacogames : 25 portes, une par jour du 1er au 25 décembre, ouvertes jusqu'à J+2. Le serveur décide de tout : dates (heure de Paris), chrono, tentatives, points, classement. |
| `participants.js` | Fiche d'identification des Pharmacogames, chargée à la demande par `enigme.js` : nom choisi dans la liste des participants (ou saisie libre), pseudo, avatar (meeple à composer), brigade tirée par le serveur parmi cinq, d'abord sans nom (« Brigade 1 » à « Brigade 5 »). Chaque membre vote le nom (trente propositions ou texte libre, modéré par l'administration avec `effacerTitre`), l'emblème (trente), la devise et le jeu emblème de sa brigade jusqu'au 10 décembre (`CHOIX_FIN` dans `api/enigme.js`), sans doublon de nom ni d'emblème entre brigades. L'identification ouvre le 26 novembre (`FICHE_JOUR`), avant le calendrier ; adresse directe `#pharmacomeeple`. Les longueurs de ses listes restent accordées avec `AVATAR`, `NB_BRIGADES`, `NB_DEVISES` et `NB_EMBLEMES` de `api/enigme.js`. La liste des participants n'est jamais dans le dépôt : elle vit dans le magasin Blob (`participants.json`), chargée par l'administration, et ne sort du serveur qu'avec le code d'équipe. |
| `enquete.js` | L'enquête des brigades, chargée à la demande par `enigme.js` (section `#egEnquete`) dès qu'une étape d'amorce est acquise au joueur. Amorce les 1er, 2 et 3 décembre (une étape sort quand le joueur a lancé la porte du jour, ou à sa clôture), une énigme par jour du 4 au 24, trois énigmes de dénouement le 25 ; ouvertes jusqu'à J+2. Chaque membre dépose une seule réponse, définitive, sans retour sur sa justesse ; à la clôture, la réponse majoritaire de la brigade est retenue (égalité ou erreur : pas de point), et la révélation sort dans tous les cas. 30 points par brigade (champ `enq` des brigades, ajouté à la moyenne dans `tot`), rien au classement individuel. Le fichier ne contient aucun texte de l'enquête (ni titre, ni nom de fiche, ni énoncé, ni solution) : tout vient de la banque chiffrée (`enquete`) et le serveur ne l'envoie qu'à l'étape qui le dévoile. Ne jamais écrire ces textes en clair dans le dépôt. Enquête à tirage (en chantier, le scénario écrit restant en réserve) : si la banque porte un `reservoir`, le serveur tire une graine le 1er décembre, la garde dans le magasin (`enquete-tirage.json`) et compose trio coupable, éliminations et indices ; la relecture montre le réservoir, jamais le tirage. Banc du bloc : `node outils/essai-enquete.js`. |
| `api/_banque.js` | Les 25 portes, **chiffrées** : dix cases de cinq questions sur un thème (portes 2, 4, 7, 9, 12, 14, 17, 19, 22, 24), quatorze portes de jeu d'adresse et la finale du 25, à deux jeux (hotte puis badminton). Ne jamais écrire de question ni de réponse en clair dans le dépôt. |
| `jeux.js` | Les seize jeux d'adresse, chargés à la demande : bowling, tir (la hotte), flipper, tennis, labyrinthe, puis, chacun entre ses repères `Repère [nom]` / `Fin [nom]` : basket, penalty, volley, haies, etageres, pastilles, twirling, tour, seringue, minigolf, badminton. Cœur du jeu séparé du dessin. |
| `outils/` | Outils de développement, non publiés sur le site (voir `.vercelignore`). |

Le stockage des votes et des parties est un magasin Vercel Blob privé. Les modules `vote.js` et `enigme.js` ne s'affichent que si leur serveur répond.

## Règles du concours (à ne pas casser)
- Question : l'énoncé ne sort du serveur qu'au lancement du chrono (30 ou 40 s), une seule tentative, réponse scellée.
- Case de cinq questions : elles s'enchaînent, chacune avec son chrono ; 2 points par question, 10 par case. QCM : 2 points. Dosage de 0 à 100 : 2 points à 2 près de la cible, 1 point à 10 près.
- Jeu d'adresse : `onFin(note, bilan, brut)` rend une note de 0 à 10 (affichée au joueur) et un score brut (classé par le serveur), deux tentatives, la meilleure compte. À la clôture, les points viennent du rang parmi ceux qui ont marqué : 10 au premier, 1 au dernier, répartition régulière, ex aequo à égalité ; sans rien marquer, 0.
- Finale du 25 (type `duo`) : deux jeux dans la même porte, joués dans l'ordre, deux tentatives chacun ; chaque jeu est classé à part (10 au premier, 1 au dernier) et la porte vaut leur somme, 20 points au plus.
- Avant tout lancement (jeu ou question), la page rappelle les essais restants et demande une validation (`avertir` dans `enigme.js`).
- Solution, points et classement ne sortent qu'à la clôture de la porte.
- Le sapin d'abord : une porte ne se lance que si le joueur a ouvert la goutte du même jour dans le sapin. Le sapin retient ses gouttes dans le navigateur ; `enigme.js` les déclare au serveur (action `sapin`), qui les garde par joueur et refuse sinon le lancement (403 `sapin`). La page dit alors : « Un mystère t'attend d'abord auprès du sapin ».
- Les portes dans l'ordre : parmi les portes encore ouvertes, une porte ne se lance que si les plus anciennes ont été lancées (403 `ordre`), même pour un joueur qui commence tard. Une porte déjà lancée n'est plus verrouillée. Les bancs généraux coupent ces deux verrous (`handler.sansVerrou`) ; ils ont leurs bancs dans l'atelier (`test-verrou.js`, `test-enquete-page.js`).

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
| Jeu : un par nouveau jeu (basket, penalty, volley, haies, étagères, pastilles, twirling, tour, seringue, minigolf, badminton) | Le bloc du jeu entre ses repères dans `jeux.js`, `outils/essai-<nom>.js`, `outils/etalon-<nom>.js` | `claude/jeu-<nom>` |
| Quiz | Les cases de cinq questions (dans l'atelier) | `claude/quiz` |
| Palmarès : hall of fame et résultats | Structure et contenu du hall of fame (`vote.js`) et du classement (`enigme.js`) | `claude/resultats` |
| Participants | Identification, avatars, brigades : `participants.js`, partie identification de `enigme.js`, champs joueur de `api/enigme.js` | `claude/participants` |
| Enquête | Le bloc de l'enquête des brigades (`enquete.js`, `outils/essai-enquete.js`) et son scénario (dans l'atelier) | `claude/enquete` |
| Sapin, Catalogue | Le sapin de l'Avent, le catalogue (artefact, `index.html`) | `claude/sapin`, `claude/catalogue` |
| Design | Apparence : `menu.js`, `badges.js`, logos, blocs de styles de `enigme.js` et `vote.js`, habillage des jeux | `claude/design` |
| Organisation et orchestration | Serveur, banque, intégration des branches, bancs d'essai complets, publication, suivi | `claude/vibrant-edison-rs93fn` |

- La branche de publication est `claude/vibrant-edison-rs93fn`. Seule la session d'orchestration y fusionne et publie.
- Une session de jeu ou de design livre en poussant sa branche, puis prévient l'utilisateur : « à intégrer par l'orchestration ».
- Un nouveau jeu d'adresse : une nouvelle session sur le même modèle, avec sa branche.
- Tableau final commun (fin de `jeux.js`, hors des blocs de jeux, géré par l'orchestration) : après chaque partie, la note s'affiche au cœur du logo de l'unité avec les chiffres de la partie, puis `onFin` est transmis. Un jeu peut fournir ses chiffres en quatrième argument : `onFin(note, bilan, brut, [[valeur, libellé], …])`, quatre au plus. Un jeu qui dessine lui-même ce tableau est inscrit dans `SANS_TABLEAU` (le twirling).
- Interface des jeux à respecter : `PharmacoJeux.<nom>(element, { duree, onFin })` rend une fonction d'arrêt ; `onFin(note, bilan, brut)`, avec `brut` entier positif sous le plafond du jeu (`PLAFOND` dans `api/enigme.js`).
