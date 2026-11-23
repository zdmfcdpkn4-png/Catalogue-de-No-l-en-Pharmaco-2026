// Fabrique des cases de la BD du sapin : une case = un SVG 400 x 300, style de img/bd-clandestin-en-zac.svg.
const fs = require('fs');
const V = '#26076D', O = '#EC7739', J = '#ECD567', R = '#E5B4D9', C = '#FFFBF2', VI = '#B9A6F0';
const F = 'font-family="Arial,Helvetica,sans-serif"', S = `stroke="${V}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"`;
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Flacon personnage (repris de la BD de référence), centré en (x,y), humeur : 'ok' | 'wow' | 'zen'
const flacon = (x, y, k = 0.62, h = 'ok', fond = R) => `<g transform="translate(${x} ${y}) scale(${k})"><rect x="-41" y="-49" width="90" height="124" rx="16" fill="${V}"/><rect x="-45" y="-55" width="90" height="124" rx="16" fill="${C}" ${S}/><path d="M-42 12q14-9 28 0t28 0t28 0V55q0 11-11 11h-62q-11 0-11-11z" fill="${fond}"/><rect x="-45" y="-55" width="90" height="124" rx="16" fill="none" ${S}/><rect x="-20" y="-78" width="40" height="24" fill="${C}" ${S}/><rect x="-26" y="-92" width="52" height="16" rx="5" fill="${O}" ${S}/>`
  + (h === 'zen' ? `<path d="M-24-14q8 6 16 0M8-14q8 6 16 0" fill="none" ${S}/>` : `<circle cx="-16" cy="-14" r="9" fill="#fff" stroke="${V}" stroke-width="4"/><circle cx="16" cy="-14" r="9" fill="#fff" stroke="${V}" stroke-width="4"/><circle cx="-14" cy="-12" r="4" fill="${V}"/><circle cx="18" cy="-12" r="4" fill="${V}"/>`)
  + (h === 'wow' ? `<ellipse cx="0" cy="10" rx="7" ry="9" fill="${V}"/>` : `<path d="M-12 6q12 10 24 0" fill="none" ${S}/>`) + '</g>';
const goutte = (x, y, k, fill, sw = 5) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0-22C8-10 14-2 14 7a14 14 0 0 1-28 0c0-9 6-17 14-29z" fill="${fill}" ${S.replace('stroke-width="5"', 'stroke-width="' + sw + '"')}/>`;
// Sapin de gouttes (5 rangs), cadenas optionnel, goutte du jour en surbrillance
const sapin = (x, y, opt = {}) => {
  const k0 = opt.k || 0.8; let g = `<g transform="translate(${x} ${y}) scale(${k0})"><rect x="-9" y="62" width="18" height="18" fill="${O}" ${S}/>`;
  const rangs = [[1, -62], [2, -36], [3, -10], [4, 16], [5, 42]]; let i = 0;
  const cols = [J, R, VI, O, C];
  for (const [n, yy] of rangs) for (let k = 0; k < n; k++) { i++; const xx = (k - (n - 1) / 2) * 26;
    g += goutte(xx, yy, 0.62, i === opt.jour ? J : cols[i % 5], i === opt.jour ? 7 : 5); }
  if (opt.jour) { const P = {10: [39, 16]}[opt.jour]; if (P) g += rayons(P[0], P[1], 16); }
  if (opt.cadenas) g += `<g transform="translate(0 4)"><path d="M-14 0v-10a14 14 0 0 1 28 0V0" fill="none" stroke="${V}" stroke-width="7"/><rect x="-22" y="0" width="44" height="34" rx="7" fill="${O}" ${S}/><circle cx="0" cy="15" r="4" fill="${V}"/></g>`;
  return g + '</g>';
};
const rayons = (x, y, r = 28) => [0, 45, 90, 135, 180, 225, 270, 315].map(a => { const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); return `<path d="M${x + c * r} ${y + s * r}L${x + c * (r + 12)} ${y + s * (r + 12)}" ${S}/>`; }).join('');
const etoile = (x, y, k, fill = J) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0-20l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z" fill="${fill}" ${S}/>`;
const porte = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-38" y="-62" width="76" height="124" rx="10" fill="${VI}" ${S}/><rect x="-28" y="-52" width="56" height="104" rx="6" fill="${C}" ${S}/><text ${F} x="0" y="-12" font-size="30" font-weight="700" fill="${V}" text-anchor="middle">J</text><circle cx="18" cy="10" r="5" fill="${O}" stroke="${V}" stroke-width="3"/></g>`;
const cartes = (x, y) => `<g transform="translate(${x} ${y})">${[-24, 0, 24].map((dx, i) => `<g transform="translate(${dx} 0) rotate(${(i - 1) * 14})"><rect x="-18" y="-26" width="36" height="52" rx="6" fill="${[R, J, VI][i]}" ${S}/><text ${F} x="0" y="8" font-size="22" font-weight="700" fill="${V}" text-anchor="middle">?</text></g>`).join('')}</g>`;

function cas(c) {
  const lignes = c.bulle;
  const w = Math.max(...lignes.map(l => l.length)) * 9.4 + 34, bw = Math.min(360, Math.max(200, w)), bx = 200 - bw / 2, bh = 22 * lignes.length + 22;
  const queue = c.queue || 200;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-labelledby="t${c.id}"><title id="t${c.id}">${esc(c.alt)}</title>`
  + `<rect x="13" y="13" width="380" height="280" rx="18" fill="${V}"/><rect x="6" y="6" width="380" height="280" rx="18" fill="${c.fond}" ${S}/>`
  + `<rect x="20" y="18" width="${c.titre.length * 11 + 26}" height="32" rx="8" fill="${J}" stroke="${V}" stroke-width="4"/><text ${F} x="33" y="41" font-size="19" font-weight="700" fill="${V}">${esc(c.titre)}</text>`
  + `<path d="M${queue - 12} ${60 + bh - 4}L${queue} ${60 + bh + 20}L${queue + 12} ${60 + bh - 4}Z" fill="#fff" ${S}/><rect x="${bx}" y="60" width="${bw}" height="${bh}" rx="16" fill="#fff" ${S}/><path d="M${queue - 9} ${60 + bh - 2}h18" stroke="#fff" stroke-width="7"/>`
  + `<text ${F} font-size="19" font-weight="700" fill="${V}" text-anchor="middle">${lignes.map((l, i) => `<tspan x="200" y="${60 + 30 + i * 22}">${esc(l)}</tspan>`).join('')}</text>`
  + `<path d="M24 262h346" ${S}/>` + c.scene + '</svg>';
}
module.exports = { cas, flacon, goutte, sapin, rayons, etoile, porte, cartes, V, O, J, R, C, VI, S, F };
if (require.main === module) {
  const opt = n => { try { return require(n); } catch (e) { return {}; } };
  const P = Object.assign({}, require('./pistes.js'), require('./pg.js'), opt('./enq.js'));
  for (const [nom, liste] of Object.entries(P)) liste.forEach((c, i) => fs.writeFileSync(`${__dirname}/${nom}-${i + 1}.svg`, cas({ ...c, id: nom + i })));
  console.log('ok');
}
