# Gouttes vides du sapin : textes validés par le pharmacien (24 novembre)

État vérifié sur la branche publiée : gouttes vides **9 (mer.), 12 (sam.), 16 (mer.), 18 (ven.), 22 (mar.), 24 (jeu.), 25 (ven.)**.
Déjà présents : chanson, BD + cygne, booster, origami fleur, 10 tickets à gratter, 4 origamis animaux. Rien ci-dessous ne refait ces genres.
Tous les textes sont des créations originales : il n'y a aucun fait à sourcer.

---

## 1. Goutte 9 : boîte de médicament parodique « LUDOMYCINE 500 mg »
- **Principe** : la boîte et sa notice, pour un « médicament » qui serait le jeu de société.
- **Le joueur** : lit, et touche l'image pour l'agrandir.
- **Fichier** : `img/affiche-ludomycine.svg` (5 ko). Type `image` existant, aucun code.
- **Vérification** : je n'ai trouvé aucun médicament de ce nom (recherche web rapide, sans résultat ; sources consultées : HAS, Vidal, base publique des médicaments).
- **Texte** :
  > **LUDOMYCINE 500 mg**, comprimés à partager. Boîte de 2 à 6 joueurs.
  > **Composition** : un plateau, des pions, une règle. Excipient à effet notoire : la mauvaise foi.
  > **Indications** : grisaille de décembre, soirées sans écran, cousins qui s'ennuient.
  > **Posologie** : une partie le soir, à renouveler tant que tout le monde est d'accord. Ne pas dépasser « une dernière ».
  > **Contre-indications** : joueur qui lit la règle à voix haute pendant quarante minutes.
  > **Effets indésirables** : très fréquents : fous rires, « c'est pas juste ! ». Fréquents : demande de revanche. Rares : plateau renversé.
  > **Conservation** : à l'abri du chat (voir le 8 décembre).
  > Lot DEC-2026, libéré par la Pharmacotechnie.

## 2. Goutte 12 (samedi) : coloriage « par numéro de lot » du logo de l'unité
- **Principe** : le logo de la Pharmacotechnie, tracé à partir de `img/logo-pharmacotechnie.webp` (un grand P et une gerbe de gouttes). Il compte 29 zones numérotées de 1 à 4 : 1 violet #26076D, 2 orange #EC7739, 3 jaune #ECD567, 4 rose #E5B4D9. Les 13 gouttes trop petites pour le doigt sont déjà en couleur (`data-fixe`). Colorié selon les numéros, il redonne exactement le logo.
- **Le joueur** : touche un flacon de couleur, puis une zone. Quand toutes les zones portent la bonne couleur, un tampon « LOT LIBÉRÉ » apparaît (`img/tampon-libere.svg`). Un bouton permet d'imprimer la version vierge.
- **Fichier** : `img/coloriage-logo.svg` (18 ko). Chaque zone est un `<path data-lot="n">` ; les numéros sont dans un `<g pointer-events="none">`. Pour rendre les zones cliquables, le SVG doit être inséré dans la page (fetch puis innerHTML), pas affiché en `<img>`.
- **Nouveau type** `coloriage`, environ 50 lignes, par la session Sapin.
- **Texte** : « Coloriage par numéro de lot. Chaque lot a sa couleur : touchez un flacon de couleur, puis une zone portant le même numéro. Le lot est libéré quand tout est conforme. »

## 3. Goutte 16 : devinettes sous scellé
- **Principe** : quatre devinettes sur les objets du jeu. La réponse est cachée sous un scellé.
- **Le joueur** : devine, puis touche « Lever le scellé ».
- **À fabriquer** : un nouveau type `devinette`, environ 20 lignes, par la session Sapin. Les textes ci-dessous.
- **Textes** :
  1. « On me plie en quatre, on me déplie à chaque partie, tout le monde me marche dessus et personne ne s'excuse. » → *Le plateau de jeu.*
  2. « J'ai six faces mais je ne regarde personne ; on me secoue, on me supplie, et je n'en fais qu'à ma tête. » → *Le dé.*
  3. « Une seule personne me lit, toutes les autres me contestent. » → *La règle du jeu.*
  4. « Tous les ans, on me cherche sous le canapé, et on ne me trouve qu'au printemps. » → *Le pion manquant.*

## 4. Goutte 18 (vendredi) : mini-test « Bilan de conformité : quel joueur êtes-vous ? »
- **Principe** : quatre questions et trois profils, sur le ton du bilan de libération.
- **Le joueur** : touche une réponse par question, puis lit son profil. Un bouton permet de recommencer.
- **À fabriquer** : un nouveau type `test`, environ 50 lignes, par la session Sapin. Les textes ci-dessous.
- **Questions** (A, B ou C) :
  1. La règle du jeu : A. Je la lis en entier avant d'ouvrir la boîte. B. On la lira si on bloque. C. Quelle règle ?
  2. Vous perdez : A. Je recompte les points, deux fois. B. Revanche, tout de suite. C. Je testais une stratégie, c'est tout.
  3. Le dé roule sous le meuble : A. On relance, c'est le protocole. B. Je plonge le chercher. C. Il est tombé sur six, j'en suis sûr.
  4. Fin de soirée : A. Je range chaque pièce dans son sachet étiqueté. B. « Allez, une dernière ! » C. J'ai déjà sorti un autre jeu.
- **Profils** (en cas d'égalité, le premier dans l'ordre A, B, C) :
  - **Majorité de A, le Double Contrôle** : vous êtes l'assurance qualité de la tablée. Aucune partie n'est libérée sans votre vérification. Effet secondaire : on vous confie toujours le carnet des scores.
  - **Majorité de B, la Perfusion continue** : avec vous, le débit ne s'arrête jamais. Aucune soirée ne finit tant qu'il reste une revanche à proposer.
  - **Majorité de C, le Lot expérimental** : vous inventez une règle maison à chaque tour. Personne ne sait où vous allez, vous non plus, et c'est pour ça qu'on vous invite.

## 5. Goutte 22 : avis de recherche du pion rouge
- **Principe** : une affiche « Avis de recherche » de western, pour un pion perdu.
- **Le joueur** : lit, et touche l'image pour l'agrandir.
- **Fichier** : `img/affiche-avis-de-recherche.svg` (3 ko). Type `image` existant, aucun code.
- **Texte** :
  > **AVIS DE RECHERCHE.** Pion rouge, dit « le Petit Rouge ».
  > **Signalement** : 2 cm, tête ronde, socle large, regard fixe.
  > **Vu pour la dernière fois** le 24 décembre vers 23 h, au bord de la table, juste avant que quelqu'un crie « J'ai gagné ! ».
  > **Pistes** : sous le canapé, dans la poche d'un cousin, dans la boîte d'un autre jeu.
  > **Récompense** : une partie sans finir dernier.
  > Tout renseignement est à transmettre au service des pièces non conformes de la Pharmacotechnie.

## 6. Goutte 24 (temps fort) : l'ordonnance de Noël
- **Principe** : une ordonnance tirée au hasard dans le catalogue du site. Elle prescrit un jeu dans chacune des quatre catégories (enfant, famille, initié, expert), avec la couverture du jeu et sa notice « effet secondaire » déjà écrite (champ `nt`).
- **Le joueur** : lit son ordonnance, et touche « Renouveler l'ordonnance » pour un nouveau tirage, ou un jeu pour l'ouvrir dans le catalogue.
- **À fabriquer** : un nouveau type `ordonnance`, environ 30 lignes, par la session Sapin. Il utilise le tableau `G` et les couvertures déjà présentes : zéro image nouvelle.
- **Texte d'en-tête** : « Ordonnance de Noël. Docteur Père Noël, service de pharmacotechnie ludique. Traitement à suivre pendant les fêtes, en famille ou entre amis. À renouveler sans modération. »

## 7. Goutte 25 (Noël) : certificat de libération du lot de Noël, à partager
- **Principe** : une carte de vœux de l'unité. Un tampon « LIBÉRÉ » vient s'y poser en animation, et un bouton permet d'envoyer la carte.
- **Le joueur** : regarde, puis touche « Envoyer la carte » (partage du téléphone, ou copie du lien du sapin). Cela cohabite avec une éventuelle vidéo de l'enquête.
- **Fichiers** : `img/certificat-noel.svg` (la carte sans tampon) et `img/tampon-libere.svg` (le tampon, à faire tomber en animation sur la carte). Un petit type `voeux`, environ 25 lignes (tampon animé et partage par `navigator.share`, ou copie du lien `#sapin` à défaut), par la session Sapin. En repli : `img/certificat-noel-tamponne.svg` en type `image`, aucun code.
- **Texte** :
  > **Certificat de libération, lot de Noël 2026.**
  > Contrôles effectués : bonne humeur conforme ; fous rires dans les normes ; aucune défaite sans revanche ; parties terminées à une heure raisonnable : non conforme, dérogation accordée.
  > Décision : **lot libéré** pour consommation immédiate, sans modération.
  > Joyeux Noël, de toute l'équipe de Pharmacotechnie.

---

## Propositions de rechange
- **R1. Bulletin d'analyse d'une partie** (type `image`, aucun code). Un tableau Paramètre / Résultat / Norme. Par exemple : durée annoncée sur la boîte 30 min, durée réelle 2 h 40, norme « toujours dépassée » ; nombre de relectures de la règle 7, norme ≤ 1 ; joueurs vexés 1, norme « tolérance : un par soirée ».
- **R2. Mots mêlés du joueur** (nouveau type `motsmeles`, environ 60 lignes, ou image à imprimer). Mots à trouver : PLATEAU, PION, DÉ, CARTE, MEEPLE, SABLIER, JETON, RÈGLE.
- **R3. Horoscope du joueur** (type `image`, ou une petite liste). Douze signes, une prédiction chacun. Par exemple, Bélier : « Vous foncerez sur la première case libre ; Mercure conseille de lire la règle avant. »

## Écartées
- **Blagues d'animaux** (renard, hibou, manchot…) : il y a déjà quatre origamis animaux, je les garderais pour une autre année.
- **Recette de collation** : elle demanderait des faits à sourcer et s'éloigne du jeu.
- **Souvenir de l'année du catalogue** : je n'ai pas de données fiables à citer.
