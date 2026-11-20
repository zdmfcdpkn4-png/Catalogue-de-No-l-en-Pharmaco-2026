// Aperçu du volley des poches hors du site : parties automatiques dans Chromium (souris, clavier, doigt), avec captures.
// Usage : node outils/essai-volley.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/volley.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opt, largeur) => {
    const p = await b.newPage(opt);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/volley.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.volley(document.querySelector('#z'), { duree: d, onFin: (n, t, brut) => { window.fois++; window.fin = [n, t, brut]; } }); }, duree);
  const fin = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); return p.evaluate(() => window.fin); };
  // 1. Téléphone large, à la souris. Un joueur automatique se place un peu en arrière de la poche : le banc lit la position
  //    de la poche en écoutant le seul appel à translate() du dessin, puis envoie des déplacements de souris.
  const p = await ouvrir({ viewport: { width: 390, height: 540 }, deviceScaleFactor: 2 });
  await p.evaluate(() => {
    const tr = CanvasRenderingContext2D.prototype.translate; window.balle = null;
    CanvasRenderingContext2D.prototype.translate = function (x, y) { window.balle = [x, y, performance.now()]; return tr.call(this, x, y); };
    window.suivre = on => { clearInterval(window.suiveur); if (on) window.suiveur = setInterval(() => {
      const c = document.querySelector('.pj-cv'); if (!c || !window.balle || performance.now() - window.balle[2] > 100) return;
      const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: r.left + (window.balle[0] - 13) / 360 * r.width, clientY: r.top + r.height * 0.9, bubbles: true, cancelable: true }));
    }, 16); };
  });
  await lancer(p, 30);
  await p.waitForTimeout(600); await p.screenshot({ path: dir + '/volley-1-depart.png' });
  await p.evaluate(() => window.suivre(true));
  await p.waitForTimeout(5000); await p.screenshot({ path: dir + '/volley-2-jeu-a.png' });
  await p.waitForTimeout(9000); await p.screenshot({ path: dir + '/volley-2-jeu-b.png' });
  const souris = await fin(p); await p.screenshot({ path: dir + '/volley-3-fin.png' });
  await p.evaluate(() => window.suivre(false));
  // 2. Au clavier : le préparateur doit avancer vers la droite, puis sauter (Espace).
  await lancer(p, 10); await p.mouse.move(2, 2);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(450); await p.keyboard.up('ArrowRight');
  await p.keyboard.press('Space'); await p.waitForTimeout(280); await p.screenshot({ path: dir + '/volley-4-clavier-saut.png' });
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(900); await p.keyboard.up('ArrowLeft'); await p.screenshot({ path: dir + '/volley-5-clavier-gauche.png' });
  const clavier = await fin(p);
  // 3. Arrêt en cours de partie : plus rien ne doit arriver ensuite.
  await lancer(p, 10); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(12500);
  const apresArret = await p.evaluate(() => window.fois);
  // 3 bis. Arrêt pendant le panneau de fin (minuterie en cours).
  await lancer(p, 10); await p.waitForTimeout(10400); await p.evaluate(() => window.stop()); await p.waitForTimeout(2500);
  const apresArretFin = await p.evaluate(() => window.fois);
  // 4. Téléphone de 320 px, au doigt : un doigt glisse (il dirige), un second touche (il fait sauter).
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true }, 296);
  await lancer(tel, 12); await tel.waitForTimeout(1500);
  const doigt = (type, x, id) => tel.evaluate(([t, x, id]) => { const c = document.querySelector('.pj-cv'), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(t, { pointerId: id, pointerType: 'touch', buttons: 1, pressure: 0.5, clientX: r.left + r.width * x, clientY: r.top + r.height * 0.93, bubbles: true, cancelable: true })); }, [type, x, id || 11]);
  await doigt('pointerdown', 0.15); for (let i = 0; i < 10; i++) { await doigt('pointermove', 0.15 + i * 0.025); await tel.waitForTimeout(60); }
  await tel.waitForTimeout(500); await doigt('pointerdown', 0.8, 12); await doigt('pointerup', 0.8, 12);
  await tel.waitForTimeout(260); await tel.screenshot({ path: dir + '/volley-6-telephone-320.png' });
  await doigt('pointerup', 0.4);
  const telephone = [await fin(tel), await tel.evaluate(() => document.documentElement.scrollWidth)];
  await tel.screenshot({ path: dir + '/volley-7-telephone-320-fin.png' });
  // 5. Largeur PC.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 9); const bx = await pc.locator('.pj-cv').boundingBox();
  for (let i = 0; i < 14; i++) { await pc.mouse.move(bx.x + bx.width * (0.25 + 0.15 * Math.sin(i / 3)), bx.y + 400); if (i % 4 === 3) await pc.mouse.down(), await pc.mouse.up(); await pc.waitForTimeout(250); }
  await pc.screenshot({ path: dir + '/volley-8-pc.png' });
  console.log(JSON.stringify({ souris, clavier, telephone, pc: await fin(pc), appelsApresArret: apresArret, appelsApresArretPendantLaFin: apresArretFin, erreurs: errs }));
  await b.close();
})();
