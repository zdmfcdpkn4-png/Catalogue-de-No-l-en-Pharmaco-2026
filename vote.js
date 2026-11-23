/* Vote du jeu favori de l'équipe et hall of fame.
   Propre au site Vercel : ce module parle à /api/votes (un vote par prénom, code d'équipe exigé).
   Il s'appuie sur les données du catalogue (G, CATS) et n'affiche rien si le serveur de vote
   ne répond pas, par exemple dans l'artefact claude.ai. */
(() => {
  if (typeof G === "undefined" || typeof CATS === "undefined" || !Array.isArray(G)) return;
  const API = "/api/votes", KEY = "pharmacotechnie-vote-2026";
  const q = s => document.querySelector(s);
  const h = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/’/g, "'").toLowerCase();
  const BY = new Map(G.map(g => [g.n, g]));
  let mem = {};
  try { mem = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { mem = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} };
  let votes = [], aConfirmer = "", sec;
  // Liste fermée des participants : elle arrive du serveur avec le classement (code d'équipe exigé). Quand elle existe,
  // le prénom se choisit dans un menu ; sans liste, la saisie libre reste. Le prénom mémorisé vaut s'il est dans la liste.
  let noms = [];
  function lister() {
    const sel = q("#vtNom"), avec = noms.length > 0;
    if (avec && sel.options.length !== noms.length + 1) {
      const garde = sel.value || noms.find(n => mem.prenom && norm(n) === norm(mem.prenom)) || "";
      sel.innerHTML = '<option value="">Choisir dans la liste</option>' + noms.map(n => '<option value="' + h(n) + '">' + h(n) + "</option>").join("");
      sel.value = garde;
    }
    sel.hidden = !avec; q("#vtPrenom").hidden = avec; q("#vtHint").hidden = avec;
  }

  const call = async body => {
    const r = await fetch(API, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let j = {};
    try { j = await r.json(); } catch (e) {}
    return { status: r.status, j };
  };

  fetch(API, { cache: "no-store" }).then(r => (r.ok ? r.json() : null)).then(j => { if (j && j.ready) init(); }).catch(() => {});

  const CSS = `
.vt [hidden]{display:none!important}
.vt .adv-intro a{color:inherit;font-weight:800;text-underline-offset:3px}
.vt-body{display:grid;grid-template-columns:minmax(0,360px) minmax(0,1fr);gap:24px 28px;align-items:start;margin-top:18px}
.vt-panel{min-width:0;padding:16px 18px 18px;background:var(--surface);color:var(--on-surface);border:3px solid var(--line);border-radius:18px;box-shadow:6px 6px 0 var(--shadow)}
.vt-panel h3{margin:0;font-weight:800;font-size:1.3rem;line-height:1.1}
.vt-panel label{display:block;margin:14px 0 5px;font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.vt-panel input,.vt-panel select{display:block;width:100%;min-height:46px;font:700 1rem var(--display);color:var(--on-surface);background:#fff;border:2.5px solid var(--line);border-radius:12px;padding:8px 10px}
.vt-hint{margin:6px 0 0;font-size:.82rem;color:var(--muted)}
.vt-mine{margin:10px 0 0;padding:8px 11px;background:var(--mu);border:2.5px solid var(--line);border-radius:12px;font-size:.92rem}
.vt-msg{margin:12px 0 0;font-size:.92rem;font-weight:800}
.vt-msg:empty{display:none}
.vt-msg.err{color:var(--off)}.vt-msg.ok{color:var(--ok)}.vt-msg.warn{color:var(--warn)}
.vt-prev{display:flex;align-items:center;gap:12px;margin:12px 0 0;padding:8px 10px;border:2.5px dashed var(--line);border-radius:12px}
.vt-prev img{width:64px;height:64px;object-fit:contain;flex:0 0 auto}
.vt-prev b{display:block;font-weight:800;line-height:1.15;overflow-wrap:anywhere}
.vt-prev small{font-size:.8rem;color:var(--muted)}
.vt-head{display:flex;align-items:baseline;justify-content:space-between;gap:6px 12px;flex-wrap:wrap}
.vt-sum{margin:3px 0 0;font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.vt-sum:empty{display:none}
.vt-empty{margin:14px 0 0}
.vt-pod{display:flex;justify-content:center;align-items:flex-end;gap:8px;max-width:520px;margin:16px auto 0;padding:0;list-style:none}
.vt-step{flex:1 1 0;min-width:0;max-width:46%;display:grid;gap:6px;justify-items:center;text-align:center}
.vt-step.s1{order:2}.vt-step.s2{order:1}.vt-step.s3{order:3}
.vt-step ul{display:grid;gap:8px;justify-items:center;width:100%;margin:0;padding:0;list-style:none}
.vt-step li{display:grid;gap:4px;justify-items:center;min-width:0;max-width:100%;border-radius:10px}
.vt-step img{display:block;width:60px;height:60px;object-fit:contain}
.vt-step li b{font-weight:800;font-size:.88rem;line-height:1.12;overflow-wrap:anywhere}
.vt-socle{display:grid;place-items:center;align-content:center;gap:1px;width:100%;padding:6px 2px;border:2.5px solid var(--line);border-radius:12px 12px 6px 6px}
.vt-socle b{font-weight:800;font-size:1.5rem;line-height:1;font-variant-numeric:tabular-nums}
.vt-socle span{font:600 .7rem var(--mono);white-space:nowrap}
.s1 .vt-socle{min-height:92px;background:var(--mu);box-shadow:4px 4px 0 var(--shadow)}
.s2 .vt-socle{min-height:68px;background:var(--li)}
.s3 .vt-socle{min-height:50px;background:var(--tE)}
.vt-sub{margin:20px 0 0;font:600 .72rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.vt-formes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0 0;padding:0;list-style:none}
.vt-formes li{min-width:0;padding:8px 10px;background:#fff;border:2.5px solid var(--line);border-radius:12px}
.vt-formes small{display:block;font:600 .68rem var(--mono);letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
.vt-formes b{display:block;margin-top:2px;font-weight:800;line-height:1.15;overflow-wrap:anywhere}
.vt-formes span{font:600 .74rem var(--mono)}
.vt-formes li.vide b{font-weight:600;color:var(--muted)}
.vt-list{display:grid;gap:8px;margin:8px 0 0;padding:0;list-style:none}
.vt-row{display:grid;grid-template-columns:34px 44px minmax(0,1fr);gap:8px 10px;align-items:center;padding:8px 10px;background:#fff;border:2.5px solid var(--line);border-radius:14px}
.vt-row.np{grid-template-columns:34px minmax(0,1fr)}
.vt-rk{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;border:2.5px solid var(--line);background:var(--foil-a);font:800 .95rem/1 var(--display);font-variant-numeric:tabular-nums}
.vt-row.r1 .vt-rk{background:var(--mu)}.vt-row.r2 .vt-rk{background:var(--li)}.vt-row.r3 .vt-rk{background:var(--tE)}
.vt-row img{display:block;width:44px;height:44px;object-fit:contain}
.vt-main{min-width:0}
.vt-n{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0;font-weight:800;line-height:1.15}
.vt-n b{min-width:0;font-weight:800;overflow-wrap:anywhere}
.vt-n span{flex:0 0 auto;font:600 .78rem var(--mono);white-space:nowrap}
.vt-who{display:flex;flex-wrap:wrap;gap:5px;margin:6px 0 0;padding:0;list-style:none}
.vt-who li{font-size:.78rem;font-weight:700;background:var(--chip);border:2px solid color-mix(in srgb,var(--line) 70%,transparent);border-radius:8px;padding:1px 8px}
.vt-who li.me{background:var(--pressed);color:var(--pressed-on);border-color:var(--line)}
.vt-cites{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0;padding:10px;list-style:none;border:2.5px dashed var(--line);border-radius:14px}
.vt-cites li{max-width:100%;padding:2px 9px;background:#fff;border:2px solid var(--line);border-radius:8px;font-size:.84rem;font-weight:800;overflow-wrap:anywhere}
.vt-cites small{margin-left:6px;font:600 .7rem var(--mono);color:var(--muted)}
.vt-cites li.me{background:var(--pressed);color:var(--pressed-on)}
.vt-cites li.me small{color:inherit}
.vt-hit{animation:hit 1.6s ease-out}
@media(max-width:860px){.vt-body{grid-template-columns:minmax(0,1fr)}}
@media(max-width:400px){.vt-step img{width:48px;height:48px}.vt-step li b{font-size:.8rem}}
@media (prefers-reduced-motion:reduce){.vt-hit{animation:none}}`;

  function init() {
    const st = document.createElement("style");
    st.textContent = CSS;
    document.head.appendChild(st);

    const cats = Object.keys(CATS).sort((a, b) => CATS[a].o - CATS[b].o);
    const options = cats.map(k => '<optgroup label="' + h(CATS[k].n + " · " + CATS[k].f) + '">'
      + G.filter(g => g.c === k).sort((a, b) => a.n.localeCompare(b.n, "fr")).map(g => '<option value="' + h(g.n) + '">' + h(g.n) + "</option>").join("")
      + "</optgroup>").join("");

    sec = document.createElement("section");
    sec.className = "wrap adv vt";
    sec.id = "vote";
    sec.hidden = true;
    sec.setAttribute("aria-labelledby", "vote-t");
    sec.innerHTML = '<p class="adv-back"><a class="go" href="#">Retour au catalogue</a></p>'
      + '<div class="adv-head"><h2 id="vote-t">Le palmarès <span>des jeux</span></h2>'
      + '<p class="adv-intro">Un vote par personne : un prénom, une voix, pour votre préparation préférée du catalogue. Le hall of fame classe les jeux, pas les joueurs, et se met à jour à chaque vote. Pour marquer des points, direction les <a href="#pharmacogames">Pharmacogames</a>.</p></div>'
      + '<div class="vt-body"><div>'
      + '<form class="vt-panel" id="vtGate" novalidate><h3>Réservé à l\'équipe</h3>'
      + '<label for="vtCode">Code d\'équipe</label><input id="vtCode" type="text" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="64" required>'
      + '<p class="vt-hint">Le code vous a été transmis avec le lien du catalogue.</p>'
      + '<p class="vt-msg" id="vtGateMsg" role="status"></p><button class="go main" type="submit">Entrer</button></form>'
      + '<form class="vt-panel" id="vtForm" novalidate hidden><h3>Votre vote</h3>'
      + '<p class="vt-mine" id="vtMine" hidden></p>'
      + '<label for="vtPrenom">Votre prénom</label><input id="vtPrenom" type="text" autocomplete="given-name" maxlength="24" required>'
      + '<select id="vtNom" aria-label="Votre prénom" hidden></select>'
      + '<p class="vt-hint" id="vtHint">Un seul prénom, sans espace. Un homonyme dans l\'équipe ? Ajoutez une initiale : Marie-L.</p>'
      + '<label for="vtJeu">Votre jeu favori</label><select id="vtJeu" required><option value="">Choisir un jeu</option>' + options + "</select>"
      + '<div class="vt-prev" id="vtPrev" hidden></div>'
      + '<p class="vt-msg" id="vtMsg" role="status"></p><button class="go main" type="submit" id="vtBtn">Voter</button></form>'
      + "</div>"
      + '<div class="vt-panel" id="vtHall" hidden><div class="vt-head"><h3>Hall of fame</h3><button class="linkbtn" type="button" id="vtRefresh">Actualiser</button></div>'
      + '<p class="vt-sum" id="vtSum"></p><p class="vt-empty" id="vtEmpty">Aucun vote pour l\'instant. À vous d\'ouvrir le bal.</p>'
      + '<ol class="vt-pod" id="vtPod" aria-label="Podium des jeux" hidden></ol>'
      + '<h4 class="vt-sub" id="vtFormesT" hidden>Lauréats par forme</h4><ul class="vt-formes" id="vtFormes" aria-labelledby="vtFormesT" hidden></ul>'
      + '<h4 class="vt-sub" id="vtListT" hidden>Le détail des voix</h4><ol class="vt-list" id="vtList" aria-labelledby="vtListT"></ol>'
      + '<h4 class="vt-sub" id="vtCitesT" hidden>Également cités, une voix chacun</h4><ul class="vt-cites" id="vtCites" aria-labelledby="vtCitesT" hidden></ul></div>'
      + "</div>";
    (q("#avent") || q("header.hero")).insertAdjacentElement("afterend", sec);

    const a = document.createElement("a");
    a.className = "go avgo";
    a.href = "#vote";
    a.innerHTML = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M1 21v-8h5v8zM6.5 21V6h5v15zM12 21v-5h5v5z" fill="currentColor"/></svg>Voter pour mon jeu préféré';
    const ancre = q(".avgo") || q(".lead");
    if (ancre) ancre.insertAdjacentElement("afterend", a);

    q("#vtGate").addEventListener("submit", async e => {
      e.preventDefault();
      const code = q("#vtCode").value.trim();
      if (!code) return say("#vtGateMsg", "Saisissez le code d'équipe.", "err");
      say("#vtGateMsg", "", "");
      let r;
      try { r = await call({ code }); } catch (err) { r = { status: 0, j: {} }; }
      if (r.status === 200) { mem.code = code; save(); q("#vtCode").value = ""; votes = r.j.votes || []; if (Array.isArray(r.j.liste)) noms = r.j.liste; show(true); render(); }
      else if (r.status === 401) say("#vtGateMsg", "Code inconnu. Demandez-le à l'équipe de pharmacotechnie.", "err");
      else say("#vtGateMsg", "Le vote ne répond pas. Réessayez dans un instant.", "err");
    });

    q("#vtForm").addEventListener("submit", async e => {
      e.preventDefault();
      const prenom = (noms.length ? q("#vtNom").value : q("#vtPrenom").value).trim(), jeu = q("#vtJeu").value, btn = q("#vtBtn");
      if (noms.length && !prenom) return say("#vtMsg", "Choisissez votre prénom dans la liste.", "err");
      if (prenom.length < 2 || prenom.length > 24 || !/^\p{L}+(?:[-'’]\p{L}+)*$/u.test(prenom))
        return say("#vtMsg", "Un seul prénom, sans espace ni chiffre (trait d'union accepté).", "err");
      if (!jeu) return say("#vtMsg", "Choisissez un jeu dans la liste.", "err");
      const cle = norm(prenom) + "|" + jeu;
      btn.disabled = true;
      let r;
      try { r = await call({ code: mem.code, prenom, jeu, remplacer: aConfirmer === cle }); } catch (err) { r = { status: 0, j: {} }; }
      btn.disabled = false;
      if (r.status === 200) {
        mem.prenom = prenom; save();
        votes = r.j.votes || votes;
        reset();
        say("#vtMsg", r.j.inchange ? "C'était déjà votre vote : " + jeu + "." : (r.j.remplace ? "Vote remplacé : " : "Vote enregistré : ") + jeu + ". Merci " + prenom + " !", "ok");
        render(jeu);
      } else if (r.status === 409) {
        aConfirmer = cle;
        btn.textContent = "Remplacer ce vote";
        say("#vtMsg", r.j.prenom + " a déjà voté pour " + r.j.jeu + ". Si c'est vous, validez de nouveau pour remplacer ce vote." + (noms.length ? "" : " Sinon, ajoutez une initiale à votre prénom."), "warn");
      } else if (r.status === 401) { delete mem.code; save(); show(false); }
      else if (r.status === 400 && r.j.error === "liste") { say("#vtMsg", "Ce prénom n'est pas dans la liste des participants. Prévenez l'équipe de pharmacotechnie.", "err"); load(); }
      else if (r.status === 400 && r.j.error === "prenom") say("#vtMsg", "Un seul prénom, sans espace ni chiffre (trait d'union accepté).", "err");
      else if (r.status === 403 && r.j.error === "scellee") say("#vtMsg", "Jury sous hotte : le vote ouvre le 2 décembre.", "warn");
      else if (r.status === 403) say("#vtMsg", "Le vote est complet.", "err");
      else say("#vtMsg", "Vote impossible pour l'instant. Réessayez dans un instant.", "err");
    });

    q("#vtPrenom").addEventListener("input", reset);
    q("#vtNom").addEventListener("change", reset);
    q("#vtJeu").addEventListener("change", () => { reset(); preview(); });
    q("#vtRefresh").addEventListener("click", () => load());
    window.addEventListener("hashchange", view);
    view();
  }

  function say(sel, text, kind) {
    const el = q(sel);
    el.textContent = text;
    el.className = "vt-msg" + (kind ? " " + kind : "");
  }

  function reset() {
    aConfirmer = "";
    q("#vtBtn").textContent = "Voter";
  }

  function show(ok) {
    q("#vtGate").hidden = ok;
    q("#vtForm").hidden = !ok;
    q("#vtHall").hidden = !ok;
  }

  function preview() {
    const g = BY.get(q("#vtJeu").value), el = q("#vtPrev");
    el.hidden = !g;
    if (g) el.innerHTML = '<img src="img/' + h(g.img) + '" alt=""><span><b>' + h(g.n) + "</b><small>" + h(CATS[g.c] ? CATS[g.c].f + " · " : "") + h(g.e) + "</small></span>";
  }

  function view() {
    const on = location.hash === "#vote";
    sec.hidden = !on;
    if (!on) return;
    document.querySelectorAll("#avent,.ind,.bar,main").forEach(e => { e.hidden = true; });
    sec.scrollIntoView({ block: "start" });
    load();
  }

  async function load() {
    if (!mem.code) return show(false);
    let r;
    try { r = await call({ code: mem.code }); } catch (e) { r = { status: 0, j: {} }; }
    if (r.status === 401) { delete mem.code; save(); return show(false); }
    show(true);
    if (r.status !== 200) return say("#vtMsg", "Le classement ne répond pas. Réessayez dans un instant.", "err");
    votes = r.j.votes || [];
    if (Array.isArray(r.j.liste)) noms = r.j.liste;
    render();
  }

  const voix = n => n + " voix";

  function render(flash) {
    const par = new Map();
    votes.forEach(v => { if (!par.has(v.g)) par.set(v.g, []); par.get(v.g).push(v); });
    const rows = [...par].map(([g, vs]) => ({ g, vs })).sort((a, b) => b.vs.length - a.vs.length || a.g.localeCompare(b.g, "fr"));
    const moi = mem.prenom ? norm(mem.prenom) : "";
    let rang = 0, prec = -1;
    rows.forEach((r, i) => { if (r.vs.length !== prec) { rang = i + 1; prec = r.vs.length; } r.rang = rang; r.jeu = BY.get(r.g); });
    const img = (g, lazy) => (g ? '<img src="img/' + h(g.img) + '" alt=""' + (lazy ? ' loading="lazy"' : "") + ">" : "");

    // Podium : les trois premiers rangs, les ex aequo partagent une marche. Au-delà de cinq jeux, la liste suffit.
    const tete = rows.filter(r => r.rang <= 3), podium = tete.length && tete.length <= 5;
    q("#vtPod").hidden = !podium;
    q("#vtPod").innerHTML = !podium ? "" : [1, 2, 3].map(n => {
      const L = tete.filter(r => r.rang === n);
      return !L.length ? "" : '<li class="vt-step s' + n + '"><ul>' + L.map(r => '<li data-g="' + h(r.g) + '">' + img(r.jeu) + "<b>" + h(r.g) + "</b></li>").join("")
        + '</ul><div class="vt-socle"><span class="sr">Rang </span><b>' + n + "</b><span>" + voix(L[0].vs.length) + (L.length > 1 ? '<span class="sr"> chacun, ex aequo</span>' : "") + "</span></div></li>";
    }).join("");

    // Lauréats par forme : le jeu le plus cité de chaque famille du catalogue. Égalité en tête : pas de lauréat désigné.
    q("#vtFormes").innerHTML = Object.keys(CATS).sort((a, b) => CATS[a].o - CATS[b].o).map(k => {
      const L = rows.filter(r => r.jeu && r.jeu.c === k), T = L.filter(r => r.vs.length === L[0].vs.length);
      return "<li" + (L.length ? "" : ' class="vide"') + "><small>" + h(CATS[k].f) + "</small>"
        + (!L.length ? "<b>Pas encore de voix</b><span>à vous de doser</span>"
          : "<b>" + (T.length <= 2 ? T.map(r => h(r.g)).join(" et ") : T.length + " jeux à égalité") + "</b><span>" + voix(T[0].vs.length) + (T.length > 1 ? T.length === 2 ? " chacun, ex aequo" : " chacun" : "") + "</span>") + "</li>";
    }).join("");

    // Détail des voix : les jeux du podium et ceux qui ont au moins deux voix. Les autres sont regroupés en dessous.
    const detail = rows.filter(r => r.vs.length > 1 || (podium && r.rang <= 3)), cites = rows.filter(r => !detail.includes(r));
    q("#vtList").innerHTML = detail.map(r => {
      const vu = podium && r.rang <= 3;
      return '<li class="vt-row' + (r.rang <= 3 ? " r" + r.rang : "") + (vu ? " np" : "") + '" data-g="' + h(r.g) + '"><span class="vt-rk"><span class="sr">Rang </span>' + r.rang + "</span>"
        + (vu ? "" : img(r.jeu, true) || "<span></span>")
        + '<div class="vt-main"><p class="vt-n"><b>' + h(r.g) + "</b><span>" + voix(r.vs.length) + "</span></p>"
        + '<ul class="vt-who" aria-label="Ont voté pour ce jeu">' + r.vs.map(v => "<li" + (norm(v.p) === moi ? ' class="me"' : "") + ">" + h(v.p) + "</li>").join("") + "</ul></div></li>";
    }).join("");
    q("#vtCites").innerHTML = cites.map(r => '<li data-g="' + h(r.g) + '"' + (norm(r.vs[0].p) === moi ? ' class="me"' : "") + ">" + h(r.g) + "<small>" + h(r.vs[0].p) + "</small></li>").join("");
    q("#vtFormes").hidden = q("#vtFormesT").hidden = !votes.length;
    q("#vtListT").hidden = !detail.length;
    q("#vtCites").hidden = q("#vtCitesT").hidden = !cites.length;
    q("#vtSum").textContent = votes.length ? votes.length + (votes.length > 1 ? " votes · " : " vote · ") + rows.length + (rows.length > 1 ? " jeux cités" : " jeu cité") : "";
    q("#vtEmpty").hidden = votes.length > 0;

    const mien = moi && votes.find(v => norm(v.p) === moi);
    const mine = q("#vtMine");
    mine.hidden = !mien;
    if (mien) mine.textContent = mien.p + ", votre vote actuel : " + mien.g + ".";
    if (!q("#vtPrenom").value && mem.prenom) q("#vtPrenom").value = mem.prenom;
    lister();
    if (!q("#vtJeu").value && mien && BY.has(mien.g)) { q("#vtJeu").value = mien.g; preview(); }

    if (flash) {
      const cible = [...document.querySelectorAll("#vtHall [data-g]")].filter(e => e.dataset.g === flash);
      cible.forEach(e => e.classList.add("vt-hit"));
      if (cible[0]) cible[0].scrollIntoView({ block: "nearest" });
    }
  }
})();
