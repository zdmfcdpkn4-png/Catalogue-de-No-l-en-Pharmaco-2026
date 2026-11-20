// Aperçu du labyrinthe de la ZAC hors du site : parties automatiques dans Chromium (clavier, doigt à 320 px, souris en
// largeur PC), arrêt en cours de partie, avec captures. Usage : node outils/essai-labyrinthe.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><p id="r"></p><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/labyrinthe.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opts, largeur) => {
    const p = await b.newPage(opts);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/labyrinthe.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.labyrinthe(document.querySelector('#z'), { duree: d, onFin: (n, t) => { window.fois++; window.fin = [n, t]; } }); }, duree);
  const fini = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 60000 }); await p.waitForTimeout(300); return p.evaluate(() => [window.fin, window.fois]); };
  // 1. Au clavier : flèches puis Z Q S D, un virage toutes les 450 ms.
  const p = await ouvrir({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 });
  await lancer(p, 20);
  await p.waitForTimeout(500); await p.screenshot({ path: dir + '/labyrinthe-1-depart.png' });
  const suite = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowUp', 'q', 'z', 'd', 's', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'z'];
  for (let i = 0; i < 40; i++) { await p.keyboard.press(suite[i % suite.length]); await p.waitForTimeout(450); if (i === 14) await p.screenshot({ path: dir + '/labyrinthe-2-jeu.png' }); }
  const clavier = await fini(p);
  await p.screenshot({ path: dir + '/labyrinthe-3-fin.png' });
  // 2. Arrêt en cours de partie : plus rien ne doit arriver ensuite, même après la fin du chrono.
  await lancer(p, 10); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(12500);
  const apresArret = await p.evaluate(() => window.fois);
  // 3. Téléphone de 320 px : uniquement des glissements du doigt, n'importe où sur la zone de jeu.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true }, 296);
  await lancer(tel, 14);
  const glisser = (page, dx, dy) => page.evaluate(([dx, dy]) => {
    const c = document.querySelector('.pj-cv'), r = c.getBoundingClientRect(), x = r.left + r.width * 0.6, y = r.top + r.height * 0.3;
    const ev = (t, x, y) => c.dispatchEvent(new PointerEvent(t, { pointerId: 21, pointerType: 'touch', clientX: x, clientY: y, buttons: 1, pressure: 0.5, bubbles: true, cancelable: true }));
    ev('pointerdown', x, y); ev('pointermove', x + dx * 0.5, y + dy * 0.5); ev('pointermove', x + dx, y + dy); ev('pointerup', x + dx, y + dy);
  }, [dx, dy]);
  const gestes = [[-40, 4], [3, -40], [40, -5], [-4, -40], [-40, 0], [0, 40], [40, 0], [0, -40]];
  for (let i = 0; i < 16; i++) { await glisser(tel, ...gestes[i % gestes.length]); await tel.waitForTimeout(700); if (i === 6) await tel.screenshot({ path: dir + '/labyrinthe-4-telephone-320.png' }); }
  const doigt = await fini(tel), largeurPage = await tel.evaluate(() => document.documentElement.scrollWidth);
  // 4. Largeur PC : souris, glissements bouton enfoncé puis simples clics.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 12);
  const box = await pc.locator('.pj-cv').boundingBox(), mx = box.x + box.width / 2, my = box.y + box.height / 2;
  for (const [dx, dy] of [[-60, 0], [0, -60], [60, 0]]) { await pc.mouse.move(mx, my); await pc.mouse.down(); await pc.mouse.move(mx + dx, my + dy, { steps: 4 }); await pc.mouse.up(); await pc.waitForTimeout(900); }
  await pc.screenshot({ path: dir + '/labyrinthe-5-pc.png' });
  for (const [fx, fy] of [[0.1, 0.5], [0.5, 0.1], [0.9, 0.5], [0.5, 0.9]]) { await pc.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await pc.waitForTimeout(900); }
  const souris = await fini(pc);
  console.log(JSON.stringify({ clavier, appelsApresArret: apresArret, doigt, largeurPage, souris, erreurs: errs }, null, 1));
  await b.close();
})();
