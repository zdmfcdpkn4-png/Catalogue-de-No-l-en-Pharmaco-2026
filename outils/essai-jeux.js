// Aperçu des jeux d'adresse hors du site : une partie automatique de chacun dans Chromium, avec captures.
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
  const p = await b.newPage({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + dir + '/jeux.html');
  await p.evaluate(() => document.fonts.ready);
  // Bowling : deux lancers
  await p.evaluate(() => { window.fin = null; PharmacoJeux.bowling(document.querySelector('#z'), { duree: 30, onFin: (n, t) => { window.fin = [n, t]; } }); });
  await p.waitForTimeout(700); await p.screenshot({ path: dir + '/bowling-1-position.png' });
  await p.click('.pj-cv'); await p.waitForTimeout(450); await p.screenshot({ path: dir + '/bowling-2-angle.png' });
  await p.click('.pj-cv'); await p.waitForTimeout(600); await p.screenshot({ path: dir + '/bowling-3-roule.png' });
  await p.waitForTimeout(2600); await p.click('.pj-cv'); await p.waitForTimeout(300); await p.keyboard.press('Space');
  await p.waitForFunction(() => window.fin, null, { timeout: 15000 });
  const fb = await p.evaluate(() => window.fin);
  // La hotte : on suit la particule la plus basse à la souris pendant 12 s, puis on laisse filer
  await p.evaluate(() => { window.fin = null; PharmacoJeux.tir(document.querySelector('#z'), { duree: 45, onFin: (n, t) => { window.fin = [n, t]; } }); });
  const box = await p.locator('.pj-cv').boundingBox();
  for (let i = 0; i < 40; i++) { await p.mouse.move(box.x + box.width * (0.5 + 0.4 * Math.sin(i / 3)), box.y + box.height * 0.8); await p.waitForTimeout(300); if (i === 22) await p.screenshot({ path: dir + '/hotte-1.png' }); }
  await p.screenshot({ path: dir + '/hotte-2.png' });
  await p.waitForFunction(() => window.fin, null, { timeout: 60000 });
  await p.screenshot({ path: dir + '/hotte-3-fin.png' });
  const fh = await p.evaluate(() => window.fin);
  // Le flipper : une partie courte au clavier (les deux batteurs en cadence), puis au doigt à 320 px, puis en largeur PC.
  const flip = async (page, duree) => { await page.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.flipper(document.querySelector('#z'), { duree: d, onFin: (n, t) => { window.fois++; window.fin = [n, t]; } }); }, duree); };
  await flip(p, 20);
  await p.waitForTimeout(600); await p.screenshot({ path: dir + '/flipper-1-depart.png' });
  for (let i = 0; i < 34; i++) { const k = i % 2 ? 'ArrowLeft' : 'l'; await p.keyboard.down(k); await p.waitForTimeout(160); if (i === 9) await p.screenshot({ path: dir + '/flipper-2-jeu.png' }); await p.keyboard.up(k); await p.waitForTimeout(340); }
  await p.waitForFunction(() => window.fin, null, { timeout: 30000 });
  await p.screenshot({ path: dir + '/flipper-3-fin.png' });
  const ff1 = await p.evaluate(() => window.fin);
  // Arrêt en cours de partie : plus rien ne doit arriver ensuite.
  await flip(p, 10); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(12500);
  const apresArret = await p.evaluate(() => window.fois);
  const tel = await b.newPage({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true });
  tel.on('pageerror', e => errs.push(String(e)));
  await tel.goto('file://' + dir + '/jeux.html'); await tel.evaluate(() => { document.querySelector('#z').style.width = '296px'; return document.fonts.ready; });
  await flip(tel, 12); await tel.waitForTimeout(2600);
  // deux doigts à la fois : les deux batteurs doivent être levés sur la capture
  await tel.evaluate(() => { const c = document.querySelector('.pj-cv'), r = c.getBoundingClientRect(); for (const [id, x] of [[11, 0.2], [12, 0.8]]) c.dispatchEvent(new PointerEvent('pointerdown', { pointerId: id, pointerType: 'touch', clientX: r.left + r.width * x, clientY: r.top + r.height * 0.8, bubbles: true, cancelable: true })); });
  await tel.waitForTimeout(250); await tel.screenshot({ path: dir + '/flipper-4-telephone-320.png' });
  await tel.evaluate(() => { const c = document.querySelector('.pj-cv'); for (const id of [11, 12]) c.dispatchEvent(new PointerEvent('pointerup', { pointerId: id, pointerType: 'touch', bubbles: true })); });
  await tel.waitForFunction(() => window.fin, null, { timeout: 30000 });
  const ff2 = await tel.evaluate(() => [window.fin, document.documentElement.scrollWidth]);
  const pc = await b.newPage({ viewport: { width: 1280, height: 800 } });
  pc.on('pageerror', e => errs.push(String(e)));
  await pc.goto('file://' + dir + '/jeux.html'); await pc.evaluate(() => { document.querySelector('#z').style.width = '640px'; return document.fonts.ready; });
  await flip(pc, 8); await pc.waitForTimeout(3200); await pc.mouse.click(60, 300); await pc.mouse.down(); await pc.waitForTimeout(120); await pc.screenshot({ path: dir + '/flipper-5-pc.png' }); await pc.mouse.up();
  await pc.waitForFunction(() => window.fin, null, { timeout: 30000 });
  console.log(JSON.stringify({ bowling: fb, hotte: fh, flipper: ff1, flipperTelephone: ff2, flipperPc: await pc.evaluate(() => window.fin), appelsApresArret: apresArret, erreurs: errs }));
  await b.close();
})();
