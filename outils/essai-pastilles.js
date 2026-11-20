// Aperçu des pastilles effervescentes hors du site : parties automatiques dans Chromium (clavier, doigt à 320 px sur la
// croix et le bouton, souris en largeur PC), arrêt en cours de partie, mouvements réduits, avec captures.
// Usage : node outils/essai-pastilles.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><p id="r"></p><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/pastilles.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opts, largeur) => {
    const p = await b.newPage(opts);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/pastilles.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.pastilles(document.querySelector('#z'), { duree: d, onFin: (n, t, brut) => { window.fois++; window.fin = [n, t, brut]; } }); }, duree);
  const fini = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); await p.waitForTimeout(300); return p.evaluate(() => [window.fin, window.fois]); };
  const tenir = async (p, touche, ms) => { await p.keyboard.down(touche); await p.waitForTimeout(ms); await p.keyboard.up(touche); };
  // 1. Au clavier : on pose, on s'écarte de deux cases en tournant le coin, on attend la mousse, on recommence ailleurs.
  const p = await ouvrir({ viewport: { width: 390, height: 620 }, deviceScaleFactor: 2 });
  await lancer(p, 24);
  await p.waitForTimeout(400); await p.screenshot({ path: dir + '/pastilles-1-depart.png' });
  const tours = [['ArrowLeft', 'ArrowUp', 'ArrowRight'], ['d', 'z', 'q'], ['ArrowUp', 'ArrowLeft', 'ArrowDown'], ['q', 's', 'd']];
  for (let i = 0; i < 9; i++) {
    const [a, c, r] = tours[i % tours.length];
    await tenir(p, a, 330); await p.keyboard.press(' '); await tenir(p, r, 330); await tenir(p, c, 240);
    if (i === 1) { await p.waitForTimeout(700); await p.screenshot({ path: dir + '/pastilles-2-pastille.png' }); await p.waitForTimeout(500); await p.screenshot({ path: dir + '/pastilles-3-mousse.png' }); }
    else await p.waitForTimeout(1300);
  }
  const clavier = await fini(p);
  await p.screenshot({ path: dir + '/pastilles-4-fin.png' });
  // 2. Arrêt en cours de partie : plus rien ne doit arriver ensuite, même après la fin du chrono.
  await lancer(p, 8); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(10500);
  const apresArret = await p.evaluate(() => window.fois);
  // 3. Téléphone de 320 px : la croix tenue au doigt (avec glissement d'une flèche à l'autre) et le bouton de pose, deux doigts à la fois.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }, 296);
  await lancer(tel, 16);
  const doigt = (page, type, id, lx, ly) => page.evaluate(([type, id, lx, ly]) => {
    const c = document.querySelector('.pj-cv'), r = c.getBoundingClientRect(), k = r.width / 360;
    c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.left + lx * k, clientY: r.top + ly * k, buttons: 1, pressure: 0.5, bubbles: true, cancelable: true }));
  }, [type, id, lx, ly]);
  const CROIX = { 0: [92, 429], 1: [135, 472], 2: [92, 515], 3: [49, 472] };
  const suite = [[3, 1], [0, 3], [1, 0], [3, 2]];
  for (let i = 0; i < 6; i++) {
    const [a, c] = suite[i % suite.length];
    await doigt(tel, 'pointerdown', 31, ...CROIX[a]); await tel.waitForTimeout(350);
    await doigt(tel, 'pointerdown', 32, 272, 474); await doigt(tel, 'pointerup', 32, 272, 474);          // pose, le pouce gauche toujours sur la croix
    await doigt(tel, 'pointermove', 31, ...CROIX[(a + 2) % 4]); await tel.waitForTimeout(350);          // demi-tour sans lever le doigt
    await doigt(tel, 'pointermove', 31, ...CROIX[c]); await tel.waitForTimeout(250);
    if (i === 2) await tel.screenshot({ path: dir + '/pastilles-5-telephone-320.png' });
    await doigt(tel, 'pointerup', 31, ...CROIX[c]); await tel.waitForTimeout(1300);
  }
  const tactile = await fini(tel), largeurPage = await tel.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('.pj-cv').getBoundingClientRect().height]);
  // 4. Largeur PC, à la souris : clics sur les flèches (une case par clic) et sur le bouton.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 10);
  const box = await pc.locator('.pj-cv').boundingBox(), k = box.width / 360, clic = (lx, ly) => pc.mouse.click(box.x + lx * k, box.y + ly * k);
  for (const d of [3, 3, 0]) { await clic(...CROIX[d]); await pc.waitForTimeout(350); }
  await clic(272, 474); await pc.waitForTimeout(200);
  for (const d of [2, 1, 1]) { await clic(...CROIX[d]); await pc.waitForTimeout(300); }
  await pc.waitForTimeout(900); await pc.screenshot({ path: dir + '/pastilles-6-pc.png' });
  const souris = await fini(pc);
  // 5. Mouvements réduits : la partie se joue de la même façon, sans animations d'ambiance.
  const cal = await ouvrir({ viewport: { width: 390, height: 620 }, reducedMotion: 'reduce' });
  await lancer(cal, 6);
  await tenir(cal, 'ArrowLeft', 330); await cal.keyboard.press(' '); await tenir(cal, 'ArrowRight', 330); await tenir(cal, 'ArrowUp', 240);
  await cal.waitForTimeout(1250); await cal.screenshot({ path: dir + '/pastilles-7-mouvements-reduits.png' });
  const calme = await fini(cal);
  console.log(JSON.stringify({ clavier, appelsApresArret: apresArret, tactile, largeurPageEtHauteurCanevas: largeurPage, souris, calme, erreurs: errs }, null, 1));
  await b.close();
})();
