const { flacon, sapin, rayons, etoile, porte, V, O, J, R, C, VI, S, F } = require('./fabrique.js');
const PECHE = '#F8C9AA', LILAS = '#DCD3F7', ROSE = '#F3DDEB', PAILLE = '#F8EFC0', MENTHE = '#D4EBDF', CIEL = '#D6E6F5';
const meeple = (x, y, k, fill) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0-30a10 10 0 0 1 10 10c0 4-2 7-5 9l18 7c4 2 4 8-1 9l-10 1 9 20c1 3-1 5-4 5H7l-7-12-7 12h-10c-3 0-5-2-4-5l9-20-10-1c-5-1-5-7-1-9l18-7c-3-2-5-5-5-9a10 10 0 0 1 10-10z" fill="${fill}" ${S}/>`;
const chrono = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-8" y="-50" width="16" height="10" rx="3" fill="${O}" ${S}/><circle r="38" fill="#fff" ${S}/><path d="M0 0V-26M0 0l16 10" ${S}/><circle r="4" fill="${V}"/><text ${F} x="0" y="26" font-size="15" font-weight="700" fill="${V}" text-anchor="middle">40 s</text></g>`;
const cible = (x, y) => `<g transform="translate(${x} ${y})"><circle r="36" fill="${C}" ${S}/><circle r="23" fill="${R}" ${S}/><circle r="10" fill="${O}" ${S}/><path d="M30-30L4-4" ${S}/><path d="M30-30l10-2-2 10" fill="none" ${S}/></g>`;
const podium = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-15" y="-34" width="30" height="34" fill="${J}" ${S}/><rect x="-45" y="-20" width="30" height="20" fill="${VI}" ${S}/><rect x="15" y="-12" width="30" height="12" fill="${R}" ${S}/><text ${F} x="0" y="-12" font-size="16" font-weight="700" fill="${V}" text-anchor="middle">10</text></g>`;
const scelle = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-44" y="-30" width="88" height="60" rx="6" fill="#fff" ${S}/><path d="M-44-30L0 4 44-30" fill="none" ${S}/><circle cx="0" cy="6" r="15" fill="${O}" ${S}/><path d="M-6 6l4 4 8-9" fill="none" stroke="${C}" stroke-width="3.5" stroke-linecap="round"/></g>`;
const calend = (x, y) => `<g transform="translate(${x} ${y})">${[0, 1, 2].map(i => `<g transform="translate(${(i - 1) * 40} 0)"><rect x="-18" y="-18" width="36" height="36" rx="5" fill="${i ? C : J}" ${S}/><text ${F} x="0" y="8" font-size="14" font-weight="700" fill="${V}" text-anchor="middle">J${i ? '+' + i : ''}</text></g>`).join('')}</g>`;
module.exports = { pg: [
  { titre: '1. La fiche', fond: MENTHE, queue: 300, bulle: ['Mon nom dans la liste, un pseudo,', 'un avatar. Le sort me verse dans', 'l\'une des cinq brigades.'],
    alt: 'Case 1, La fiche. Le flacon montre son avatar en forme de meeple et un badge de brigade : « Mon nom dans la liste, un pseudo, un avatar. Le sort me verse dans l\'une des cinq brigades. »',
    scene: `<circle cx="110" cy="214" r="34" fill="${J}" ${S}/>` + meeple(110, 216, 0.9, O) + `<rect x="160" y="196" width="78" height="36" rx="8" fill="${VI}" ${S}/><text ${F} x="199" y="220" font-size="17" font-weight="700" fill="${V}" text-anchor="middle">? / 5</text>` + flacon(320, 214, 0.5) },
  { titre: '2. Le sapin d\'abord', fond: PAILLE, queue: 300, bulle: ['La goutte du jour au sapin, puis', 'les portes dans l\'ordre.'],
    alt: 'Case 2, Le sapin d\'abord. Une flèche va du sapin à la porte du jour : « La goutte du jour au sapin, puis les portes dans l\'ordre. »',
    scene: sapin(90, 214, { k: 0.6, jour: 10 }) + `<path d="M140 220h70M198 210l12 10-12 10" fill="none" ${S}/>` + porte(258, 214).replace('scale', 'scale').replace(`translate(258 214)`, `translate(258 214) scale(0.7)`) + flacon(345, 214, 0.42) },
  { titre: '3. Au chrono', fond: CIEL, queue: 300, bulle: ['Cinq questions, 30 ou 40 s chacune,', 'une seule prise : 2 points. Dose :', '2 points à 2 près, 1 à 10 près.'],
    alt: 'Case 3, Au chrono. Un chronomètre tourne à côté du flacon concentré : « Cinq questions, 30 ou 40 secondes chacune, une seule prise : 2 points. Dose : 2 points à 2 près, 1 à 10 près. »',
    scene: chrono(130, 214) + flacon(300, 214, 0.5, 'wow') },
  { titre: '4. Jeux d\'adresse', fond: PECHE, queue: 330, bulle: ['Deux essais, le meilleur compte.', 'Points au rang : 10 au premier,', '1 au dernier. Le 25 : 20 points.'],
    alt: 'Case 4, Jeux d\'adresse. Une cible touchée et un podium : « Deux essais, le meilleur compte. Points au rang : 10 au premier, 1 au dernier. Le 25 : 20 points. »',
    scene: cible(90, 216) + podium(210, 252) + flacon(330, 214, 0.45) },
  { titre: '5. Sous scellé', fond: ROSE, queue: 310, bulle: ['Une porte reste ouverte trois', 'jours. Réponses et points restent', 'sous scellé jusqu\'à la clôture.'],
    alt: 'Case 5, Sous scellé. Trois jours au calendrier et une enveloppe scellée : « Une porte reste ouverte trois jours. Réponses et points restent sous scellé jusqu\'à la clôture. »',
    scene: calend(92, 222) + scelle(228, 222) + flacon(330, 214, 0.45, 'zen') },
  { titre: '6. En brigade', fond: LILAS, queue: 200, bulle: ['Enquête en brigade : une réponse', 'chacun, la majorité tranche.', 'Jusqu\'à 37 points pour l\'équipe.'],
    alt: 'Case 6, En brigade. Trois meeples entourent le flacon : « Enquête en brigade : une réponse chacun, la majorité tranche. Jusqu\'à 37 points pour l\'équipe. »',
    scene: meeple(90, 224, 1, R) + meeple(150, 224, 1, J) + flacon(220, 214, 0.5) + meeple(290, 224, 1, VI) },
] };
