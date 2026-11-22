// Composition des éliminations et des indices d'attributs de l'enquête à tirage.
// Déterministe : n'utilise que rnd(), suite de nombres dans [0, 1) fournie par l'appelant (alea(graine) du serveur).
// Garantie : dans chaque catégorie, chaque révélation retire au moins un candidat, il en reste toujours au moins deux
// avant le créneau décisif, et il en reste exactement un (le coupable) après lui.
//
// composerIndices(grille, plan, coupables, rnd, vue)
//   grille    : contenu de grille.json
//   plan      : tableau des créneaux (plan.json, champ plan)
//   coupables : { Personnages: 'mine', Lieux: 'bureau', Objets: 'tampon' } (ids tirés par le serveur)
//   rnd       : () => nombre dans [0, 1)
//   vue       : facultatif, { id: jour de présentation dans le sapin } ; les éliminations préfèrent une carte déjà présentée
// Rend { k: { type: 'carte', elimine: id } | { type: 'attribut', attribut, neg, texte, reste } } pour chaque créneau
// 'carte' ou 'attribut' du plan, ou lève une erreur si une catégorie n'a pas de solution (impossible avec la grille
// livrée : vérifié pour les 18 coupables par verifier.js).
function composerIndices(grille, plan, coupables, rnd, vue) {
  const melange = A => { A = A.slice(); for (let i = A.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [A[i], A[j]] = [A[j], A[i]]; } return A; };
  const sortie = {};
  for (const cat of Object.keys(grille).filter(c => c[0] !== '_')) {
    const G = grille[cat], ids = G.cartes, c = ids.indexOf(coupables[cat]);
    if (c < 0) throw new Error('coupable inconnu pour ' + cat);
    const creneaux = plan.filter(s => s.cat === cat && (s.r === 'carte' || s.r === 'attribut')).sort((a, b) => a.k - b.k);
    // Indices possibles : vrais pour le coupable (attribut présent, ou absent pour la forme négative).
    const indices = [];
    for (const [a, d] of Object.entries(G.attributs)) {
      if (d.v[c] === 1) indices.push({ attribut: a, neg: false, texte: d.oui, garde: d.v.map(x => x === 1) });
      else indices.push({ attribut: a, neg: true, texte: d.non, garde: d.v.map(x => x === 0) });
    }
    const pas = [];
    const cherche = (i, cand) => {
      if (i === creneaux.length) return cand.length === 1;
      const s = creneaux[i];
      let options;
      if (s.r === 'carte') {
        options = melange(cand.filter(x => x !== c)).map(x => ({ elimine: x, reste: cand.filter(y => y !== x) }));
        if (vue) options.sort((p, q) => (vue[ids[p.elimine]] > s.n) - (vue[ids[q.elimine]] > s.n)); // tri stable : présentées d'abord
      } else {
        options = melange(indices).map(d => ({ d, reste: cand.filter(x => d.garde[x]) })).filter(o => o.reste.length < cand.length);
      }
      for (const o of options) {
        if (s.decisif ? o.reste.length !== 1 : o.reste.length < 2) continue;
        pas.push(s.r === 'carte' ? { k: s.k, type: 'carte', elimine: ids[o.elimine] } : { k: s.k, type: 'attribut', attribut: o.d.attribut, neg: o.d.neg, texte: o.d.texte, reste: o.reste.map(x => ids[x]) });
        if (cherche(i + 1, o.reste)) return true;
        pas.pop();
      }
      return false;
    };
    if (!cherche(0, ids.map((_, i) => i))) throw new Error('aucune composition pour ' + cat + ' (coupable ' + coupables[cat] + ')');
    for (const p of pas) sortie[p.k] = p;
  }
  return sortie;
}
module.exports = { composerIndices };
