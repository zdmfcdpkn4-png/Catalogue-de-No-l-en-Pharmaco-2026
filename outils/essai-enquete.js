// Banc d'essai du bloc d'enquête des brigades (enquete.js), sans serveur : un faux serveur vit dans la page.
// Tout est factice ici (titre, fiches, énigmes) : le vrai scénario reste dans la banque chiffrée du serveur.
//   node outils/essai-enquete.js [dossier des captures]
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const dossier = process.argv[2] || path.join(require('os').tmpdir(), 'essai-enquete');
fs.mkdirSync(dossier, { recursive: true });
const racine = path.join(__dirname, '..');
let echecs = 0;
const ok = (cond, texte) => { console.log((cond ? 'OK   ' : 'ECHEC ') + texte); if (!cond) echecs++; };

(async () => {
  const source = fs.readFileSync(path.join(racine, 'enquete.js'), 'utf8');
  // Le fichier ne doit porter aucun texte du scénario : ni constante de titre ou de fiches, ni nom propre entre guillemets.
  ok(!/const (CRIME|FICHES|TITRE)\b/.test(source) && !/nom: "/.test(source) && !/\u2014/.test(source), 'enquete.js ne déclare ni titre, ni fiche, ni tiret cadratin');

  // La notice reprend les classes de la notice des Pharmacogames : leurs règles sont lues dans enigme.js, les couleurs
  // du site (variables de index.html) sont remplacées par des valeurs d'essai.
  const regles = fs.readFileSync(path.join(racine, 'enigme.js'), 'utf8').split('\n').filter(l => /^\.eg-(notice|bd|panel\{)/.test(l) || /^@media.*\.eg-(bd|notice)/.test(l)).join('\n').replace(/\\\\/g, '\\');
  const habit = ':root{--surface:#FFFBF2;--on-surface:#26076D;--line:#26076D;--shadow:#26076D;--mu:#F3D95B;--muted:#5B4A8A}' + regles;
  ok(/\.eg-bd\{[^}]*overflow-x:auto/.test(regles) && /\.eg-notice>summary/.test(regles), 'enigme.js porte bien les styles de la notice que le bloc réutilise');
  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 390, height: 844 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  await page.setContent('<!doctype html><html lang="fr"><meta charset="utf-8"><body style="margin:0;font-family:sans-serif"><section id="zone"></section></body></html>');
  await page.addStyleTag({ content: habit });
  await page.addScriptTag({ path: path.join(racine, 'enquete.js') });
  await page.evaluate(() => {
    const cats = ['Personnages', 'Lieux', 'Objets'];
    const fiches = []; cats.forEach((cat, c) => { for (let i = 1; i <= 6; i++) fiches.push({ id: 'f' + c + i, cat, nom: cat.slice(0, -1) + ' factice ' + i }); });
    const A = [{ n: 1, titre: 'Message factice', texte: 'Une surprise demain.' }, { n: 2, titre: 'Synopsis factice', texte: 'Le synopsis.' }, { n: 3, titre: 'Tableaux factices', texte: 'Voici la fiche.', fiche: true }];
    const S = window.S = {
      fiche: true, envois: [], A,
      Q: {
        titre: 'Affaire factice', fiction: true, points: 1, max: 30, amorces: A, fiches,
        enigmes: [
          { k: 1, jour: 4, etat: 'close', titre: 'Factice un', enonce: 'Énoncé factice un.', saisie: 'choix', options: ['A', 'B'], repondu: true, juste: true, resolue: true, revelation: 'Une carte factice sort du jeu.', elimine: 'f21' },
          { k: 2, jour: 5, etat: 'close', titre: 'Factice deux', enonce: 'Énoncé factice deux.', saisie: 'texte', repondu: true, juste: true, resolue: false, revelation: 'Un indice factice, donné d\'office.' },
          { k: 3, jour: 6, etat: 'ouverte', titre: 'Factice trois', enonce: 'Combien font 1 + 1 ?', saisie: 'choix', options: ['1', '2', '3'], repondu: false },
          { k: 4, jour: 7, etat: 'ouverte', titre: 'Factice quatre', enonce: 'Écrivez le nombre 7 en lettres.', saisie: 'texte', repondu: false },
          { k: 5, jour: 8, etat: 'avenir' },
        ],
        classement: [{ b: 0, points: 1 }, { b: 1, points: 2 }, { b: 2, points: 0 }],
      },
    };
    // Faux serveur : une réponse par membre, enregistrée sans dire si elle est juste.
    S.envoyer = async (k, reponse) => {
      S.envois.push([k, reponse]);
      const e = S.Q.enigmes.find(x => x.k === k);
      if (!e || e.etat !== 'ouverte') return { status: 403, j: { error: 'close' } };
      if (e.repondu) return { status: 409, j: { error: 'deja', enquete: S.Q } };
      e.repondu = true; e.reponse = reponse; e.deposes = 1;
      return { status: 200, j: { ok: true, enquete: S.Q } };
    };
    S.bloc = window.PharmacoEnquete.monter(document.getElementById('zone'), {
      envoyer: (k, r) => S.envoyer(k, r), peutRepondre: () => S.fiche, identifier: () => { S.demandeFiche = true; }, brigade: b => 'Brigade ' + (b + 1), mienne: () => 0,
    });
    S.bloc.maj(S.Q);
  });
  const txt = async sel => ((await page.locator(sel).first().textContent()) || '').replace(/\u00A0/g, ' ').trim();
  const zone = () => page.locator('#zone').innerText();

  ok((await txt('.enq-fic')) === 'Fiction' && (await txt('#zone h3')) === 'Affaire factice', 'titre et mention « Fiction » viennent du serveur');
  ok(await page.locator('#enqT1').innerText() === '2 énigmes à résoudre' && await page.locator('li[data-k="3"] [data-rep]').count() === 1, 'deux énigmes ouvertes à résoudre');
  ok(await page.locator('.enq-cols li').count() === 18 && await page.locator('.enq-cols h5').count() === 3, 'fiche de suivi : dix-huit fiches en trois colonnes, venues du serveur');
  ok(await page.locator('.enq-cols li.x').count() === 1 && (await txt('.enq-cols li.x')).includes('Objet factice 1'), 'fiche de suivi : la carte éliminée est cochée');
  ok((await txt('.enq-ind')).includes('donné d\'office'), 'carnet d\'indices : la révélation d\'office y figure');
  ok((await txt('details li[data-k="2"]')).includes('non acquise'), 'énigme close non acquise : dite comme telle, même si ma réponse était juste');
  ok((await txt('details li[data-k="1"]')).includes('acquise') && (await txt('details li[data-k="1"]')).includes('Votre réponse était juste'), 'énigme close acquise : majorité juste');
  ok(await page.locator('li[data-k="5"]').count() === 0 && (await txt('.enq-next')).includes('8 décembre'), 'énigme à venir : rien que sa date');
  await page.screenshot({ path: path.join(dossier, '1-accueil.png'), fullPage: true });

  // Répondre sans rien choisir : erreur, aucun envoi.
  await page.click('[data-rep="3"]');
  ok((await txt('li[data-k="3"] .enq-err')).includes('Choisissez'), 'réponse vide refusée par la page');
  await page.check('input[name="enq3"][value="0"]');
  await page.click('[data-rep="3"]');
  ok((await txt('li[data-k="3"] .enq-warn')).includes('réponse majoritaire') && (await txt('li[data-k="3"] .enq-warn')).includes('définitive'), 'avertissement avant le dépôt : réponse unique, majorité de la brigade');
  await page.screenshot({ path: path.join(dossier, '2-avertissement.png'), fullPage: true });
  await page.click('[data-non="3"]');
  ok((await page.evaluate(() => window.S.envois.length)) === 0, 'renoncer n\'envoie rien');
  // Dépôt confirmé : scellé, sans dire juste ou faux, plus de formulaire.
  await page.click('[data-rep="3"]');
  await page.click('[data-envoi="3"]');
  await page.waitForSelector('#enqT6');
  const t3 = await txt('li[data-k="3"]');
  ok(t3.includes('déposée et scellée') && t3.includes('« 1 »') && t3.includes('le 9 décembre') && !/juste|bonne|fausse/i.test(t3), 'après le dépôt : réponse rappelée, date du résultat, aucun indice sur sa justesse');
  ok(await page.locator('li[data-k="3"] [data-rep]').count() === 0 && await page.locator('#enqT1').innerText() === '1 énigme à résoudre', 'après le dépôt : plus de formulaire, l\'énigme passe en « réponses scellées »');
  ok(JSON.stringify(await page.evaluate(() => window.S.envois)) === '[[3,0]]', 'un choix part sous forme d\'indice entier');
  await page.fill('#enq4', ' Sept ');
  await page.click('[data-rep="4"]');
  await page.click('[data-envoi="4"]');
  await page.waitForFunction(() => document.querySelector('#enqT6').textContent.includes('2 réponses'));
  ok(JSON.stringify(await page.evaluate(() => window.S.envois[1])) === '[4,"Sept"]', 'un texte part tel que saisi, espaces de bord retirés');
  ok((await txt('.enq-pts')).includes('1 point'), 'aucun point avant la clôture');
  // Clôture de la 3 : majorité juste, la carte se coche.
  await page.evaluate(() => { const Q = window.S.Q, e = Q.enigmes[2]; Object.assign(e, { etat: 'close', resolue: true, juste: false, revelation: 'Une autre carte factice sort du jeu.', elimine: 'f12' }); Q.points = 2; window.S.bloc.maj(Q); });
  ok(await page.locator('.enq-cols li.x').count() === 2 && (await txt('details li[data-k="3"]')).includes('Votre réponse ne l\'était pas'), 'clôture : la fiche de suivi suit, et ma réponse fausse est dite');
  // Sans fiche ni brigade : énoncé visible, pas de formulaire.
  await page.evaluate(() => { const Q = window.S.Q; Q.enigmes[4] = { k: 5, jour: 8, etat: 'ouverte', titre: 'Factice cinq', enonce: 'Énoncé factice cinq.', saisie: 'texte', repondu: false }; window.S.fiche = false; window.S.bloc.maj(Q); });
  ok((await txt('li[data-k="5"]')).includes('Énoncé factice cinq') && await page.locator('li[data-k="5"] [data-rep]').count() === 0, 'sans fiche : énoncé visible, pas de réponse possible');
  await page.click('[data-fiche]');
  ok(await page.evaluate(() => window.S.demandeFiche === true), 'sans fiche : le bouton renvoie à l\'identification');
  // Refus du serveur.
  await page.evaluate(() => { window.S.fiche = true; window.S.envoyer = async () => ({ status: 403, j: { error: 'close' } }); window.S.bloc.maj(window.S.Q); });
  await page.fill('#enq5', 'essai');
  await page.click('[data-rep="5"]');
  await page.click('[data-envoi="5"]');
  await page.waitForSelector('li[data-k="5"] .enq-err');
  ok((await txt('li[data-k="5"] .enq-err')).includes('close'), 'refus du serveur affiché');
  await page.evaluate(() => { window.S.Q.denouement = 'Texte de dénouement factice.'; window.S.bloc.maj(window.S.Q); });
  ok((await txt('#enqT4 + p')).includes('factice'), 'dénouement affiché quand le serveur le donne');
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.screenshot({ path: path.join(dossier, '3-large.png'), fullPage: true });
  const large = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  await page.setViewportSize({ width: 320, height: 700 });
  ok(large && await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'pas de défilement horizontal à 320 px ni à 1100 px');
  ok(!/—/.test(await page.content()), 'aucun tiret cadratin affiché');

  // Amorce stricte : on ne montre que ce que les étapes reçues autorisent, même si des énigmes sont ouvertes.
  const amorce = n => page.evaluate(n => { const Q = window.S.Q; Q.amorces = window.S.A.slice(0, n); window.S.bloc.maj(Q); }, n);
  await amorce(0);
  ok(await page.locator('#zone').isHidden() && (await page.locator('#zone').innerHTML()) === '', 'aucune étape reçue : le bloc ne montre rien, énigmes ouvertes ou non');
  await amorce(1);
  const t1 = await zone();
  ok(t1.includes('Une surprise demain') && !/Affaire|Fiction|Fiche de suivi|nigme|point/i.test(t1), 'étape 1 : le message seul');
  await amorce(2);
  const t2 = await zone();
  ok(t2.includes('Affaire factice') && t2.includes('Le synopsis.') && await page.locator('.enq-cols').count() === 0 && await page.locator('.enq-l').count() === 0, 'étape 2 : titre et synopsis, ni fiche ni énigme');
  await amorce(3);
  ok(await page.locator('.enq-cols li').count() === 18 && (await txt('.enq-am')).includes('Tableaux factices') && await page.locator('li[data-k="5"]').count() === 1, 'étape 3 : fiche de suivi et énigmes');
  // Notice en BD : en tête du bloc dès l'étape de la fiche, dépliée, jamais repliée par le script.
  const N = '#zone > details#enqNotice';
  ok(await page.locator(N).isVisible() && await page.locator('#zone > :first-child').evaluate(n => n.id === 'enqNotice' && n.open) && await page.locator(N + ' .eg-bd img').count() === 6
    && (await page.locator(N + ' .eg-bd img').evaluateAll(L => L.map(i => i.getAttribute('src')).join())) === [1, 2, 3, 4, 5, 6].map(i => 'img/notice-enquete-' + i + '.svg').join()
    && (await page.locator(N + ' .eg-bd img').evaluateAll(L => L.every((i, n) => i.alt.startsWith('Case ' + (n + 1) + ',') && i.alt.length > 60))), 'notice : en tête du bloc, dépliée, six cases dans l\'ordre avec leur texte alternatif');
  ok(await page.locator(N + ' .eg-bd').evaluate(n => n.getAttribute('role') === 'region' && n.tabIndex === 0 && Boolean(document.getElementById(n.getAttribute('aria-labelledby')))), 'notice : bande nommée et atteignable au clavier');
  await page.click(N + ' > summary');
  await page.evaluate(() => window.S.bloc.maj(window.S.Q));
  ok(await page.locator(N).evaluate(n => !n.open), 'notice : repliée par le joueur, elle le reste quand l\'état est redessiné');
  await page.evaluate(() => { window.S.bloc.maj(null); window.S.bloc.maj(window.S.Q); });
  ok(await page.locator(N).evaluate(n => n.open), 'notice : dépliée de nouveau à chaque ouverture du bloc');
  await amorce(2);
  ok(await page.locator(N).isHidden() && (await zone()).indexOf('Notice') < 0, 'notice : absente tant que la fiche de suivi n\'est pas acquise');
  await amorce(3);
  await page.screenshot({ path: path.join(dossier, '4-amorce.png'), fullPage: true });
  await page.evaluate(() => { const Q = window.S.Q; delete Q.amorces; delete Q.titre; delete Q.fiches; window.S.bloc.maj(Q); });
  ok(await page.locator('#zone h3').count() === 0 && await page.locator('.enq-cols').count() === 0 && await page.locator('li[data-k="5"]').count() === 1, 'sans titre ni fiches envoyés : rien n\'est inventé par la page');
  // Dé d'aide, aides déguisées, retours à la ligne, révélation décalée, album de la brigade.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const cats = ['Personnages', 'Lieux', 'Objets'], fiches = [];
    cats.forEach((cat, c) => { for (let i = 1; i <= 6; i++) fiches.push({ id: 'f' + c + i, cat, nom: cat.slice(0, -1) + ' factice ' + i, vue: c * 6 + i }); });
    const o = (k, de, aide, plus) => Object.assign({ k, jour: 7 + k, etat: 'ouverte', titre: 'Factice ' + k, enonce: 'Ligne un.\nLigne <deux>.', saisie: 'texte', repondu: false, de }, aide ? { aide } : {}, plus || {});
    window.S.envoyer = async () => ({ status: 200, j: {} });
    window.S.Q = { titre: 'Affaire factice', points: 0, max: 30, fiches, jour: 9, classement: [], enigmes: [
      { k: 1, jour: 4, etat: 'close', titre: 'Close juste', enonce: 'Énoncé.', saisie: 'texte', resolue: true, revelation: 'Carte factice hors de cause.', elimine: 'f01', de: 6 },
      { k: 2, jour: 5, etat: 'close', titre: 'Close en attente', enonce: 'Énoncé.', saisie: 'texte', resolue: false, attente: '2026-12-09' },
      { k: 10, jour: 6, etat: 'close', titre: 'Close libre', enonce: 'Énoncé.', saisie: 'texte', resolue: true, libre: true, revelation: 'Texte factice sans rapport.' },
      { k: 11, jour: 6, etat: 'close', titre: 'Close indice', enonce: 'Énoncé.', saisie: 'texte', resolue: true, revelation: 'Indice factice.' },
      o(3, 1), o(4, 3, { forme: 'clair', texte: 'Aide en clair.\nSuite.' }), o(5, 4, { forme: 'miroir', texte: 'Aide en miroir' }), o(6, 5, { forme: 'envers', texte: 'srevne' }),
      o(7, 6, { forme: 'morse', texte: '.- .. -.. . / -- --- .-. ... .' }), o(8, 5, { forme: 'decalage', texte: 'BJEF', cle: 1 }), o(9, 3, { forme: 'emoji', texte: 'Aide telle quelle' }),
    ] };
    window.S.bloc.maj(window.S.Q);
  });
  const li = k => 'li[data-k="' + k + '"]';
  ok(await page.locator(li(3) + ' .enq-de u.p').count() === 1 && (await txt(li(3) + ' .enq-de')).includes("pas d'aide") && await page.locator(li(3) + ' .enq-aide').count() === 0, 'dé à 1 : un point, pas d\'aide');
  ok(await page.locator(li(7) + ' .enq-de u.p').count() === 6 && (await page.locator(li(7) + ' .enq-de i').getAttribute('aria-label')) === 'Dé : 6' && (await txt(li(7) + ' .enq-de')).includes('aide forte'), 'dé à 6 : six points, aide forte, lisible par un lecteur d\'écran');
  ok((await page.locator(li(4) + ' .enq-aide p').innerHTML()).includes('Aide en clair.<br>Suite.') && (await txt(li(4) + ' .enq-de')).includes('aide légère'), 'aide en clair, retours à la ligne rendus');
  const enonce = await page.locator(li(4) + ' > p').first().innerHTML();
  ok(enonce.includes('Ligne un.<br>Ligne &lt;deux&gt;.'), 'énoncé : retours à la ligne rendus, texte toujours échappé');
  ok((await page.locator(li(5) + ' .miroir').evaluate(n => getComputedStyle(n).transform)) === 'matrix(-1, 0, 0, 1, 0, 0)' && (await txt(li(5) + ' .enq-aide small')).includes('miroir'), 'aide en miroir : retournée par la feuille de styles');
  ok((await txt(li(6) + ' .enq-aide p')) === 'srevne' && (await txt(li(6) + ' .enq-aide small')).includes("l'envers"), 'aide à l\'envers : servie telle que reçue');
  ok((await txt(li(7) + ' .enq-aide p')) === '.- .. -.. . / -- --- .-. ... .' && await page.locator(li(7) + ' .enq-morse li').count() === 36 && !(await page.locator(li(7) + ' details').evaluate(n => n.open)), 'aide en Morse : texte intact, table de 36 signes repliée');
  ok((await txt(li(8) + ' .enq-aide small')).includes('avancée de 1 rang'), 'aide décalée : la clé est dite');
  ok((await txt(li(9) + ' .enq-aide p')) === 'Aide telle quelle' && await page.locator(li(9) + ' .enq-aide small').count() === 0, 'forme inconnue : affichée telle quelle');
  const t2b = await txt('details ' + li(2));
  ok(t2b.includes('Révélation le 9 décembre') && t2b.includes('0 point') && !t2b.includes("d'office") && await page.locator('details ' + li(1) + ' .enq-de').count() === 0, 'révélation décalée : la date est annoncée, pas de révélation vide');
  const carnet = await txt('.enq-ind');
  ok(carnet.includes('Indice factice') && !carnet.includes('sans rapport') && (await txt('details ' + li(10) + ' .enq-rev b')) === 'Rien de neuf au dossier' && (await txt('details ' + li(11) + ' .enq-rev b')) === 'Indice', 'énigme libre : étiquette neutre, hors du carnet d\'indices');
  await page.waitForFunction(() => document.querySelectorAll('.enq-v img').length === 0);
  ok((await txt('#enqT2')) === 'Album de la brigade' && await page.locator('.enq-v').count() === 18 && await page.locator('.enq-v.dos').count() === 9 && (await txt('.enq-alb')).includes('9 cartes reçues sur 18'), 'album : dix-huit vignettes, de face jusqu\'au jour courant, de dos ensuite');
  ok((await txt('.enq-v[data-carte="f01"]')) === 'Personnage factice 1' && (await txt('.enq-v.dos')) === '?' && (await txt('.enq-cols.alb li:has(.dos)')).includes('Carte à venir'), 'album sans image : pavé de repli, nom au recto, point d\'interrogation au dos');
  ok(await page.locator('.enq-cols.alb li.x').count() === 1 && (await txt('.enq-cols.alb li.x')).includes('Hors de cause'), 'album : la carte éliminée porte la mention « Hors de cause »');
  const apres = sel => page.locator(sel).first().evaluate(n => getComputedStyle(n, '::after').content);
  ok((await apres('.enq-cols.alb li.x .enq-v')).includes('HORS') && (await apres('.enq-v[data-carte="f02"]')) === 'none', 'album : tampon « Hors de cause » sur la vignette éliminée, et sur elle seule');
  ok(!(await page.locator('.enq-cols.alb li.x > span').evaluate(n => getComputedStyle(n).textDecorationLine)).includes('line-through') && (await page.locator('.enq-v[data-carte="f01"]').getAttribute('aria-label')).endsWith(', hors de cause'), 'album : nom de la carte éliminée lisible, non barré ; l\'état est dit au lecteur d\'écran');
  const forme = await page.locator('.enq-v').first().evaluate(n => n.offsetWidth / n.offsetHeight);
  ok(Math.abs(forme - 680 / 1024) < 0.02 && await page.locator('button.enq-v').count() === 9 && await page.locator('.enq-v.dos[data-carte]').count() === 0, 'album : vignettes au rapport des cartes, seules les cartes parues s\'ouvrent');
  await page.screenshot({ path: path.join(dossier, '5-de-aide-album.png'), fullPage: true });
  // Sans image en grand : la fenêtre le dit, Échap la referme et rend le focus à la vignette.
  await page.click('.enq-v[data-carte="f02"]');
  await page.waitForFunction(() => document.querySelector('.enq-zoom p').textContent.includes('pas encore'));
  ok(await page.locator('.enq-zoom .enq-zi').count() === 0 && (await page.locator('.enq-zoom').getAttribute('aria-label')) === 'Personnage factice 2', 'carte en grand sans image : dit, sans image cassée');
  await page.keyboard.press('Escape');
  ok(await page.locator('.enq-zoom').count() === 0 && await page.evaluate(() => document.activeElement.dataset.carte === 'f02'), 'Échap referme la carte et rend le focus à sa vignette');
  // Avec des images servies : la vignette porte img/enquete/<id>.webp, le dos img/enquete/dos.webp.
  const pixel = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');
  const demandes = [];
  await page.route('**/img/enquete/**/*.webp', r => { demandes.push(r.request().url().split('/img/enquete/')[1]); r.fulfill({ contentType: 'image/webp', body: pixel }); });
  await page.route('**/img/notice-enquete-*.svg', r => r.fulfill({ contentType: 'image/svg+xml', body: fs.readFileSync(path.join(racine, 'img', r.request().url().split('/').pop())) }));
  await page.route('http://essai.invalid/', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="fr"><meta charset="utf-8"><body><section id="zone"></section></body></html>' }));
  await page.goto('http://essai.invalid/');
  await page.addStyleTag({ content: habit });
  await page.addScriptTag({ path: path.join(racine, 'enquete.js') });
  await page.evaluate(() => {
    const fiches = [{ id: 'f01', cat: 'Personnages', nom: 'Personnage factice 1', vue: 1 }, { id: 'f02', cat: 'Personnages', nom: 'Personnage factice 2', vue: 20 }];
    window.PharmacoEnquete.monter(document.getElementById('zone'), { jour: () => 5 }).maj({ fiches, enigmes: [{ k: 1, jour: 4, etat: 'ouverte', titre: 'Factice', enonce: 'Énoncé.', saisie: 'texte' }, { k: 2, jour: 1, etat: 'close', titre: 'Factice', enonce: 'Énoncé.', saisie: 'texte', resolue: true, revelation: 'Hors de cause.', elimine: 'f01' }] });
  });
  await page.waitForFunction(() => [...document.querySelectorAll('.enq-v img')].every(i => i.complete));
  ok(await page.locator('.enq-v img').count() === 2 && demandes.sort().join() === 'vignettes/carte-revelation.webp,vignettes/dos.webp,vignettes/f01.webp' && await page.locator('.enq-v.dos').count() === 1, 'album avec images : img/enquete/vignettes/<id>.webp de face, dos.webp de dos, jour pris dans l\'option jour()');
  await page.click('.enq-v[data-carte="f01"]');
  await page.waitForFunction(() => { const i = document.querySelector('.enq-zoom img'); return i && i.complete; });
  const l1 = await page.locator('.enq-zi').evaluate(n => n.offsetWidth);
  await page.click('.enq-zi');
  const l2 = await page.locator('.enq-zi').evaluate(n => n.offsetWidth);
  ok(demandes.includes('f01.webp') && Math.abs(l2 - 2 * l1) <= 2 && (await page.locator('.enq-zi').getAttribute('aria-pressed')) === 'true', 'toucher une carte parue : image en grand img/enquete/<id>.webp, un second toucher la double');
  ok(await page.locator('.enq-zi.x').count() === 1 && (await apres('.enq-zi')).includes('HORS') && (await txt('.enq-zoom p')).startsWith('Hors de cause.') && (await page.locator('.enq-zoom').getAttribute('aria-label')).endsWith(', hors de cause'), 'carte éliminée en grand : toujours consultable, avec le tampon et la mention');
  await page.screenshot({ path: path.join(dossier, '7-carte-en-grand.png') });
  await page.click('.enq-zi');
  ok((await page.locator('.enq-zi').evaluate(n => n.offsetWidth)) === l1, 'un troisième toucher la ramène à sa taille');
  await page.click('.enq-zoom [data-fin]');
  ok(await page.locator('.enq-zoom').count() === 0, 'le bouton « Fermer » referme la carte');
  // Cartes révélation : rangées dans l'album une fois acquises, ouvertes en grand, feuilletées avec les flèches.
  ok(await page.locator('.enq-rvl .enq-rv').count() === 1 && (await txt('.enq-rvl li')).includes('Jour 1') && (await txt('.enq-rvl li small')) === 'Carte éliminée', 'album : la révélation acquise a sa carte dans la section « Cartes révélation »');
  await page.click('.enq-v[data-carte="f01"]');
  ok((await txt('.enq-zn span')) === '1/2' && await page.locator('.enq-zn [data-va="-1"]').isDisabled(), 'carte en grand : compteur et flèches, la première sans carte précédente');
  await page.click('.enq-zn [data-va="1"]');
  await page.waitForFunction(() => { const i = document.querySelector('.enq-zi.rv img'); return i && i.complete; });
  ok(demandes.includes('carte-revelation.webp') && (await txt('.enq-zt')).includes('Hors de cause.') && (await txt('.enq-rt')).includes('Hors de cause.') && (await txt('.enq-zn span')) === '2/2' && await page.evaluate(() => document.activeElement.dataset.va === '1' || document.activeElement.dataset.fin === '1'), 'flèche suivante : la carte révélation en grand, son texte sur la carte et repris dessous');
  ok(await page.locator('.enq-rt').evaluate(n => n.scrollHeight <= n.clientHeight + 1), 'carte révélation : le texte tient dans le parchemin');
  await page.screenshot({ path: path.join(dossier, '7b-revelation-en-grand.png') });
  await page.keyboard.press('ArrowLeft');
  ok((await page.locator('.enq-zoom').getAttribute('aria-label')).startsWith('Personnage factice 1'), 'flèche gauche du clavier : retour à la carte précédente');
  await page.keyboard.press('Escape');
  await page.click('.enq-rv[data-rev="2"]');
  ok((await page.locator('.enq-zoom').getAttribute('aria-label')) === 'Révélation, Jour 1', 'toucher une carte révélation l\'ouvre en grand');
  await page.keyboard.press('Escape');
  ok(await page.locator('.enq-zoom').count() === 0 && await page.evaluate(() => document.activeElement.dataset.rev === '2'), 'Échap rend le focus à la vignette de la révélation');
  await page.screenshot({ path: path.join(dossier, '6-album-images.png'), fullPage: true });
  // La notice avec ses vraies images, aux trois largeurs : pas de débordement de page, une case à la fois sur téléphone, trois sur grand écran.
  const mesure = [];
  for (const w of [320, 390, 1280]) {
    await page.setViewportSize({ width: w, height: 844 });
    await page.locator('#enqNotice .eg-bd img').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('#enqNotice img')].every(i => i.complete && i.naturalWidth > 0));
    mesure.push(await page.evaluate(() => { const b = document.querySelector('#enqNotice .eg-bd'), i = b.querySelector('img'); return { page: document.documentElement.scrollWidth <= window.innerWidth, vues: b.clientWidth / i.offsetWidth, glisse: b.scrollWidth > b.clientWidth, forme: i.offsetWidth / i.offsetHeight }; }));
    await page.locator('#enqNotice').screenshot({ path: path.join(dossier, '8-notice-' + w + '.png') });
  }
  ok(mesure.every(m => m.page && m.glisse && Math.abs(m.forme - 4 / 3) < 0.02) && mesure[0].vues < 1.3 && mesure[1].vues < 1.3 && mesure[2].vues > 2.9, 'notice à 320, 390 et 1280 px : pas de débordement, images entières, une case visible sur téléphone et trois sur grand écran ' + JSON.stringify(mesure.map(m => +m.vues.toFixed(2))));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  // Animations de l'album : arrivée des cartes à la première vue, tampon des cartes nouvellement éliminées, une fois par appareil.
  const albumAnime = async (nom, elimine) => page.evaluate(([nom, elimine]) => {
    const z = document.createElement('section'); z.id = nom; document.body.prepend(z);
    const fiches = [1, 2, 3, 4, 5, 6].map(i => ({ id: 'a' + i, cat: 'Personnages', nom: 'Personnage factice ' + i, vue: i < 6 ? 1 : 20 }));
    const enigmes = elimine.map((id, i) => ({ k: i + 1, jour: 1, etat: 'close', titre: 'Factice', enonce: 'Énoncé.', saisie: 'texte', resolue: true, revelation: 'Hors de cause.', elimine: id }));
    const b = window.PharmacoEnquete.monter(z, { jour: () => 5 }); b.maj({ fiches, enigmes }); window.anim = { b, fiches, enigmes };
    z.querySelector('.enq-cols.alb').scrollIntoView(); // la notice précède l'album : on l'amène à l'écran, comme un joueur qui fait défiler
  }, [nom, elimine]);
  const memo = () => page.evaluate(() => JSON.parse(localStorage.getItem('pharmacoEnqueteAlbum') || 'null'));
  await page.evaluate(() => localStorage.clear());
  await albumAnime('zA', ['a2']);
  await page.waitForFunction(() => document.querySelectorAll('#zA li.arr').length > 0);
  const m1 = await memo();
  ok(await page.locator('#zA li.arr').count() === 5 && await page.locator('#zA li.dos, #zA li:has(.dos).arr').count() === 0 && m1.v.length === 5 && m1.x.join() === 'a2', 'animation : les cinq cartes reçues arrivent (pas la carte de dos), mémorisées sur l\'appareil');
  const dt = await page.locator('#zA li[data-f="a2"]').evaluate(n => [n.classList.contains('tam'), parseFloat(n.style.getPropertyValue('--dt')), parseFloat(n.style.getPropertyValue('--d'))]);
  ok(dt[0] && dt[1] > dt[2] + 0.5, 'animation : la carte éliminée est tamponnée après son arrivée');
  const durees = await page.evaluate(() => document.getAnimations().map(a => a.effect.getComputedTiming().endTime));
  ok(durees.length > 0 && Math.max(...durees) < 2000, 'animation : arrivée en moins de 2 s (' + Math.round(Math.max(...durees)) + ' ms)');
  const h0 = await page.locator('#zA .enq-cols.alb').evaluate(n => { document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; }); return [n.offsetHeight, [...n.querySelectorAll('li')].map(l => l.offsetTop).join()]; });
  const h1 = await page.locator('#zA .enq-cols.alb').evaluate(n => { document.getAnimations().forEach(a => a.finish()); return [n.offsetHeight, [...n.querySelectorAll('li')].map(l => l.offsetTop).join()]; });
  ok(h0.join('|') === h1.join('|'), 'animation : aucun saut de mise en page entre le début et la fin');
  await page.evaluate(() => window.anim.b.maj({ fiches: window.anim.fiches, enigmes: window.anim.enigmes }));
  ok(await page.locator('#zA li.arr, #zA li.tam').count() === 0 && (await page.locator('#zA li.x .enq-v').evaluate(n => getComputedStyle(n, '::after').content)).includes('HORS'), 'animation : rien ne rejoue au rendu suivant, l\'état final ne dépend pas de l\'animation');
  await albumAnime('zB', ['a2', 'a4']);
  await page.waitForFunction(() => document.querySelectorAll('#zB li.tam').length > 0);
  ok(await page.locator('#zB li.arr').count() === 0 && (await page.locator('#zB li.tam').evaluate(n => n.dataset.f)) === 'a4' && await page.locator('#zB li.tam').count() === 1, 'animation : sur un appareil qui a déjà vu l\'album, seule la carte nouvellement éliminée reçoit le tampon');
  const tdur = await page.evaluate(() => Math.max(...document.getAnimations().map(a => a.effect.getComputedTiming().endTime)));
  ok(tdur < 1000, 'animation : tampon en moins de 1 s (' + Math.round(tdur) + ' ms)');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => localStorage.clear());
  await albumAnime('zC', ['a3']);
  await page.waitForTimeout(100);
  ok(await page.evaluate(() => document.getAnimations().length) === 0 && (await memo()).v.length === 5, 'mouvement réduit : aucune animation, état final direct (et l\'album est tout de même noté comme vu)');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => { Storage.prototype.getItem = () => { throw new Error('bloqué'); }; Storage.prototype.setItem = () => { throw new Error('bloqué'); }; });
  await albumAnime('zD', []);
  await page.waitForFunction(() => document.querySelectorAll('#zD li.arr').length === 5);
  ok(true, 'stockage bloqué : l\'animation joue tout de même, sans erreur');
  await page.evaluate(() => ['zA', 'zB', 'zC', 'zD'].forEach(id => document.getElementById(id).remove()));
  // Tampons des joueurs (« hors de cause ? », « coupable ? ») et hypothèse finale du trio.
  const fichesT = [];
  [['Personnages', 'p'], ['Lieux', 'l'], ['Objets', 'o']].forEach(([cat, c]) => [1, 2, 3].forEach(i => fichesT.push({ id: c + i, cat, nom: cat.slice(0, -1) + ' factice ' + i, vue: 1 })));
  await page.evaluate(fichesT => {
    const z = document.createElement('section'); z.id = 'zT'; document.body.prepend(z); window.scrollTo(0, 0);
    const Q = { titre: 'Affaire factice', max: 40, fiches: fichesT, tampons: { p1: { h: 2, c: 1, moi: 'h' }, l2: { h: 0, c: 1 } }, enigmes: [
      { k: 1, jour: 4, etat: 'ouverte', titre: 'Factice', enonce: 'Énoncé.', saisie: 'choix', options: ['Personnage factice 3', 'Autre'], repondu: true, reponse: 0, deposes: 1 },
      { k: 25, jour: 4, etat: 'ouverte', titre: 'Lot factice', enonce: 'Énoncé.', saisie: 'texte', quete: true, pts: 5, prime: 2, ferme: '2026-12-24' },
      { k: 26, jour: 18, etat: 'ouverte', titre: 'Trio factice', enonce: 'Énoncé.', saisie: 'trio', quete: true, pts: 0, prime: 3, ferme: '2026-12-27', resultat: '2026-12-28' },
    ] };
    const T = window.tp = { Q, appels: [], envois: [] };
    T.b = window.PharmacoEnquete.monter(z, {
      jour: () => 18,
      tamponner: async (id, t) => {
        T.appels.push([id, t]);
        if (T.refus) return { status: 403, j: { error: T.refus } };
        const o = T.Q.tampons[id] || (T.Q.tampons[id] = { h: 0, c: 0 });
        if (o.moi) o[o.moi]--; if (t) { o[t]++; o.moi = t; } else delete o.moi;
        return { status: 200, j: { ok: true, enquete: T.Q } };
      },
      envoyer: async (k, r) => { T.envois.push([k, r]); const e = T.Q.enigmes.find(x => x.k === k); Object.assign(e, { repondu: true, reponse: r, deposes: 1 }); return { status: 200, j: { ok: true, enquete: T.Q } }; },
    });
    T.b.maj(Q);
  }, fichesT);
  const apresT = sel => page.locator(sel).first().evaluate(n => getComputedStyle(n, '::after').content);
  ok(await page.locator('#zT li.mh[data-f="p1"]').count() === 1 && (await apresT('#zT li[data-f="p1"] .enq-v')).includes('?') && (await txt('#zT li[data-f="p1"] .enq-cpt')) === '2 hors de cause · 1 coupable' && (await txt('#zT li[data-f="l2"] .enq-cpt')) === '1 coupable' && (await page.locator('#zT .enq-v[data-carte="p1"]').getAttribute('aria-label')).includes('votre tampon : hors de cause ?'), 'tampons : mon tampon sur la vignette, décompte de la brigade, état dit au lecteur d\'écran');
  ok(await page.locator('#zT li.x').count() === 0 && (await page.locator('#zT li[data-f="p1"] .enq-v').evaluate(n => getComputedStyle(n, '::after').borderTopStyle)) === 'dashed', 'tampons : le tampon du joueur (pointillés, point d\'interrogation) ne se confond pas avec l\'officiel, absent sans révélation');
  await page.click('#zT .enq-v[data-carte="l2"]');
  ok(await page.locator('.enq-zoom [data-tp="l2"]').count() === 2 && (await txt('.enq-zoom .enq-tpz')).includes('Brigade : 1 coupable'), 'tampons : la carte en grand propose « Hors de cause ? » et « Coupable ? » avec le décompte');
  await page.focus('.enq-zoom [data-tp="l2"][data-t="c"]'); await page.keyboard.press('Enter');
  ok((await page.locator('.enq-zoom [data-t="c"]').getAttribute('aria-pressed')) === 'true' && await page.locator('.enq-zoom .enq-zi.mc').count() === 1 && await page.evaluate(() => document.activeElement.dataset.t === 'c') && await page.locator('#zT li.mc[data-f="l2"]').count() === 1 && (await txt('.enq-zoom .enq-tpz')).includes('2 coupables'), 'tampons : « Coupable ? » posé au clavier, tampon violet en grand et dans l\'album, focus gardé');
  await page.click('.enq-zoom [data-t="c"]');
  ok(await page.locator('.enq-zoom .enq-zi.mc').count() === 0 && JSON.stringify(await page.evaluate(() => window.tp.appels)) === '[["l2","c"],["l2",null]]', 'tampons : un second toucher retire le tampon (t = null)');
  await page.evaluate(() => { window.tp.refus = 'close'; });
  await page.click('.enq-zoom [data-t="h"]');
  ok((await txt('.enq-zoom .enq-err')).includes('dossier est clos') && await page.locator('.enq-zoom [data-t="h"][aria-pressed="false"]').count() === 1, 'tampons : refus du serveur dit en clair, rien ne change');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { delete window.tp.refus; });
  ok((await txt('#zT li[data-k="1"] .enq-tpi')).includes('Personnage factice 3') && await page.locator('#zT .enq-tpi [data-tp="p3"]').count() === 2, 'lors de la réponse : la carte désignée par la réponse est proposée au tampon');
  await page.click('#zT .enq-tpi [data-tp="p3"][data-t="c"]');
  ok(await page.locator('#zT li.mc[data-f="p3"]').count() === 1, 'lors de la réponse : le tampon posé apparaît dans l\'album');
  // Hypothèse finale du trio et quête du lot, présentées comme des hypothèses à verrouiller.
  const t26 = await txt('#zT li[data-k="26"]');
  ok(t26.includes('Hypothèse finale') && t26.includes('3 points à la première brigade juste') && !/\b0 point/.test(t26) && await page.locator('#zT li[data-k="26"] select').count() === 3 && (await txt('#zT li[data-k="26"] label')) === 'Personnages', 'trio : trois choix, un par catégorie, barème sans « 0 point »');
  ok((await txt('#zT li[data-k="25"] [data-rep]')) === 'Verrouiller mon hypothèse' && (await txt('#zT li[data-k="26"] [data-rep]')) === 'Verrouiller mon hypothèse' && (await txt('#zT li[data-k="25"] .enq-bar')).includes('5 points pour une hypothèse juste, plus 2'), 'lot et trio : même bouton « Verrouiller mon hypothèse », barème dit');
  await page.click('#zT li[data-k="26"] [data-rep]');
  ok((await txt('#zT li[data-k="26"] .enq-err')).includes('Choisissez'), 'trio : impossible de verrouiller sans les trois choix');
  await page.evaluate(() => { const T = window.tp; T.Q.enigmes.push({ k: 3, jour: 5, etat: 'close', titre: 'Factice', enonce: 'Énoncé.', saisie: 'texte', resolue: true, revelation: 'Hors de cause.', elimine: 'p2' }); T.b.maj(T.Q); });
  await page.selectOption('#zT [data-trio="26-0"]', 'p2'); await page.selectOption('#zT [data-trio="26-1"]', 'l1'); await page.selectOption('#zT [data-trio="26-2"]', 'o3');
  ok((await page.locator('#zT [data-trio="26-0"] option[value="p2"]').textContent()).includes('(hors de cause)') && (await txt('#zT li[data-k="26"] .enq-warn')).includes('déjà hors de cause'), 'trio : une carte déjà écartée reste choisissable mais signalée');
  await page.selectOption('#zT [data-trio="26-0"]', 'p1');
  await page.click('#zT li[data-k="26"] [data-rep]');
  ok((await txt('#zT li[data-k="26"] .enq-warn')).includes('hypothèse majoritaire') && (await txt('#zT [data-envoi="26"]')) === 'Je confirme, je verrouille' && await page.locator('#zT [data-trio="26-0"][disabled]').count() === 1, 'trio : avertissement habituel, choix figés avant confirmation');
  await page.click('#zT [data-envoi="26"]');
  const t26b = await txt('#zT li[data-k="26"]');
  ok(JSON.stringify(await page.evaluate(() => window.tp.envois)) === '[[26,["p1","l1","o3"]]]' && t26b.includes('Votre hypothèse est verrouillée : « Personnage factice 1 · Lieu factice 1 · Objet factice 3 »') && t26b.includes('1 hypothèse verrouillée dans la brigade') && t26b.includes('le 28 décembre') && !t26b.includes('Hypothèse juste') && !t26b.includes('non retenue'), 'trio : envoi du tableau d\'identifiants, rappel du trio et des dépôts, aucun verdict avant la clôture');
  // Révélations : l'officiel confirme ou dément mon tampon ; le trio juge les tampons restants.
  ok(await page.locator('#zT li.x[data-f="p2"]').count() === 1 && await page.locator('#zT li[data-f="p1"] .enq-vd').count() === 0, 'tampons : pas de verdict tant que rien n\'est révélé sur la carte');
  await page.evaluate(() => { const T = window.tp; T.Q.tampons.o1 = { h: 1, c: 0, moi: 'h' }; T.Q.tampons.o2 = { h: 0, c: 1, moi: 'c' }; T.Q.enigmes.push({ k: 4, jour: 6, etat: 'close', titre: 'F', enonce: 'É.', saisie: 'texte', resolue: true, revelation: 'Hors de cause.', elimine: 'o1' }, { k: 5, jour: 7, etat: 'close', titre: 'F', enonce: 'É.', saisie: 'texte', resolue: true, revelation: 'Hors de cause.', elimine: 'o2' }); T.b.maj(T.Q); });
  ok((await txt('#zT li[data-f="o1"] .enq-vd.ok')).includes('confirmé') && (await txt('#zT li[data-f="o2"] .enq-vd.ko')).includes('« coupable » : démenti') && await page.locator('#zT li.x[data-f="o1"]').count() === 1 && await page.locator('#zT li.mh[data-f="o1"]').count() === 0, 'révélation : tampon officiel automatique, mon « hors de cause » confirmé, mon « coupable » démenti');
  await page.evaluate(() => { const T = window.tp; const e = T.Q.enigmes.find(x => x.k === 26); Object.assign(e, { etat: 'close', resolue: true, premiere: true, trio: ['p1', 'l2', 'o3'], revelation: 'Trio factice.' }); T.Q.denouement = 'Dénouement factice.'; T.b.maj(T.Q); });
  const t26c = await txt('#zT li[data-k="26"]');
  ok((await txt('#zT li[data-f="p1"] .enq-vd.ko')).includes('« hors de cause » : démenti') && (await txt('#zT li[data-f="l2"]')).includes('Lieu factice 2') && await page.locator('#zT li[data-f="p3"] .enq-vd.ok').count() === 0 && (await txt('#zT li[data-f="p3"] .enq-vd.ko')).includes('« coupable » : démenti'), 'dénouement : le trio juge les tampons restants');
  ok(t26c.includes('Hypothèse juste') && t26c.includes('Première brigade : +3 points') && !/\b0 point/.test(t26c) && await page.locator('#zT [data-tp]').count() === 0, 'trio clos : hypothèse juste et prime dites, plus de bouton de tampon après le dénouement');
  // Relecture (sans option tamponner) : les tampons se voient, rien ne se pose.
  await page.evaluate(() => { const T = window.tp; delete T.Q.denouement; T.b2 = window.PharmacoEnquete.monter(document.getElementById('zT'), { jour: () => 18, peutRepondre: () => false }); T.b2.maj(T.Q); });
  await page.click('#zT .enq-v[data-carte="l3"]');
  ok(await page.locator('.enq-zoom [data-tp]').count() === 0 && await page.locator('#zT [data-tp]').count() === 0, 'relecture : aucun bouton de tampon, ni dans l\'album ni en grand');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.getElementById('zT').remove());
  await page.evaluate(() => window.PharmacoEnquete.monter(document.getElementById('zone')).maj(null));
  ok(await page.locator('#zone').isHidden(), 'sans champ enquete : le bloc se cache');
  ok(erreurs.length === 0, 'aucune erreur de script' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));

  await nav.close();
  console.log(echecs ? echecs + ' échec(s)' : 'Tout est bon. Captures : ' + dossier);
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
