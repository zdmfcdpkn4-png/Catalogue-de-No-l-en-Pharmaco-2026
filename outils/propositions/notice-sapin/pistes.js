const { flacon, goutte, sapin, rayons, etoile, porte, V, O, J, R, C, VI, S, F } = require('./fabrique.js');
const PECHE = '#F8C9AA', LILAS = '#DCD3F7', ROSE = '#F3DDEB', PAILLE = '#F8EFC0', MENTHE = '#D4EBDF';
const meeple = (x, y, k, fill) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0-30a10 10 0 0 1 10 10c0 4-2 7-5 9l18 7c4 2 4 8-1 9l-10 1 9 20c1 3-1 5-4 5H7l-7-12-7 12h-10c-3 0-5-2-4-5l9-20-10-1c-5-1-5-7-1-9l18-7c-3-2-5-5-5-9a10 10 0 0 1 10-10z" fill="${fill}" ${S}/>`;
const main = (x, y) => `<path transform="translate(${x} ${y})" d="M0 0l4 26 7-7 8 13 6-3-8-13 10-1z" fill="#fff" ${S}/>`;
module.exports = {
  sapin: [
    { titre: 'Contrôle d\'accès', fond: MENTHE, queue: 290, bulle: ['Code d\'équipe, puis un clic', 'sur mon avatar : accès libéré.'],
      alt: 'Case 1, Contrôle d\'accès. Le flacon a saisi le code d\'équipe, masqué par des points, puis clique sur son avatar en forme de meeple : « Code d\'équipe, puis un clic sur mon avatar : accès libéré. »',
      scene: `<rect x="34" y="166" width="132" height="40" rx="10" fill="#fff" ${S}/><text ${F} x="100" y="194" font-size="26" font-weight="700" fill="${V}" text-anchor="middle">• • • •</text>`
        + `<circle cx="210" cy="212" r="36" fill="${J}" ${S}/>` + meeple(210, 214, 0.95, O) + main(222, 222) + flacon(320, 214, 0.5) },
    { titre: 'Quarantaine', fond: PECHE, queue: 250, bulle: ['Sapin sous scellé jusqu\'au', '1er décembre. J\'ai secoué : rien.'],
      alt: 'Case 2, Quarantaine. Le flacon secoue un sapin de gouttes fermé par un cadenas : « Sapin sous scellé jusqu\'au 1er décembre. J\'ai secoué : rien. »',
      scene: sapin(120, 198, { cadenas: true }) + flacon(268, 214, 0.5, 'wow') + `<path d="M222 190q-8 6 0 12M218 214q-8 6 0 12" fill="none" ${S}/>` },
    { titre: 'Une goutte par jour', fond: LILAS, queue: 260, bulle: ['Chaque jour, une goutte est', 'libérée. Je touche la mienne.'],
      alt: 'Case 3, Une goutte par jour. Le flacon touche la goutte du jour, dorée et rayonnante, dans le sapin : « Chaque jour, une goutte est libérée. Je touche la mienne. »',
      scene: sapin(120, 198, { jour: 10 }) + flacon(290, 214, 0.5) + `<path d="M262 210L196 211" ${S}/>` },
    { titre: 'Surprise !', fond: ROSE, queue: 270, bulle: ['Ce qu\'il y a dedans ? Secret', 'de fabrication. Je ne dirai rien.'],
      alt: 'Case 4, Surprise. La goutte s\'ouvre en étoile ; le flacon, bouche cousue, garde le secret : « Ce qu\'il y a dedans ? Secret de fabrication. Je ne dirai rien. »',
      scene: etoile(140, 200, 1.5) + rayons(140, 200, 36) + flacon(280, 214, 0.5, 'zen') + `<path d="M273 220h14M276 216v8M284 216v8" stroke="${V}" stroke-width="2.5"/>` },
    { titre: 'Le sapin d\'abord', fond: PAILLE, queue: 150, bulle: ['Goutte ouverte : la porte du jour', 'des Pharmacogames m\'attend !'],
      alt: 'Case 5, Le sapin d\'abord. Le flacon court vers la porte du jour des Pharmacogames : « Goutte ouverte : la porte du jour des Pharmacogames m\'attend ! »',
      scene: flacon(130, 214, 0.5) + `<path d="M84 196h-20M88 214h-26M84 232h-20" ${S}/>` + porte(300, 198) },
  ],
};
