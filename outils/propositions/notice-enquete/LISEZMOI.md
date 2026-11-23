# Notice de l'enquête des brigades : BD en six cases (session Textes)

Demande du pharmacien (24/11, transmise par l'orchestration) : une notice en BD pour l'enquête, même style et même présentation
en bande que les notices du sapin et des Pharmacogames. Validée par lui le 24/11, avec une consigne : **ne pas parler de points**
(ni barème, ni total). Rien du contenu n'est dévoilé : ni solution, ni énigme, ni mécanisme de la quête secondaire (case 6 : « qui sait
bien observer trouvera plus encore… »), ni date de parution des cartes.

**À poser par la session Enquête** dans le bloc de l'enquête (`enquete.js`, section `#egEnquete`). Emplacement proposé : en tête du bloc,
dans un `<details>` repliable comme la notice des Pharmacogames, ouvert à la première visite puis replié.
Copier les SVG en `img/notice-enquete-1.svg` à `img/notice-enquete-6.svg`.

## Pose

```html
<details class="eg-panel eg-notice" id="enqNotice" open><summary>Notice de l'enquête : à lire avant d'ouvrir l'album</summary>
  <p class="eg-bd-aide" id="enqBdAide">Mode d'emploi en six cases : faites glisser.</p>
  <div class="eg-bd" role="region" aria-labelledby="enqBdAide" tabindex="0">
    <img src="img/notice-enquete-1.svg" alt="Case 1, Le mystère. Trois cartes, un personnage, un lieu et un objet, sous une loupe : « Six personnages, six lieux, six objets… et un seul trio coupable. À la brigade de le démasquer ! »" width="400" height="300" loading="lazy">
    <img src="img/notice-enquete-2.svg" alt="Case 2, L'album. Des cartes vont du sapin à l'album orange de la brigade : « Les cartes tombent du sapin et se rangent dans l'album de la brigade. Ouvrez l'œil. »" width="400" height="300" loading="lazy">
    <img src="img/notice-enquete-3.svg" alt="Case 3, L'énigme du jour. Le flacon glisse son bulletin dans une urne, à côté d'une carte énigme : « Du 4 au 24, une énigme par jour. Je réponds dans les Pharmacogames : une seule fois, c'est définitif. »" width="400" height="300" loading="lazy">
    <img src="img/notice-enquete-4.svg" alt="Case 4, La majorité. Trois jours au calendrier, trois membres de la brigade dont deux d'accord : « Trois jours pour répondre. À la clôture, la réponse majoritaire de la brigade l'emporte. »" width="400" height="300" loading="lazy">
    <img src="img/notice-enquete-5.svg" alt="Case 5, Révélation. Une carte tamponnée « Hors de cause » et une horloge marquée « +1 jour » : « Juste : une carte hors de cause ou un indice, dès la clôture. Faux : la révélation arrive un jour après. »" width="400" height="300" loading="lazy">
    <img src="img/notice-enquete-6.svg" alt="Case 6, Le 25, on accuse. Le flacon désigne trois cartes face cachée : « On désigne le coupable, le lieu et l'objet. Et qui sait bien observer trouvera plus encore… »" width="400" height="300" loading="lazy">
  </div>
</details>
```

Les classes `.eg-notice`, `.eg-bd-aide` et `.eg-bd` existent déjà dans le bloc de styles de `enigme.js` (bande à faire glisser :
une case visible sur téléphone, trois sur grand écran). Le titre du `summary` est une proposition, à ajuster.

## Cases

| Fichier | Titre | Bulle | Texte alternatif |
|---|---|---|---|
| `enq-1.svg` | 1. Le mystère | Six personnages, six lieux, six objets… et un seul trio coupable. À la brigade de le démasquer ! | Case 1, Le mystère. Trois cartes, un personnage, un lieu et un objet, sous une loupe : « Six personnages, six lieux, six objets… et un seul trio coupable. À la brigade de le démasquer ! » |
| `enq-2.svg` | 2. L'album | Les cartes tombent du sapin et se rangent dans l'album de la brigade. Ouvrez l'œil. | Case 2, L'album. Des cartes vont du sapin à l'album orange de la brigade : « Les cartes tombent du sapin et se rangent dans l'album de la brigade. Ouvrez l'œil. » |
| `enq-3.svg` | 3. L'énigme du jour | Du 4 au 24, une énigme par jour. Je réponds dans les Pharmacogames : une seule fois, c'est définitif. | Case 3, L'énigme du jour. Le flacon glisse son bulletin dans une urne, à côté d'une carte énigme : « Du 4 au 24, une énigme par jour. Je réponds dans les Pharmacogames : une seule fois, c'est définitif. » |
| `enq-4.svg` | 4. La majorité | Trois jours pour répondre. À la clôture, la réponse majoritaire de la brigade l'emporte. | Case 4, La majorité. Trois jours au calendrier, trois membres de la brigade dont deux d'accord : « Trois jours pour répondre. À la clôture, la réponse majoritaire de la brigade l'emporte. » |
| `enq-5.svg` | 5. Révélation | Juste : une carte hors de cause ou un indice, dès la clôture. Faux : la révélation arrive un jour après. | Case 5, Révélation. Une carte tamponnée « Hors de cause » et une horloge marquée « +1 jour » : « Juste : une carte hors de cause ou un indice, dès la clôture. Faux : la révélation arrive un jour après. » |
| `enq-6.svg` | 6. Le 25 : on accuse ! | On désigne le coupable, le lieu et l'objet. Et qui sait bien observer trouvera plus encore… | Case 6, Le 25, on accuse. Le flacon désigne trois cartes face cachée : « On désigne le coupable, le lieu et l'objet. Et qui sait bien observer trouvera plus encore… » |

## Exactitude (vérifiée dans `CLAUDE.md`, `api/enigme.js` et `enquete.js` le 24/11)

- 6 personnages, 6 lieux, 6 objets, un trio coupable ; 18 cartes rangées dans l'album de la brigade, sorties du sapin.
- Une énigme par jour du 4 au 24, réponse dans les Pharmacogames, une seule par membre, définitive.
- Ouverte le jour même et les deux suivants ; à la clôture, réponse majoritaire de la brigade retenue (à égalité, la première
  déposée : non dit dans la BD, pour rester court).
- Révélation (carte « Hors de cause » ou indice) à la clôture pour la brigade juste, un jour plus tard sinon. La BD ne dit pas
  qu'en cas d'erreur la révélation sort quand même : « la révélation arrive un jour après » le sous-entend.
- Accusation le 25 (coupable, lieu, objet), sans retard de révélation.

## Régénérer

`node outils/propositions/notice-sapin/fabrique.js` (dessins communs dans `notice-sapin/fabrique.js`, textes de l'enquête dans `enq.js`).
Tous les SVG passent `xmllint --noout`. Aucune image générée par un service payant.
