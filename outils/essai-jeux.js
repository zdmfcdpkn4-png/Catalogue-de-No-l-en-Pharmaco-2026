// Aperçu des deux jeux d'adresse hors du site : une partie automatique de chacun dans Chromium, avec captures.
// Usage : node outils/essai-jeux.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><p id="r"></p><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/jeux.html', html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 660 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + dir + '/jeux.html');
  await p.evaluate(() => document.fonts.ready);
  // Bowling : cinq séries de deux tirs, joués à l'aveugle jusqu'à la fin de la partie
  await p.evaluate(() => { window.fin = null; PharmacoJeux.bowling(document.querySelector('#z'), { duree: 30, onFin: (n, t) => { window.fin = [n, t]; } }); });
  await p.waitForTimeout(700); await p.screenshot({ path: dir + '/bowling-1-position.png' });
  await p.click('.pj-cv'); await p.waitForTimeout(450); await p.screenshot({ path: dir + '/bowling-2-angle.png' });
  await p.click('.pj-cv'); await p.waitForTimeout(600); await p.screenshot({ path: dir + '/bowling-3-roule.png' });
  for (let i = 0; i < 30 && !(await p.evaluate(() => window.fin)); i++) { await p.waitForTimeout(2600); await p.click('.pj-cv'); await p.waitForTimeout(700); await p.keyboard.press('Space'); }
  await p.waitForFunction(() => window.fin, null, { timeout: 15000 });
  await p.screenshot({ path: dir + '/bowling-4-fin.png' });
  const fb = await p.evaluate(() => window.fin);
  // La hotte : on suit la particule la plus basse à la souris pendant 12 s, puis on laisse filer
  await p.evaluate(() => { window.fin = null; PharmacoJeux.tir(document.querySelector('#z'), { duree: 45, onFin: (n, t) => { window.fin = [n, t]; } }); });
  const box = await p.locator('.pj-cv').boundingBox();
  for (let i = 0; i < 40; i++) { await p.mouse.move(box.x + box.width * (0.5 + 0.4 * Math.sin(i / 3)), box.y + box.height * 0.8); await p.waitForTimeout(300); if (i === 22) await p.screenshot({ path: dir + '/hotte-1.png' }); }
  await p.screenshot({ path: dir + '/hotte-2.png' });
  await p.waitForFunction(() => window.fin, null, { timeout: 60000 });
  await p.screenshot({ path: dir + '/hotte-3-fin.png' });
  console.log(JSON.stringify({ bowling: fb, hotte: await p.evaluate(() => window.fin), erreurs: errs }));
  await b.close();
})();
