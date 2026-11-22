// Aperçu du sprint du couloir (saut de haies) hors du site : parties automatiques dans Chromium (souris, clavier, doigt,
// mouvement réduit), avec captures. Usage : node outils/essai-haies.js <dossier de captures>
const { chromium } = require('playwright');
const fs = require('fs');
const repo = require('path').join(__dirname, '..'), dir = require('path').resolve(process.argv[2] || '.');
fs.mkdirSync(dir, { recursive: true });
const ff = (fs.readFileSync(repo + '/index.html', 'utf8').match(/@font-face\{[^}]*\}/g) || []).join('').replace(/url\(fonts\//g, 'url(file://' + repo + '/fonts/');
const html = `<!doctype html><meta charset="utf-8"><style>${ff}body{margin:0;padding:12px;background:#EC7739;font-family:"Bricolage Grotesque",sans-serif}#z{width:366px}.pj-cv{display:block;border:3px solid #26076D;border-radius:14px;touch-action:none}</style><div id="z"></div><script src="file://${repo}/jeux.js"></script>`;
(async () => {
  fs.writeFileSync(dir + '/haies.html', html);
  const b = await chromium.launch();
  const errs = [];
  const ouvrir = async (opt, largeur) => {
    const p = await b.newPage(opt);
    p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('file://' + dir + '/haies.html');
    await p.evaluate(l => { if (l) document.querySelector('#z').style.width = l + 'px'; return document.fonts.ready; }, largeur);
    // Le joueur automatique lit l'état du jeu (option essai) et saute au milieu de la fenêtre : appui bref ou maintenu selon
    // l'obstacle, par de vrais événements (souris ou doigt sur le canevas). pilote(false) l'arrête.
    await p.evaluate(() => {
      window.pilote = (on, type) => {
        cancelAnimationFrame(window.piloteId); if (!on) return;
        const c = document.querySelector('.pj-cv'), ev = (cible, t) => { const r = c.getBoundingClientRect(); cible.dispatchEvent(new PointerEvent(t, { pointerId: 5, pointerType: type || 'mouse', buttons: 1, pressure: 0.5, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true })); };
        let vise = null;
        const tour = () => {
          const s = window.etat, o = s.file.slice(s.suivant, s.suivant + 3).find(o => !o.touche && o.x + o.w > s.x);
          if (o && o !== vise && s.sol && s.arret <= 0 && o.x - s.x <= (s.v * (o.grand ? 0.71 : 0.46) - o.w) / 2) { vise = o; ev(c, 'pointerdown'); setTimeout(() => ev(window, 'pointerup'), o.grand ? 420 : 60); }
          window.piloteId = requestAnimationFrame(tour);
        };
        tour();
      };
    });
    return p;
  };
  const lancer = (p, duree) => p.evaluate(([d, R]) => { window.fin = null; window.fois = 0; window.stop = PharmacoJeux.haies(document.querySelector('#z'), { duree: d, logo: 'file://' + R + '/img/logo-pharmacotechnie.webp', essai: s => { window.etat = s; }, onFin: (n, t, brut) => { window.fois++; window.fin = [n, t, brut]; } }); }, [duree, repo]);
  const fin = async p => { await p.waitForFunction(() => window.fin, null, { timeout: 90000 }); return p.evaluate(() => window.fin); };
  const etat = p => p.evaluate(() => ({ sauts: window.etat.sauts, grand: window.etat.grand, chutes: window.etat.chutes, francs: window.etat.francs, y: Math.round(window.etat.y) }));
  // 1. Téléphone large, à la souris, partie entière jouée par le joueur automatique.
  const p = await ouvrir({ viewport: { width: 390, height: 460 }, deviceScaleFactor: 2 });
  await lancer(p, 50); await p.waitForTimeout(700); await p.screenshot({ path: dir + '/haies-1-depart.png' });
  await p.evaluate(() => window.pilote(true));
  for (const [n, k] of [['2-petit-saut', o => !o.grand], ['3-grand-saut', o => o.k === 'chariot'], ['4-flaque', o => o.k === 'flaque'], ['5-rideau', o => !!o.bas]]) {
    await p.waitForFunction(k => { const s = window.etat, o = s.file[s.suivant]; return o && !s.sol && s.y > 30 && o.x - s.x < 30 && eval(k)(o); }, String(k), { timeout: 60000, polling: 'raf' });
    await p.screenshot({ path: dir + '/haies-' + n + '.png' });
  }
  const souris = [await fin(p), await etat(p)]; await p.screenshot({ path: dir + '/haies-6-fin.png' });
  await p.evaluate(() => window.pilote(false));
  // 2. Au clavier, sans joueur automatique : Espace bref puis Espace maintenu doivent donner un petit puis un grand saut ; ensuite on laisse tomber.
  await lancer(p, 12);
  await p.keyboard.down(' '); await p.waitForTimeout(50); await p.keyboard.up(' '); await p.waitForTimeout(200); const petit = await etat(p);
  await p.waitForTimeout(500); await p.keyboard.down('ArrowUp'); await p.waitForTimeout(450); const grand = await etat(p); await p.keyboard.up('ArrowUp');
  await p.waitForFunction(() => window.etat.arret > 0.5, null, { timeout: 20000, polling: 'raf' }); await p.screenshot({ path: dir + '/haies-7-chute.png' });
  const clavier = { petit, grand, fin: await fin(p) };
  // 2 bis. Double appui : le second, en plein saut, lance un salto (un seul par saut), qui donne de l'élan à la réception.
  await lancer(p, 6);
  await p.keyboard.down(' '); await p.waitForTimeout(40); await p.keyboard.up(' '); await p.waitForTimeout(60); await p.keyboard.down(' '); await p.waitForTimeout(40); await p.keyboard.up(' ');
  await p.waitForTimeout(150); await p.screenshot({ path: dir + '/haies-7b-salto.png' });
  await p.waitForTimeout(450);   // après la réception : le salto compte et l'élan a pris RH.gain d'un coup
  const salto = await p.evaluate(() => ({ saltos: window.etat.saltos, sauts: window.etat.sauts, grand: window.etat.grand, elan: Math.round(window.etat.elan) })); await fin(p);
  // 3. Arrêt en cours de partie, puis pendant le panneau de fin : plus rien ne doit arriver ensuite.
  await lancer(p, 10); await p.waitForTimeout(500); await p.evaluate(() => window.stop()); await p.waitForTimeout(12500);
  const apresArret = await p.evaluate(() => window.fois);
  await lancer(p, 10); await p.waitForTimeout(10400); await p.evaluate(() => window.stop()); await p.waitForTimeout(2500);
  const apresArretFin = await p.evaluate(() => window.fois);
  // 4. Sans toucher à rien (joueur immobile), 50 s.
  await lancer(p, 50); const immobile = await fin(p);
  // 5. Téléphone de 320 px, au doigt, joueur automatique.
  const tel = await ouvrir({ viewport: { width: 320, height: 568 }, deviceScaleFactor: 2, hasTouch: true }, 296);
  await lancer(tel, 20); await tel.evaluate(() => window.pilote(true, 'touch')); await tel.waitForTimeout(1200); await tel.screenshot({ path: dir + '/haies-8-telephone-320.png' });
  // 5 bis. Vrai doigt (écran tactile émulé) : l'appui fait sauter, son geste par défaut est annulé (pas de sélection ni de menu
  //         copier / coller sur un appui long), et rien n'est sélectionnable dans la zone de jeu.
  await tel.evaluate(() => { window.pilote(false); window.tactile = { avant: window.etat.sauts, annule: null }; document.querySelector('.pj-cv').addEventListener('touchstart', e => setTimeout(() => { window.tactile.annule = e.defaultPrevented; })); });
  await tel.waitForFunction(() => window.etat.sol && window.etat.arret <= 0, null, { polling: 'raf' });
  const bt = await tel.locator('.pj-cv').boundingBox(); await tel.touchscreen.tap(bt.x + bt.width / 2, bt.y + bt.height / 2); await tel.waitForTimeout(120);
  const tactile = await tel.evaluate(() => { const c = document.querySelector('.pj-cv'), z = document.querySelector('#z'); return { saut: window.etat.sauts > window.tactile.avant, gesteAnnule: window.tactile.annule, selection: [getComputedStyle(c).userSelect, getComputedStyle(z).userSelect, c.style.webkitTouchCallout] }; });
  await tel.evaluate(() => window.pilote(true, 'touch'));
  const telephone = [await fin(tel), await etat(tel), await tel.evaluate(() => document.documentElement.scrollWidth)];
  await tel.screenshot({ path: dir + '/haies-9-telephone-320-fin.png' });
  const apresPartie = await tel.evaluate(() => getComputedStyle(document.querySelector('#z')).userSelect);   // la sélection redevient possible une fois la partie rendue
  // 6. Mouvement réduit : décor fixe.
  const sobre = await ouvrir({ viewport: { width: 390, height: 460 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  await lancer(sobre, 12); await sobre.evaluate(() => window.pilote(true)); await sobre.waitForTimeout(4200); await sobre.screenshot({ path: dir + '/haies-10-mouvement-reduit.png' });
  const reduit = await fin(sobre);
  // 7. Largeur PC.
  const pc = await ouvrir({ viewport: { width: 1280, height: 800 } }, 640);
  await lancer(pc, 9); await pc.evaluate(() => window.pilote(true)); await pc.waitForTimeout(5000); await pc.screenshot({ path: dir + '/haies-11-pc.png' });
  console.log(JSON.stringify({ souris, clavier, salto, tactile, apresPartie, immobile, telephone, reduit, pc: await fin(pc), appelsApresArret: apresArret, appelsApresArretPendantLaFin: apresArretFin, erreurs: errs }, null, 1));
  await b.close();
})();
