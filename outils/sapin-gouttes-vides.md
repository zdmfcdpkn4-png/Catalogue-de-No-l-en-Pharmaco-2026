# Gouttes vides du sapin : textes validés par le pharmacien (24 novembre)

État vérifié sur la branche publiée : gouttes vides **9 (mer.), 12 (sam.), 16 (mer.), 18 (ven.), 22 (mar.), 24 (jeu.), 25 (ven.)**.
Déjà présents : chanson, BD + cygne, booster, origami fleur, 10 tickets à gratter, 4 origamis animaux. Rien ci-dessous ne refait ces genres.
Tous les textes sont des créations originales : il n'y a aucun fait à sourcer.

---

## 1. Goutte 9 : boîte de médicament parodique « LUDOMYCINE 500 mg » (version réaliste, validée le 24/11)
- **Principe** : une boîte en relief (braille sur le dessus, code-barres « 3 400 PION 2026 », code carré, triangle d'avertissement), une plaquette de comprimés et la notice pliée.
- **Le joueur** : lit, et touche l'image pour l'agrandir.
- **Fichier** : `img/affiche-ludomycine.svg` (19 ko). Type `image` existant, aucun code. Tout le texte est dans l'image (voir `aria-label`).
- **Vérification** : je n'ai trouvé aucun médicament de ce nom (recherche web rapide, non exhaustive).
- **Boîte** : LUDOMYCINE 500 mg. Comprimés pelliculés de bonne humeur. À partager · voie orale (surtout pour râler). Boîte de 2 à 6 joueurs · dès 8 ans. Médicament à prescription familiale facultative. Lot DEC-2026 · EXP : jusqu'à la prochaine dispute. Sur le côté : « Lire attentivement la règle avant utilisation. Ne pas conduire la partie si vous êtes mauvais perdant. »
- **Notice** : Composition : principe actif : ludothérapine, 500 mg ; excipients : un plateau, 84 pions (dont 3 sous le canapé), une règle de 24 pages ; excipient à effet notoire : la mauvaise foi. Indications : grisaille de décembre, repas de famille qui s'éternisent, cousin qui a ressorti son téléphone. Posologie : une partie le soir ; chez le sujet âgé (Tonton), réduire la durée des explications ; ne jamais dépasser « une dernière », sauf si vous êtes en train de gagner. Mode d'administration : autour d'une table, avec des chips ; ne pas avaler les dés. Contre-indications : allergie connue à la défaite ; joueur qui lit la règle à voix haute pendant quarante minutes. Interactions : association déconseillée avec le téléphone portable et avec le cousin qui « connaît une variante ». Effets indésirables : très fréquents (plus d'un joueur sur dix) : fous rires, « c'est pas juste ! » ; fréquents : demande de revanche, alliance trahie ; rares : plateau renversé ; très rares : quelqu'un range la boîte correctement. Surdosage : au-delà de quatre heures de partie, aérer la pièce et commander des pizzas. Conservation : à l'abri du chat (voir le 8 décembre) et des petits frères. Titulaire : Laboratoires de Pharmacotechnie ludique, lot DEC-2026.

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

## 5. Goutte 22 : avis de recherche du pion rouge (version réaliste, validée le 24/11)
- **Principe** : une affiche de western clouée sur des planches, en papier vieilli, avec le pion rouge photographié devant une toise d'identité (N° PR-2412).
- **Le joueur** : lit, et touche l'image pour l'agrandir.
- **Fichier** : `img/affiche-avis-de-recherche.svg` (7 ko). Type `image` existant, aucun code.
- **Texte** : RECHERCHÉ, debout ou couché. PION ROUGE, alias « le Petit Rouge », alias « celui qui manque toujours ». Signalement : 2 cm, tête ronde, socle large, regard fixe ; aucune expression, même quand il perd. Signe particulier : légère trace de dents (le chien, 2024). Dernière apparition : le 24 décembre vers 23 h, au bord de la table, juste avant que quelqu'un crie « J'ai gagné ! » et secoue la nappe. Complices présumés : le chat, l'aspirateur, le cousin aux grandes poches. Remplacé provisoirement par : un bouchon de flacon, qui ne fait pas illusion. RÉCOMPENSE : une partie sans finir dernier, et le droit de choisir sa couleur. Tout renseignement au service des pièces non conformes de la Pharmacotechnie. Ne pas tenter de l'appréhender seul : il roule.

## 6. Goutte 24 (temps fort) : l'ordonnance de Noël
- **Principe** : une ordonnance tirée au hasard dans le catalogue du site. Elle prescrit un jeu dans chacune des quatre catégories (enfant, famille, initié, expert), avec la couverture du jeu et sa notice « effet secondaire » déjà écrite (champ `nt`).
- **Le joueur** : lit son ordonnance, et touche « Renouveler l'ordonnance » pour un nouveau tirage, ou un jeu pour l'ouvrir dans le catalogue.
- **À fabriquer** : un nouveau type `ordonnance`, environ 30 lignes, par la session Sapin. Il utilise le tableau `G` et les couvertures déjà présentes : zéro image nouvelle.
- **Texte d'en-tête** : « Ordonnance de Noël. Docteur Père Noël, service de pharmacotechnie ludique. Traitement à suivre pendant les fêtes, en famille ou entre amis. À renouveler sans modération. »

## 7. Goutte 25 (Noël) : certificat de libération de lot (version réaliste, validée le 24/11)
- **Principe** : un vrai certificat de libération de lot, sur un porte-bloc. Le tampon rouge « LIBÉRÉ, 25 · 12 · 2026 » tombe sur la signature, puis un bouton « Envoyer la carte » apparaît.
- **Fichiers** : `img/certificat-noel.svg` (le certificat sans tampon, 26 ko) et `img/tampon-libere.svg`. Le tampon est un **calque transparent de même format** (600 × 860) : il suffit de le superposer au certificat pour l'animer (chute, puis légère secousse), sans calcul de position. Repli sans code : `img/certificat-noel-tamponne.svg` en type `image`.
- **Type** `voeux`, environ 25 lignes : superposition animée, puis partage par `navigator.share`, ou copie du lien `#sapin` à défaut. Une vidéo de l'enquête doit arriver plus tard pour ce jour-là : le certificat doit pouvoir cohabiter avec elle.
- **Texte** : Pharmacotechnie ludique, service de libération des lots festifs, réf. FDN-2026, version 25, page 1/1. CERTIFICAT DE LIBÉRATION DE LOT. Produit : Noël 2026, forme : fête, voie : familiale. Numéro de lot : NOEL-2026-12-25. Taille de lot : toute l'équipe (et les conjoints). Fabrication : du 1er au 24 décembre, sous sapin. Péremption : 1er janvier ; ensuite, on recommence.
  Contrôles (contrôle | spécification | résultat | conclusion) : Aspect | pull moche obligatoire | conforme | Conforme. Bonne humeur | ≥ 95 % | 103 % | Conforme. Fous rires | ≥ 3 par partie | 11, dont 2 nerveux | Conforme. Chocolats | ≤ 1 boîte / personne | 2,5 boîtes | Hors spécification, dérogation accordée. Défaites non vengées | 0 | 0 | Conforme. Fin des parties | ≤ 23 h | 1 h 47 | Hors spécification, dérogation accordée. Pièces manquantes | 0 | 1 pion rouge (voir le 22) | Enquête en cours. Pulls tricotés main | sans objet | 3, lavables à 30 °C | Conforme.
  Décision : lot libéré pour consommation immédiate, sans modération. Conditions de conservation : au chaud, entre amis, loin des écrans. Double contrôle : le renne de garde. Pharmacien responsable : P. Noël. Joyeux Noël ! De toute l'équipe de Pharmacotechnie.

---

## Propositions de rechange
- **R1. Bulletin d'analyse d'une partie** (type `image`, aucun code). Un tableau Paramètre / Résultat / Norme. Par exemple : durée annoncée sur la boîte 30 min, durée réelle 2 h 40, norme « toujours dépassée » ; nombre de relectures de la règle 7, norme ≤ 1 ; joueurs vexés 1, norme « tolérance : un par soirée ».
- **R2. Mots mêlés du joueur** (nouveau type `motsmeles`, environ 60 lignes, ou image à imprimer). Mots à trouver : PLATEAU, PION, DÉ, CARTE, MEEPLE, SABLIER, JETON, RÈGLE.
- **R3. Horoscope du joueur** (type `image`, ou une petite liste). Douze signes, une prédiction chacun. Par exemple, Bélier : « Vous foncerez sur la première case libre ; Mercure conseille de lire la règle avant. »

## Écartées
- **Blagues d'animaux** (renard, hibou, manchot…) : il y a déjà quatre origamis animaux, je les garderais pour une autre année.
- **Recette de collation** : elle demanderait des faits à sourcer et s'éloigne du jeu.
- **Souvenir de l'année du catalogue** : je n'ai pas de données fiables à citer.
