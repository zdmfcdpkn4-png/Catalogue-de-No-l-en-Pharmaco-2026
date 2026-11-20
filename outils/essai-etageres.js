// Aperçu des étagères de la réserve hors du site : parties automatiques dans Chromium (clavier, doigts à 320 px avec la croix
// et le bouton Saut, souris en largeur PC), arrêt en cours de partie, avec captures.
// Usage : node outils/essai-etageres.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><p id="r"></p><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/etageres.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opts, largeur) => {
    const p = await b.newPage(opts);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/etageres.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.etageres(document.querySelector('#z'), { duree: d, onFin: (n, t, brut) => { window.fois++; window.fin = [n, t, brut]; } }); }, duree);
  const fini = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); await p.waitForTimeout(300); return p.evaluate(() => [window.fin, window.fois]); };
  // 1. Au clavier : le trajet de gauche, joué à l'aveugle (durées de marche et de montée), avec un saut par-dessus le vide du haut.
  const p = await ouvrir({ viewport: { width: 390, height: 640 }, deviceScaleFactor: 2 });
  await lancer(p, 30);
  await p.waitForTimeout(400); await p.screenshot({ path: dir + '/etageres-1-depart.png' });
  const tenir = async (page, touche, ms) => { await page.keyboard.down(touche); await page.waitForTimeout(ms); await page.keyboard.up(touche); };
  const montee = async (page, capture) => {
    await page.keyboard.down('ArrowUp');                                   // « haut » tenu : l'escabeau est pris dès qu'on passe à son pied
    await tenir(page, 'ArrowLeft', 520); await page.waitForTimeout(900);   // sol : 180 vers 130, puis montée
    await tenir(page, 'q', 480); await page.waitForTimeout(900);           // rayon 1 : 130 vers 84
    if (capture) await page.screenshot({ path: dir + '/etageres-2-jeu.png' });
    await tenir(page, 'ArrowRight', 280); await page.waitForTimeout(900);  // rayon 2 : 84 vers 110
    await tenir(page, 'd', 420); await page.waitForTimeout(900);           // rayon 3 : 110 vers 150
    await page.keyboard.up('ArrowUp');
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(330); await page.keyboard.press(' ');   // rayon 4 : saut du vide, puis le lot
    if (capture) { await page.waitForTimeout(200); await page.screenshot({ path: dir + '/etageres-3-saut.png' }); }
    await page.waitForTimeout(1500); await page.keyboard.up('ArrowRight');
  };
  await montee(p, true); await montee(p, false);
  const clavier = await fini(p);
  await p.screenshot({ path: dir + '/etageres-4-fin.png' });
  // 2. Arrêt en cours de partie : plus rien ne doit arriver ensuite, même après la fin du chrono.
  await lancer(p, 10); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(12500);
  const apresArret = await p.evaluate(() => window.fois);
  // 3. Téléphone de 320 px : deux doigts, l'un sur la croix (il glisse sans se lever), l'autre sur le bouton Saut.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true }, 296);
  await lancer(tel, 16);
  const doigt = (page, type, id, x, y) => page.evaluate(([type, id, x, y]) => {
    const c = document.querySelector('.pj-cv'), r = c.getBoundingClientRect(), k = r.width / 360;
    c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.left + x * k, clientY: r.top + y * k, buttons: 1, pressure: 0.5, bubbles: true, cancelable: true }));
  }, [type, id, x, y]);
  await doigt(tel, 'pointerdown', 31, 56, 470);                            // croix : en haut à gauche (marche et prend l'escabeau)
  await tel.waitForTimeout(1500);
  await doigt(tel, 'pointermove', 31, 52, 486);                            // glisse vers la gauche sans lever le doigt
  await tel.waitForTimeout(250);
  await doigt(tel, 'pointerdown', 32, 284, 486);                           // second doigt : saut
  await tel.waitForTimeout(150); await tel.screenshot({ path: dir + '/etageres-5-telephone-320.png' });
  await doigt(tel, 'pointerup', 32, 284, 486);
  await doigt(tel, 'pointermove', 31, 56, 462); await tel.waitForTimeout(1600);   // puis en haut à gauche : escabeau suivant
  await doigt(tel, 'pointermove', 31, 110, 486); await tel.waitForTimeout(400);
  await doigt(tel, 'pointerdown', 33, 200, 250); await doigt(tel, 'pointerup', 33, 200, 250);     // toucher le rayonnage fait sauter aussi
  await tel.waitForTimeout(300); await doigt(tel, 'pointerup', 31, 110, 486);
  const tactile = await fini(tel), largeurPage = await tel.evaluate(() => [document.documentElement.scrollWidth, document.querySelector('.pj-cv').getBoundingClientRect().height]);
  await tel.screenshot({ path: dir + '/etageres-6-telephone-fin.png' });
  // 4. Largeur PC : la croix et le bouton répondent aussi à la souris.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 8);
  const box = await pc.locator('.pj-cv').boundingBox(), k = box.width / 360;
  await pc.mouse.move(box.x + 56 * k, box.y + 470 * k); await pc.mouse.down(); await pc.waitForTimeout(1500); await pc.mouse.up();
  await pc.mouse.click(box.x + 284 * k, box.y + 486 * k); await pc.waitForTimeout(250);
  await pc.screenshot({ path: dir + '/etageres-7-pc.png' });
  const souris = await fini(pc);
  console.log(JSON.stringify({ clavier, appelsApresArret: apresArret, tactile, largeurPageEtHauteurJeu: largeurPage, souris, erreurs: errs }, null, 1));
  await b.close();
})();
