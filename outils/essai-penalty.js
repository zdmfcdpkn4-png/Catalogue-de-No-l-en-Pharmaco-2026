// Aperçu du penalty au préparatoire hors du site : parties automatiques dans Chromium (souris, clavier, doigt), avec captures.
// Usage : node outils/essai-penalty.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/penalty.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opt, largeur) => {
    const p = await b.newPage(opt);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/penalty.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  const lancer = (p, duree, graine) => p.evaluate(([d, g]) => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.penalty(document.querySelector('#z'), { duree: d, graine: g, onFin: (n, t, brut) => { window.fois++; window.fin = [n, t, brut]; } }); }, [duree, graine]);
  const fin = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); return p.evaluate(() => window.fin); };
  // Un geste : glisser depuis le bas du canevas d'un vecteur (dx, dy) exprimé dans le repère logique (360 de large), puis lâcher.
  // ventre : le tracé s'écarte d'autant (en px logiques, positif vers la droite) à mi-chemin, ce qui donne de l'effet.
  const geste = async (p, dx, dy, pause, ventre) => {
    const r = await p.locator('.pj-cv').boundingBox(), k = r.width / 360, x0 = r.x + 180 * k, y0 = r.y + 440 * k;
    await p.mouse.move(x0, y0); await p.mouse.down();
    for (let i = 1; i <= 12; i++) await p.mouse.move(x0 + (dx * i / 12 + (ventre || 0) * Math.sin(Math.PI * i / 12)) * k, y0 + dy * k * i / 12);
    if (pause) await pause();
    await p.mouse.up();
  };
  // 1. Téléphone large, à la souris : dix tirs variés (lucarnes des deux côtés, plein axe, trop mou, trop fort, à côté).
  const p = await ouvrir({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 });
  await lancer(p, 50, 7);
  await p.waitForTimeout(500); await p.screenshot({ path: dir + '/penalty-1-depart.png' });
  const tirs = [[-55, -120], [58, -125], [0, -100], [-20, -18], [40, -185], [150, -110], [-60, -128], [62, -130], [-50, -90], [56, -122]];
  const choisir = async (p, i) => { const r = await p.locator('.pj-cv').boundingBox(), k = r.width / 360; await p.mouse.click(r.x + (66 + i * 114) * k, r.y + 461 * k); };
  for (const [i, [dx, dy]] of tirs.entries()) {
    // Tirs 7 et 8 : brossés, geste courbe (effet vers la gauche puis vers la droite). Tirs 9 et 10 : boulets.
    if (i === 6) await choisir(p, 1); if (i === 8) await choisir(p, 2);
    const ventre = i === 6 ? 30 : i === 7 ? -30 : 0;
    await geste(p, dx + (i === 6 ? 45 : i === 7 ? -45 : 0), dy, i === 1 ? () => p.screenshot({ path: dir + '/penalty-2-visee.png' }) : i === 6 ? () => p.screenshot({ path: dir + '/penalty-2-visee-brosse.png' }) : null, ventre);
    if (i === 6) { await p.waitForTimeout(420); await p.screenshot({ path: dir + '/penalty-3-vol-brosse.png' }); await p.waitForTimeout(1330); continue; }
    if (i === 1) { await p.waitForTimeout(300); await p.screenshot({ path: dir + '/penalty-3-vol.png' }); await p.waitForTimeout(500); await p.screenshot({ path: dir + '/penalty-4-bilan.png' }); await p.waitForTimeout(800); }
    else if (i === 3 || i === 4 || i === 5) { await p.waitForTimeout(1050); await p.screenshot({ path: dir + '/penalty-5-rate-' + i + '.png' }); await p.waitForTimeout(600); }
    else await p.waitForTimeout(1750);
  }
  const souris = await fin(p); await p.screenshot({ path: dir + '/penalty-6-fin.png' });
  // 2. Au clavier : viser à droite, monter la force, tirer à l'Espace. Puis laisser le temps s'écouler.
  await lancer(p, 9, 7); await p.mouse.move(2, 2);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(550); await p.keyboard.up('ArrowRight');
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(350); await p.keyboard.up('ArrowUp');
  await p.keyboard.press('Digit2'); await p.keyboard.down('Shift'); await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(500); await p.keyboard.up('ArrowLeft'); await p.keyboard.up('Shift');
  await p.screenshot({ path: dir + '/penalty-7-clavier.png' });
  await p.keyboard.press('Space'); await p.waitForTimeout(1200); await p.screenshot({ path: dir + '/penalty-8-clavier-tir.png' });
  const clavier = await fin(p);
  // 3. Arrêt en cours de partie : plus rien ne doit arriver ensuite.
  await lancer(p, 8); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(10500);
  const apresArret = await p.evaluate(() => window.fois);
  // 3 bis. Arrêt pendant le panneau de fin (minuterie en cours).
  await lancer(p, 6); await p.waitForTimeout(6400); await p.evaluate(() => window.stop()); await p.waitForTimeout(2500);
  const apresArretFin = await p.evaluate(() => window.fois);
  // 3 ter. Sans rien faire : note 0, brut 0, un seul appel.
  await lancer(p, 5); const immobile = [await fin(p), await p.evaluate(() => window.fois)];
  // 4. Téléphone de 320 px, au doigt.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true }, 296);
  await lancer(tel, 12, 7); await tel.waitForTimeout(800);
  const doigt = (type, x, y) => tel.evaluate(([t, x, y]) => { const c = document.querySelector('.pj-cv'), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(t, { pointerId: 11, pointerType: 'touch', buttons: t === 'pointerup' ? 0 : 1, pressure: t === 'pointerup' ? 0 : 0.5, clientX: r.left + r.width * x, clientY: r.top + r.height * y, bubbles: true, cancelable: true })); }, [type, x, y]);
  await doigt('pointerdown', 0.5, 0.9); for (let i = 1; i <= 8; i++) { await doigt('pointermove', 0.5 + i * 0.02, 0.9 - i * 0.033); await tel.waitForTimeout(30); }
  await tel.screenshot({ path: dir + '/penalty-9-telephone-320-visee.png' });
  await doigt('pointerup', 0.66, 0.636); await tel.waitForTimeout(1100);
  await tel.screenshot({ path: dir + '/penalty-10-telephone-320-bilan.png' });
  const telephone = [await fin(tel), await tel.evaluate(() => document.documentElement.scrollWidth)];
  await tel.screenshot({ path: dir + '/penalty-11-telephone-320-fin.png' });
  // 5. Largeur PC.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 8, 7); await pc.waitForTimeout(400);
  await geste(pc, -50, -118); await pc.waitForTimeout(1000);
  await pc.screenshot({ path: dir + '/penalty-12-pc.png' });
  // 6. Mouvement réduit : pas d'éclats ni de traînée, le jeu reste jouable.
  const calme = await ouvrir({ viewport: { width: 390, height: 560 }, reducedMotion: 'reduce' });
  await lancer(calme, 7, 7); await calme.waitForTimeout(400);
  await geste(calme, -55, -120); await calme.waitForTimeout(1000); await calme.screenshot({ path: dir + '/penalty-13-mouvement-reduit.png' });
  console.log(JSON.stringify({ souris, clavier, immobile, telephone, pc: await fin(pc), calme: await fin(calme), appelsApresArret: apresArret, appelsApresArretPendantLaFin: apresArretFin, erreurs: errs }, null, 1));
  await b.close();
})();
