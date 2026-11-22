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

  const nav = await chromium.launch();
  const page = await nav.newPage({ viewport: { width: 390, height: 844 } });
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  await page.setContent('<!doctype html><html lang="fr"><meta charset="utf-8"><body style="margin:0;font-family:sans-serif"><section id="zone"></section></body></html>');
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
  ok((await txt('details li[data-k="1"]')).includes('acquise') && (await txt('details li[data-k="1"]')).includes('La vôtre aussi'), 'énigme close acquise : majorité juste');
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
  ok(await page.locator('.enq-cols li.x').count() === 2 && (await txt('details li[data-k="3"]')).includes('La vôtre ne l\'était pas'), 'clôture : la fiche de suivi suit, et ma réponse fausse est dite');
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
  await page.screenshot({ path: path.join(dossier, '4-amorce.png'), fullPage: true });
  await page.evaluate(() => { const Q = window.S.Q; delete Q.amorces; delete Q.titre; delete Q.fiches; window.S.bloc.maj(Q); });
  ok(await page.locator('#zone h3').count() === 0 && await page.locator('.enq-cols').count() === 0 && await page.locator('li[data-k="5"]').count() === 1, 'sans titre ni fiches envoyés : rien n\'est inventé par la page');
  await page.evaluate(() => window.S.bloc.maj(null));
  ok(await page.locator('#zone').isHidden(), 'sans champ enquete : le bloc se cache');
  ok(erreurs.length === 0, 'aucune erreur de script' + (erreurs.length ? ' : ' + erreurs.join(' | ') : ''));

  await nav.close();
  console.log(echecs ? echecs + ' échec(s)' : 'Tout est bon. Captures : ' + dossier);
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
