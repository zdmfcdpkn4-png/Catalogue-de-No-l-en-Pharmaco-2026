// Aperçu du basket du pilulier hors du site : parties automatiques dans Chromium (souris, clavier, doigt), avec captures.
// Usage : node outils/essai-basket.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/basket.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opt, largeur) => {
    const p = await b.newPage(opt);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/basket.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  // espion : le jeu confie son état au banc, qui s'en sert pour viser comme un joueur appliqué.
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.basket(document.querySelector('#z'), { duree: d, espion: s => { window.etat = s; }, onFin: (n, t, brut, chiffres) => { window.fois++; window.fin = [n, t, brut, chiffres]; } }); }, duree);
  const fin = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); return p.evaluate(() => window.fin); };
  // Un joueur automatique : dès que le comprimé est prêt, il fait le geste glissé-lâché qui vise le pilulier (type = mouse ou touch).
  const joueur = (p, type) => p.evaluate(type => {
    const J = PharmacoJeux._coeur, R = J.REGL_BASKET, c = () => document.querySelector('.pj-cv');
    const ev = (t, x, y, btn) => { const r = c().getBoundingClientRect(); c().dispatchEvent(new PointerEvent(t, { pointerId: 5, pointerType: type, buttons: btn, pressure: btn ? 0.5 : 0, clientX: r.left + x / 360 * r.width, clientY: r.top + y / 360 * r.width, bubbles: true, cancelable: true })); };
    clearInterval(window.auto); window.gestes = 0;
    window.auto = setInterval(() => {
      const s = window.etat; if (!s || s.fini || s.balles.length >= R.vol || s.attente > 0 || window.enGeste) return;
      window.enVol = Math.max(window.enVol || 0, s.balles.length + 1);
      const v = J.viseBasket(s, -780); if (!v) return;
      window.enGeste = true; window.gestes++;
      const x0 = 180, y0 = 440, x1 = x0 + v.vx / R.k, y1 = y0 - 780 / R.k;
      ev('pointerdown', x0, y0, 1); ev('pointermove', (x0 + x1) / 2, (y0 + y1) / 2, 1); ev('pointermove', x1, y1, 1);
      setTimeout(() => { ev('pointerup', x1, y1, 0); window.enGeste = false; }, 30);
    }, 40);
  }, type);
  // 1. Téléphone large, à la souris.
  const p = await ouvrir({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 });
  await lancer(p, 30);
  await p.waitForTimeout(700); await p.screenshot({ path: dir + '/basket-1-depart.png' });
  // Un geste tenu, pour la capture de la visée.
  const bx = await p.locator('.pj-cv').boundingBox(), k = bx.width / 360;
  await p.mouse.move(bx.x + 180 * k, bx.y + 440 * k); await p.mouse.down(); await p.mouse.move(bx.x + 215 * k, bx.y + 300 * k, { steps: 5 });
  await p.waitForTimeout(150); await p.screenshot({ path: dir + '/basket-2-visee.png' }); await p.mouse.up();
  await p.waitForTimeout(700); await p.screenshot({ path: dir + '/basket-2-vol.png' });
  await joueur(p, 'mouse');
  await p.waitForTimeout(6000); await p.screenshot({ path: dir + '/basket-3-jeu-a.png' });
  await p.waitForTimeout(12000); await p.screenshot({ path: dir + '/basket-3-jeu-b.png' });
  const souris = await fin(p); await p.screenshot({ path: dir + '/basket-4-fin.png' });
  const etatSouris = await p.evaluate(() => { clearInterval(window.auto); const s = window.etat; return { points: s.points, paniers: s.paniers, directs: s.directs, lances: s.lances, gestes: window.gestes }; });
  // 2. Au clavier : viser à droite, forcer, lancer ; le comprimé doit partir (un lancer compté).
  await lancer(p, 8); await p.mouse.move(2, 2);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight');
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(400); await p.keyboard.up('ArrowUp');
  await p.screenshot({ path: dir + '/basket-5-clavier-visee.png' });
  await p.keyboard.press('Space'); await p.waitForTimeout(450); await p.screenshot({ path: dir + '/basket-6-clavier-lance.png' });
  const lancesClavier = await p.evaluate(() => window.etat.lances);
  const clavier = await fin(p);
  // 3. Arrêt en cours de partie : plus rien ne doit arriver ensuite.
  await lancer(p, 6); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(8500);
  const apresArret = await p.evaluate(() => window.fois);
  // 3 bis. Arrêt pendant le panneau de fin (minuterie en cours).
  await lancer(p, 5); await p.waitForTimeout(5400); await p.evaluate(() => window.stop()); await p.waitForTimeout(2500);
  const apresArretFin = await p.evaluate(() => window.fois);
  // 4. Téléphone de 320 px, au doigt, effets réduits.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' }, 296);
  await lancer(tel, 20); await joueur(tel, 'touch');
  await tel.waitForTimeout(9000); await tel.screenshot({ path: dir + '/basket-7-telephone-320.png' });
  const telephone = [await fin(tel), await tel.evaluate(() => document.documentElement.scrollWidth), await tel.evaluate(() => ({ paniers: window.etat.paniers, lances: window.etat.lances }))];
  await tel.screenshot({ path: dir + '/basket-8-telephone-320-fin.png' });
  // 5. Largeur PC, sans jouer : la note doit être 0.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 5); await pc.waitForTimeout(2500); await pc.screenshot({ path: dir + '/basket-9-pc.png' });
  console.log(JSON.stringify({ souris, etatSouris, clavier, lancesClavier, telephone, pc: await fin(pc), appelsApresArret: apresArret, appelsApresArretPendantLaFin: apresArretFin, erreurs: errs }, null, 1));
  await b.close();
})();
