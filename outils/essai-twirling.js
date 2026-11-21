// Aperçu de la parade de la spatule hors du site : parties automatiques dans Chromium (souris, clavier, doigt), avec captures.
// Usage : node outils/essai-twirling.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/twirling.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opt, largeur) => {
    const p = await b.newPage(opt);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/twirling.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    return p;
  };
  // espion : le jeu confie son état au banc, qui s'en sert pour frapper comme un joueur appliqué.
  const lancer = (p, duree) => p.evaluate(d => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.twirling(document.querySelector('#z'), { duree: d, espion: s => { window.etat = s; }, onFin: (n, t, brut) => { window.fois++; window.fin = [n, t, brut]; } }); }, duree);
  const fin = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); return p.evaluate(() => window.fin); };
  const bilan = p => p.evaluate(() => { clearInterval(window.auto); const s = window.etat; return { points: s.points, pris: s.pris, parfaits: s.q[3], tombees: s.tombees, vides: s.vides, serie: s.meilleure, retombees: s.choree.length, max: s.max }; });
  // Un joueur automatique : quand une spatule arrive dans un gant, il frappe le bon côté (type : mouse, touch ou clavier).
  const joueur = (p, type) => p.evaluate(type => {
    const c = () => document.querySelector('.pj-cv'), faits = new Map();
    clearInterval(window.auto);
    window.auto = setInterval(() => {
      const s = window.etat; if (!s || s.fini) return;
      for (const b of s.batons) {
        if (b.etat !== 'vol' || faits.get(b) === b.t1 || s.t + s.acc < b.t1 - 0.012) continue;
        faits.set(b, b.t1);
        if (type === 'clavier') window.dispatchEvent(new KeyboardEvent('keydown', { key: b.m1 ? 'ArrowRight' : 'ArrowLeft', bubbles: true, cancelable: true }));
        else { const r = c().getBoundingClientRect(); c().dispatchEvent(new PointerEvent('pointerdown', { pointerId: 5, pointerType: type, button: 0, buttons: 1, clientX: r.left + (b.m1 ? 0.75 : 0.25) * r.width, clientY: r.top + 0.8 * r.height, bubbles: true, cancelable: true })); }
      }
    }, 4);
  }, type);
  // 1. Téléphone large, à la souris : de vrais clics d'abord (un dans le vide, puis sur la bonne main), l'automate ensuite.
  const p = await ouvrir({ viewport: { width: 390, height: 560 }, deviceScaleFactor: 2 });
  await lancer(p, 50);
  await p.waitForTimeout(500); await p.screenshot({ path: dir + '/twirling-1-depart.png' });
  const bx = await p.locator('.pj-cv').boundingBox();
  await p.mouse.click(bx.x + bx.width * 0.25, bx.y + bx.height * 0.5);
  await p.waitForTimeout(120); await p.screenshot({ path: dir + '/twirling-2-vide.png' });
  const apresVide = await p.evaluate(() => ({ vides: window.etat.vides, pris: window.etat.pris }));
  await p.waitForFunction(() => { const b = window.etat.batons[0]; return b.etat === 'vol' && window.etat.t >= b.t1 - 0.02; });
  const cote = await p.evaluate(() => window.etat.batons[0].m1);
  await p.mouse.click(bx.x + bx.width * (cote ? 0.75 : 0.25), bx.y + bx.height * 0.5);
  const vraiClic = await p.evaluate(() => ({ pris: window.etat.pris, points: window.etat.points }));
  await p.waitForTimeout(150); await p.screenshot({ path: dir + '/twirling-3-rattrape.png' });
  await joueur(p, 'mouse');
  await p.waitForTimeout(9000); await p.screenshot({ path: dir + '/twirling-4-jeu.png' });
  await p.waitForFunction(() => window.etat.t > window.etat.batons[1].entree + 0.9); await p.screenshot({ path: dir + '/twirling-5-final-annonce.png' });
  await p.waitForTimeout(6000); await p.screenshot({ path: dir + '/twirling-6-final.png' });
  const souris = await fin(p); await p.screenshot({ path: dir + '/twirling-7-fin.png' });
  const etatSouris = await bilan(p);
  // 2. Au clavier : de vraies touches (une flèche du bon côté au bon moment, puis F ou J), l'automate ensuite.
  await lancer(p, 30); await p.mouse.move(2, 2);
  const touche = async noms => { await p.waitForFunction(() => { const b = window.etat.batons[0]; return b.etat === 'vol' && window.etat.t >= b.t1 - 0.02; }); await p.keyboard.press(noms[await p.evaluate(() => window.etat.batons[0].m1)]); return p.evaluate(() => window.etat.pris); };
  const vraiesTouches = [await touche(['ArrowLeft', 'ArrowRight']), await touche(['f', 'j'])];
  await joueur(p, 'clavier');
  const clavier = await fin(p), etatClavier = await bilan(p);
  // 3. Une chute : personne ne joue, la spatule tombe et le préparateur la ramasse.
  await lancer(p, 8); await p.waitForFunction(() => window.etat.batons[0].etat === 'sol'); await p.waitForTimeout(150); await p.screenshot({ path: dir + '/twirling-8-chute.png' });
  // 3 bis. Arrêt en cours de partie : plus rien ne doit arriver ensuite.
  await p.evaluate(() => { window.fois = 0; window.stop(); }); await p.waitForTimeout(9500);
  const apresArret = await p.evaluate(() => window.fois);
  // 3 ter. Arrêt pendant le panneau de fin (minuterie en cours).
  await lancer(p, 5); await p.waitForTimeout(5400); await p.evaluate(() => window.stop()); await p.waitForTimeout(2500);
  const apresArretFin = await p.evaluate(() => window.fois);
  // 4. Téléphone de 320 px, au doigt, mouvements réduits.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: 'reduce' }, 296);
  await lancer(tel, 45);
  await tel.waitForTimeout(600); await tel.screenshot({ path: dir + '/twirling-9-telephone-320-depart.png' });
  const tb = await tel.locator('.pj-cv').boundingBox();
  await tel.waitForFunction(() => { const b = window.etat.batons[0]; return b.etat === 'vol' && window.etat.t >= b.t1 - 0.02; });
  await tel.touchscreen.tap(tb.x + tb.width * ((await tel.evaluate(() => window.etat.batons[0].m1)) ? 0.75 : 0.25), tb.y + tb.height * 0.9);
  const vraiDoigt = await tel.evaluate(() => window.etat.pris);
  await joueur(tel, 'touch');
  await tel.waitForFunction(() => window.etat.t > window.etat.batons[1].entree + 5); await tel.screenshot({ path: dir + '/twirling-10-telephone-320-final.png' });
  const telephone = [await fin(tel), await tel.evaluate(() => document.documentElement.scrollWidth), await bilan(tel)];
  await tel.screenshot({ path: dir + '/twirling-11-telephone-320-fin.png' });
  // 5. Largeur PC, sans jouer : note 0 et score brut 0.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 6); await pc.waitForTimeout(2600); await pc.screenshot({ path: dir + '/twirling-12-pc.png' });
  const immobile = await fin(pc);
  // 6. Taper à tout-va sur les deux côtés : cela ne doit rien rapporter.
  await lancer(pc, 10);
  await pc.evaluate(() => { let m = 0; window.auto = setInterval(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: (m = 1 - m) ? 'ArrowRight' : 'ArrowLeft', bubbles: true, cancelable: true })); }, 60); });
  const tapoteur = await fin(pc); await pc.evaluate(() => clearInterval(window.auto));
  console.log(JSON.stringify({ souris, etatSouris, apresVide, vraiClic, clavier, etatClavier, vraiesTouches, telephone, vraiDoigt, immobile, tapoteur, appelsApresArret: apresArret, appelsApresArretPendantLaFin: apresArretFin, erreurs: errs }, null, 1));
  await b.close();
})();
