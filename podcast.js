/* Lecteur du podcast « La ludothèque idéale pour Noël », en tête du catalogue. Propre au site Vercel : sans ce fichier,
   le catalogue reste tel quel. Le lecteur se glisse au début du bloc des indications (.ind), que les autres pages masquent
   déjà : il n'apparaît donc que sur le catalogue, et se met en pause quand on le quitte.
   Au repos, une petite pastille (disque et titre) ; elle se déploie à la lecture et se replie à la pause, en gardant la position.
   Disque au logo de l'unité (il tourne pendant la lecture, sauf en mouvement réduit), anneau de progression, lecture et pause,
   retour de 15 s, avance de 30 s, vitesse, barre de défilement. Le fichier n'est demandé qu'au premier appui (preload none).
   Ouverture : le 26 novembre 2026 à 7 h, heure de Paris (simple affichage). */
(() => {
  const OUVRE = "2026-11-26T07:00", SRC = "audio/podcast-ludotheque-noel.mp3", DUREE = 883;
  const TITRE = "La ludothèque idéale pour Noël", SOUS = "Le podcast du catalogue · 15 minutes pour remplir la hotte";
  const ou = document.querySelector(".ind");
  if (!ou || document.querySelector(".pc")) return;
  let auj = "";
  try { auj = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date()).replace(" ", "T"); } catch (e) { auj = new Date().toISOString().slice(0, 16); }
  if (auj < OUVRE) return;

  const st = document.createElement("style");
  st.textContent = `
.pc{display:grid;grid-template-columns:auto 1fr;gap:16px 20px;align-items:center;margin:0 0 26px;padding:16px 20px;border:3px solid #26076D;border-radius:22px;background:#26076D;color:#FFFBF2;box-shadow:6px 6px 0 var(--shadow,rgba(38,7,109,.35))}
.pc-d{position:relative;width:116px;height:116px;border-radius:50%;background:conic-gradient(#ECD567 calc(var(--p,0)*1%),rgba(255,251,242,.22) 0);padding:6px;box-sizing:border-box}
.pc-d img{display:block;width:100%;height:100%;border-radius:50%;background:#FFFBF2;object-fit:cover;animation:pcTour 9s linear infinite;animation-play-state:paused}
.pc.joue .pc-d img{animation-play-state:running}
.pc-go{position:absolute;inset:0;margin:auto;width:52px;height:52px;border:3px solid #26076D;border-radius:50%;background:#EC7739;color:#FFFBF2;cursor:pointer;display:grid;place-items:center;box-shadow:0 3px 0 #26076D;padding:0}
.pc-go:hover{background:#F08A52}.pc-go:active{transform:translateY(2px);box-shadow:0 1px 0 #26076D}
.pc-go svg{width:24px;height:24px;fill:currentColor}
.pc-go .pa{display:none}.pc.joue .pc-go .pl{display:none}.pc.joue .pc-go .pa{display:block}
.pc-t{min-width:0}
.pc-m{margin:0;font:600 .68rem var(--mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:#ECD567}
.pc h2{margin:2px 0 0;font-size:1.3rem;line-height:1.15;font-weight:800;color:#FFFBF2}
.pc-s{margin:3px 0 0;font-size:.86rem;color:#E5B4D9}
.pc-r{display:flex;align-items:center;gap:10px;margin-top:10px}
.pc-r input{flex:1;min-width:0;height:22px;margin:0;accent-color:#ECD567;cursor:pointer}
.pc-r span{font:600 .74rem var(--mono,monospace);white-space:nowrap}
.pc-b{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.pc-b button{min-height:36px;padding:5px 12px;border:2px solid #FFFBF2;border-radius:999px;background:transparent;color:#FFFBF2;font:inherit;font-weight:800;font-size:.8rem;cursor:pointer}
.pc-b button:hover{background:rgba(255,251,242,.14)}
.pc button:focus-visible,.pc input:focus-visible{outline:3px solid #ECD567;outline-offset:2px}
.pc-e{margin:8px 0 0;font-size:.82rem;color:#ECD567}
/* Au repos (pas de lecture en cours) : une simple pastille, sur ordinateur comme sur téléphone. Elle se déploie à la lecture. */
.pc:not(.joue){display:inline-grid;grid-template-columns:auto auto;gap:0 12px;justify-items:start;text-align:left;width:auto;max-width:100%;margin-bottom:18px;padding:7px 18px 7px 8px;border-radius:999px;box-shadow:4px 4px 0 var(--shadow,rgba(38,7,109,.35))}
.pc:not(.joue) .pc-d{width:54px;height:54px;padding:3px}
.pc:not(.joue) .pc-go{width:32px;height:32px;border-width:2px;box-shadow:0 2px 0 #26076D}
.pc:not(.joue) .pc-go svg{width:16px;height:16px}
.pc:not(.joue) h2{font-size:1rem;margin:1px 0 0}
.pc:not(.joue) .pc-m{font-size:.6rem}
.pc:not(.joue) .pc-s,.pc:not(.joue) .pc-r,.pc:not(.joue) .pc-b{display:none}
.pc:not(.joue) .pc-t{width:auto}
@keyframes pcTour{to{transform:rotate(360deg)}}
@media(max-width:560px){.pc.joue{grid-template-columns:1fr;justify-items:center;text-align:center;padding:16px 14px}.pc.joue .pc-d{width:104px;height:104px}.pc.joue .pc-t{width:100%}.pc.joue h2{font-size:1.15rem}.pc.joue .pc-b{justify-content:center}.pc:not(.joue) h2{font-size:.92rem}}
@media(prefers-reduced-motion:reduce){.pc-d img{animation:none}}`;
  document.head.appendChild(st);

  const el = document.createElement("section");
  el.className = "pc"; el.setAttribute("aria-label", "Podcast : " + TITRE);
  el.innerHTML = '<div class="pc-d"><img src="img/logo-pharmacotechnie.webp" alt="" width="104" height="104">'
    + '<button class="pc-go" type="button" aria-label="Écouter le podcast"><svg class="pl" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.5-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg><svg class="pa" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.5" height="14" rx="1.2"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.2"/></svg></button></div>'
    + '<div class="pc-t"><p class="pc-m">Podcast · 15 min</p><h2>' + TITRE + '</h2><p class="pc-s">' + SOUS + "</p>"
    + '<div class="pc-r"><span class="pc-c">0:00</span><input type="range" min="0" max="' + DUREE + '" value="0" step="1" aria-label="Position dans le podcast"><span class="pc-f"></span></div>'
    + '<div class="pc-b"><button type="button" data-s="-15" aria-label="Reculer de 15 secondes">− 15 s</button><button type="button" data-s="30" aria-label="Avancer de 30 secondes">+ 30 s</button><button type="button" data-v aria-label="Vitesse de lecture">Vitesse × 1</button></div>'
    + '<p class="pc-e" role="status" hidden></p></div>';
  ou.prepend(el);

  const q = s => el.querySelector(s), go = q(".pc-go"), barre = q("input"), dire = q(".pc-e");
  const mmss = t => { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); };
  const VIT = [1, 1.25, 1.5, 0.85]; let iv = 0, a = null, glisse = false;
  const duree = () => (a && isFinite(a.duration) && a.duration > 0 ? a.duration : DUREE);
  const peindre = () => {
    const t = a ? a.currentTime : 0, d = duree();
    if (!glisse) barre.value = Math.round(t);
    barre.max = Math.round(d);
    q(".pc-c").textContent = mmss(glisse ? +barre.value : t); q(".pc-f").textContent = mmss(d);
    q(".pc-d").style.setProperty("--p", (100 * (glisse ? +barre.value : t) / d).toFixed(2));
    barre.setAttribute("aria-valuetext", mmss(glisse ? +barre.value : t) + " sur " + mmss(d));
  };
  const etat = () => { const joue = !!a && !a.paused && !a.ended; el.classList.toggle("joue", joue); q(".pc-m").textContent = joue ? "À écouter" : a && a.currentTime > 1 ? "Podcast en pause · reprendre à " + mmss(a.currentTime) : "Podcast · 15 min"; go.setAttribute("aria-label", joue ? "Mettre le podcast en pause" : "Écouter le podcast"); };
  function creer() {
    if (a) return a;
    a = new Audio(); a.preload = "none"; a.src = SRC;
    ["play", "pause", "ended", "playing"].forEach(k => a.addEventListener(k, etat));
    ["timeupdate", "durationchange", "seeked"].forEach(k => a.addEventListener(k, peindre));
    a.addEventListener("error", () => { dire.textContent = "Le podcast n'a pas pu être chargé. Réessayez dans un instant."; dire.hidden = false; etat(); });
    a.addEventListener("ended", () => { try { a.currentTime = 0; } catch (e) {} peindre(); });
    try {
      if ("mediaSession" in navigator && window.MediaMetadata) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: TITRE, artist: "Pharmacotechnie ludique, Noël 2026", artwork: [{ src: "img/icone-512.png", sizes: "512x512", type: "image/png" }] });
        navigator.mediaSession.setActionHandler("seekbackward", () => sauter(-15));
        navigator.mediaSession.setActionHandler("seekforward", () => sauter(30));
      }
    } catch (e) { /* commandes de l'écran verrouillé facultatives */ }
    return a;
  }
  const sauter = s => { creer(); try { a.currentTime = Math.min(duree() - 1, Math.max(0, a.currentTime + s)); } catch (e) {} peindre(); };
  go.addEventListener("click", () => { creer(); dire.hidden = true; if (a.paused) a.play().catch(() => { dire.textContent = "La lecture n'a pas démarré. Touchez de nouveau le bouton."; dire.hidden = false; }); else a.pause(); });
  el.addEventListener("click", ev => {
    const b = ev.target.closest(".pc-b button"); if (!b) return;
    if (b.dataset.s) return sauter(+b.dataset.s);
    iv = (iv + 1) % VIT.length; creer(); a.playbackRate = VIT[iv]; b.textContent = "Vitesse × " + String(VIT[iv]).replace(".", ",");
  });
  barre.addEventListener("input", () => { glisse = true; peindre(); });
  barre.addEventListener("change", () => { creer(); try { a.currentTime = +barre.value; } catch (e) {} glisse = false; peindre(); });
  // Hors du catalogue, le lecteur n'est plus à l'écran : on met en pause plutôt que de laisser parler dans le vide.
  window.addEventListener("hashchange", () => setTimeout(() => { if (a && !a.paused && el.offsetParent === null) a.pause(); }, 120));
  peindre();
})();
