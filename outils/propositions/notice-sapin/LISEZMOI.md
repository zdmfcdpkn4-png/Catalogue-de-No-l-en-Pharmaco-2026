# Notice du sapin : proposition (session Textes)

Demande du pharmacien (24/11) : notice du sapin plus drôle, plus courte, plus ludique, en BD, une case par étape.
Validée par lui le 24/11 : BD retenue, aucun détail du contenu des gouttes (ni liste des surprises, ni 3 décembre : on fait planer le mystère),
sapin verrouillé par le code d'équipe puis un clic sur son avatar.

**À poser par la session Sapin** dans `index.html` (section `#avent`). Rien n'est modifié ici hors de ce dossier.

## 1. Chapeau (remplace le `p.adv-intro` actuel)

> Posologie : une goutte par jour, du 1<sup>er</sup> au 25 décembre. Mode d'emploi en cinq prises :

## 2. BD : cinq cases, un SVG par case

Validé par le pharmacien le 24/11, avec une présentation qui demande moins de défilement : les cases sont posées dans une
**bande qu'on fait glisser** (une case visible à la fois sur téléphone, trois côte à côte sur grand écran), comme la notice
des Pharmacogames dans `enigme.js` (classes `.eg-bd`). Une planche unique serait illisible à 320 px (texte vers 6 px).
Copier les SVG en `img/bd-sapin-1.svg` à `img/bd-sapin-5.svg`. Exemple de pose :

```html
<p class="av-bd-aide" id="avBdAide">Mode d'emploi en cinq cases : faites glisser.</p>
<div class="av-bd" role="region" aria-labelledby="avBdAide" tabindex="0">
  <img src="img/bd-sapin-1.svg" alt="…texte alternatif ci-dessous…" width="400" height="300" loading="lazy">
  …
</div>
<style>
.av-bd-aide{margin:6px 0 8px;font-size:.84rem;font-weight:700}
.av-bd{display:grid;grid-auto-flow:column;grid-auto-columns:88%;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;padding:2px 2px 8px}
.av-bd img{display:block;width:100%;height:auto;scroll-snap-align:start}
.av-bd:focus-visible{outline:3px solid #26076D;outline-offset:2px}
@media(min-width:861px){.av-bd{grid-auto-columns:calc((100% - 20px) / 3)}}
</style>
```

| Fichier | Titre | Bulle | Texte alternatif |
|---|---|---|---|
| `sapin-1.svg` | Contrôle d'accès | Code d'équipe, puis un clic sur mon avatar : accès libéré. | Le flacon a saisi le code d'équipe, masqué par des points, puis clique sur son avatar en forme de meeple : « Code d'équipe, puis un clic sur mon avatar : accès libéré. » |
| `sapin-2.svg` | Quarantaine | Sapin sous scellé jusqu'au 1er décembre. J'ai secoué : rien. | Le flacon secoue un sapin de gouttes fermé par un cadenas : « Sapin sous scellé jusqu'au 1er décembre. J'ai secoué : rien. » |
| `sapin-3.svg` | Une goutte par jour | Chaque jour, une goutte est libérée. Je touche la mienne. | Le flacon touche la goutte du jour, dorée et rayonnante, dans le sapin : « Chaque jour, une goutte est libérée. Je touche la mienne. » |
| `sapin-4.svg` | Surprise ! | Ce qu'il y a dedans ? Secret de fabrication. Je ne dirai rien. | La goutte s'ouvre en étoile ; le flacon, bouche cousue, garde le secret : « Ce qu'il y a dedans ? Secret de fabrication. Je ne dirai rien. » |
| `sapin-5.svg` | Le sapin d'abord | Goutte ouverte : la porte du jour des Pharmacogames m'attend ! | Le flacon court vers la porte du jour des Pharmacogames : « Goutte ouverte : la porte du jour des Pharmacogames m'attend ! » |

Chaque SVG porte aussi son texte alternatif dans `<title>` (`role="img"`), utile s'il est inséré en ligne plutôt qu'en `<img>`.

## 3. Messages du panneau

Inchangés : déjà courts et dans le ton (quarantaine, dose du jour, déjà délivrée, sous scellé, au laboratoire, traitement terminé).

## Exactitude

- Case 1 : suppose le verrou « code d'équipe puis clic sur son avatar », décidé par le pharmacien le 24/11 mais **pas encore codé** :
  ne poser la case 1 qu'avec le verrou.
- Case 5 : règle « le sapin d'abord » (403 `sapin` dans `api/enigme.js`).
- Aucun contenu de goutte ni de l'enquête n'est cité.

## Régénérer

`node outils/propositions/notice-sapin/fabrique.js` (dessins dans `fabrique.js`, textes du sapin dans `pistes.js`, textes de la notice des Pharmacogames dans `pg.js` : ses `pg-N.svg` se copient en `img/notice-pharmacogames-N.svg`). Style repris de `img/bd-clandestin-en-zac.svg`. Aucune image générée par un service payant.
