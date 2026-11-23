const { flacon, sapin, rayons, V, O, J, R, C, VI, S, F } = require('../notice-sapin/fabrique.js');
const PECHE = '#F8C9AA', LILAS = '#DCD3F7', ROSE = '#F3DDEB', PAILLE = '#F8EFC0', MENTHE = '#D4EBDF', CIEL = '#D6E6F5';
const meeple = (x, y, k, fill) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0-30a10 10 0 0 1 10 10c0 4-2 7-5 9l18 7c4 2 4 8-1 9l-10 1 9 20c1 3-1 5-4 5H7l-7-12-7 12h-10c-3 0-5-2-4-5l9-20-10-1c-5-1-5-7-1-9l18-7c-3-2-5-5-5-9a10 10 0 0 1 10-10z" fill="${fill}" ${S}/>`;
// Carte d'enquête (dos ou face neutre), icône : 'perso' | 'lieu' | 'objet' | '?'
const icone = { perso: k => meeple(0, 2, 0.5, R), lieu: () => `<path d="M-13 12V-2L0-13 13-2V12Z" fill="${J}" ${S}/>`, objet: () => `<path d="M-6-14h12M-4-14v10l-9 18h26l-9-18v-10" fill="${C}" ${S}/>`, '?': () => `<text ${F} x="0" y="9" font-size="26" font-weight="700" fill="${V}" text-anchor="middle">?</text>` };
const carte = (x, y, ic, rot = 0, fond = C) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-22" y="-30" width="44" height="60" rx="7" fill="${fond}" ${S}/>${icone[ic]()}</g>`;
const loupe = (x, y) => `<g transform="translate(${x} ${y})"><circle r="16" fill="#fff" fill-opacity=".6" ${S}/><path d="M11 11l14 14" stroke="${V}" stroke-width="8" stroke-linecap="round"/></g>`;
const album = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-56" y="-34" width="112" height="68" rx="8" fill="${O}" ${S}/><path d="M0-34v68" ${S}/>${[-38, -14, 14, 38].map(dx => `<rect x="${dx - 9}" y="-22" width="18" height="24" rx="3" fill="${C}" stroke="${V}" stroke-width="3"/>`).join('')}<text ${F} x="0" y="26" font-size="12" font-weight="700" fill="${C}" text-anchor="middle">ALBUM</text></g>`;
const urne = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-30" y="-14" width="60" height="44" rx="6" fill="${VI}" ${S}/><path d="M-14-14h28" stroke="${V}" stroke-width="6"/><rect x="-12" y="-40" width="24" height="30" rx="3" fill="#fff" ${S}/><path d="M-6-26l4 4 8-9" fill="none" stroke="${O}" stroke-width="3.5" stroke-linecap="round"/></g>`;
const calend = (x, y) => `<g transform="translate(${x} ${y})">${[0, 1, 2].map(i => `<g transform="translate(${(i - 1) * 40} 0)"><rect x="-18" y="-18" width="36" height="36" rx="5" fill="${i ? C : J}" ${S}/><text ${F} x="0" y="6" font-size="14" font-weight="700" fill="${V}" text-anchor="middle">J${i ? '+' + i : ''}</text></g>`).join('')}</g>`;
const tampon = (x, y) => `<g transform="translate(${x} ${y})">${carte(0, 0, 'perso', 0, C)}<g transform="rotate(-18)"><rect x="-30" y="-10" width="60" height="20" rx="4" fill="${C}" fill-opacity=".85" stroke="${O}" stroke-width="3.5"/><text ${F} x="0" y="5" font-size="9.5" font-weight="700" fill="${O}" text-anchor="middle">HORS DE CAUSE</text></g></g>`;
const horloge = (x, y) => `<g transform="translate(${x} ${y})"><circle r="22" fill="#fff" ${S}/><path d="M0 0V-14M0 0l10 6" ${S}/><text ${F} x="0" y="44" font-size="14" font-weight="700" fill="${V}" text-anchor="middle">+1 jour</text></g>`;
module.exports = { enq: [
  { titre: '1. Le mystère', fond: LILAS, queue: 320, bulle: ['Six personnages, six lieux, six', 'objets… et un seul trio coupable.', 'À la brigade de le démasquer !'],
    alt: 'Case 1, Le mystère. Trois cartes, un personnage, un lieu et un objet, sous une loupe : « Six personnages, six lieux, six objets… et un seul trio coupable. À la brigade de le démasquer ! »',
    scene: carte(70, 218, 'perso', -10) + carte(122, 214, 'lieu') + carte(174, 218, 'objet', 10) + loupe(214, 196) + flacon(320, 214, 0.5, 'wow') },
  { titre: '2. L\'album', fond: MENTHE, queue: 320, bulle: ['Les cartes tombent du sapin et se', 'rangent dans l\'album de la brigade.', 'Ouvrez l\'œil.'],
    alt: 'Case 2, L\'album. Des cartes vont du sapin à l\'album orange de la brigade : « Les cartes tombent du sapin et se rangent dans l\'album de la brigade. Ouvrez l\'œil. »',
    scene: sapin(70, 214, { k: 0.6 }) + `<path d="M108 214h34M132 204l10 10-10 10" fill="none" ${S}/>` + album(210, 222) + flacon(330, 214, 0.45) },
  { titre: '3. L\'énigme du jour', fond: CIEL, queue: 320, bulle: ['Du 4 au 24, une énigme par jour.', 'Je réponds dans les Pharmacogames :', 'une seule fois, c\'est définitif.'],
    alt: 'Case 3, L\'énigme du jour. Le flacon glisse son bulletin dans une urne, à côté d\'une carte énigme : « Du 4 au 24, une énigme par jour. Je réponds dans les Pharmacogames : une seule fois, c\'est définitif. »',
    scene: carte(80, 216, '?', -6, J) + urne(190, 228) + flacon(320, 214, 0.5) },
  { titre: '4. La majorité', fond: PAILLE, queue: 200, bulle: ['Trois jours pour répondre. À la', 'clôture, la réponse majoritaire', 'de la brigade l\'emporte.'],
    alt: 'Case 4, La majorité. Trois jours au calendrier, trois membres de la brigade dont deux d\'accord : « Trois jours pour répondre. À la clôture, la réponse majoritaire de la brigade l\'emporte. »',
    scene: calend(86, 224) + meeple(210, 224, 0.9, J) + meeple(258, 224, 0.9, J) + meeple(320, 224, 0.9, R) + `<path d="M196 182l6 6 12-12M244 182l6 6 12-12" fill="none" stroke="${V}" stroke-width="4" stroke-linecap="round"/><path d="M312 178l14 14M326 178l-14 14" stroke="${V}" stroke-width="4" stroke-linecap="round"/>` },
  { titre: '5. Révélation', fond: ROSE, queue: 320, bulle: ['Juste : une carte hors de cause', 'ou un indice, dès la clôture. Faux :', 'la révélation arrive un jour après.'],
    alt: 'Case 5, Révélation. Une carte tamponnée « Hors de cause » et une horloge marquée « +1 jour » : « Juste : une carte hors de cause ou un indice, dès la clôture. Faux : la révélation arrive un jour après. »',
    scene: tampon(90, 216) + horloge(210, 204) + flacon(320, 214, 0.5, 'zen') },
  { titre: '6. Le 25 : on accuse !', fond: PECHE, queue: 320, bulle: ['On désigne le coupable, le lieu', 'et l\'objet. Et qui sait bien observer', 'trouvera plus encore…'],
    alt: 'Case 6, Le 25, on accuse. Le flacon désigne trois cartes face cachée : « On désigne le coupable, le lieu et l\'objet. Et qui sait bien observer trouvera plus encore… »',
    scene: carte(70, 218, '?', -8, R) + carte(122, 214, '?', 0, J) + carte(174, 218, '?', 8, VI) + flacon(320, 214, 0.5, 'wow') + `<path d="M292 208L214 214" ${S}/>` },
] };
