// Aperçu du tennis de paillasse hors du site : parties automatiques dans Chromium (souris, clavier, doigt), avec captures.
// Usage : node outils/essai-tennis.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><script>var LOGO='file://${repo}/img/logo-pharmacotechnie.webp'</script><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/tennis.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opt, largeur) => {
    const p = await b.newPage(opt);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/tennis.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.tennis(document.querySelector('#z'), { duree: d, logo: LOGO, onFin: (n, t) => { window.fois++; window.fin = [n, t]; } }); }, duree);
  const fin = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); return p.evaluate(() => window.fin); };
  // 1. Téléphone large, à la souris. Un joueur automatique suit le comprimé : le banc lit sa position en écoutant le seul
  //    appel à translate() du dessin, puis envoie des déplacements de souris, avec un léger décalage pour donner de l'angle.
  const p = await ouvrir({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 });
  await p.evaluate(() => {
    const tr = CanvasRenderingContext2D.prototype.translate; window.balle = null;
    CanvasRenderingContext2D.prototype.translate = function (x, y) { window.balle = [x, y, performance.now()]; return tr.call(this, x, y); };
    window.suivre = on => { clearInterval(window.suiveur); if (on) window.suiveur = setInterval(() => {
      const c = document.querySelector('.pj-cv'); if (!c || !window.balle || performance.now() - window.balle[2] > 100) return;
      const r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse', clientX: r.left + (window.balle[0] + 20) / 360 * r.width, clientY: r.top + r.height * 0.8, bubbles: true, cancelable: true }));
    }, 16); };
  });
  await lancer(p, 30);
  await p.waitForTimeout(600); await p.screenshot({ path: dir + '/tennis-1-depart.png' });
  await p.evaluate(() => window.suivre(true));
  await p.waitForTimeout(5000); await p.screenshot({ path: dir + '/tennis-2-jeu-a.png' });
  await p.waitForTimeout(9000); await p.screenshot({ path: dir + '/tennis-2-jeu-b.png' });
  const souris = await fin(p); await p.screenshot({ path: dir + '/tennis-3-fin.png' });
  await p.evaluate(() => window.suivre(false));
  // 2. Au clavier : la spatule doit avoir bougé vers la gauche puis vers la droite.
  await lancer(p, 10); await p.mouse.move(2, 2);
  await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(700); await p.keyboard.up('ArrowLeft'); await p.screenshot({ path: dir + '/tennis-4-clavier-gauche.png' });
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(1400); await p.keyboard.up('ArrowRight'); await p.screenshot({ path: dir + '/tennis-5-clavier-droite.png' });
  const clavier = await fin(p);
  // 3. Arrêt en cours de partie : plus rien ne doit arriver ensuite.
  await lancer(p, 10); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(12500);
  const apresArret = await p.evaluate(() => window.fois);
  // 3 bis. Arrêt pendant le panneau de fin (minuterie en cours).
  await lancer(p, 10); await p.waitForTimeout(10400); await p.evaluate(() => window.stop()); await p.waitForTimeout(2500);
  const apresArretFin = await p.evaluate(() => window.fois);
  // 4. Téléphone de 320 px, au doigt.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true }, 296);
  await lancer(tel, 12); await tel.waitForTimeout(1500);
  const doigt = (type, x) => tel.evaluate(([t, x]) => { const c = document.querySelector('.pj-cv'), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(t, { pointerId: 11, pointerType: 'touch', buttons: 1, pressure: 0.5, clientX: r.left + r.width * x, clientY: r.top + r.height * 0.85, bubbles: true, cancelable: true })); }, [type, x]);
  await doigt('pointerdown', 0.5); for (let i = 0; i < 12; i++) { await doigt('pointermove', 0.5 - i * 0.03); await tel.waitForTimeout(60); }
  await tel.waitForTimeout(300); await tel.screenshot({ path: dir + '/tennis-6-telephone-320.png' });
  await doigt('pointerup', 0.2);
  const telephone = [await fin(tel), await tel.evaluate(() => document.documentElement.scrollWidth)];
  await tel.screenshot({ path: dir + '/tennis-7-telephone-320-fin.png' });
  // 5. Largeur PC.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 9); const bx = await pc.locator('.pj-cv').boundingBox();
  for (let i = 0; i < 14; i++) { await pc.mouse.move(bx.x + bx.width * (0.5 + 0.25 * Math.sin(i / 3)), bx.y + 400); await pc.waitForTimeout(250); }
  await pc.screenshot({ path: dir + '/tennis-8-pc.png' });
  console.log(JSON.stringify({ souris, clavier, telephone, pc: await fin(pc), appelsApresArret: apresArret, appelsApresArretPendantLaFin: apresArretFin, erreurs: errs }));
  await b.close();
})();
