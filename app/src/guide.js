"use strict";
/* ============ The Chog of Wall Street guide: a short first-visit tour, one-time tips, and the "First rounds" checklist on the Desk ============
   Reads game state (G, SQ, K, U and helpers from engine.js / ui.js) and listens to window.Guide.on(event, data) calls from the interface. */
window.Guide = (() => {
  const LS = "cows.guide.v2";
  const st = { seen: {}, tourDone: false, hints: true, goalsOpen: true };
  try { Object.assign(st, JSON.parse(localStorage.getItem(LS) || "{}")); } catch (e) { /* storage blocked: guide still works for this visit */ }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) { /* ignore */ } };

  // ---------- DOM ----------
  const ring = document.createElement("div"); ring.className = "g-ring"; ring.hidden = true;
  const bub = document.createElement("div"); bub.className = "g-bub"; bub.hidden = true; bub.setAttribute("role", "dialog"); bub.setAttribute("aria-live", "polite");
  const beacon = document.createElement("div"); beacon.className = "g-beacon"; beacon.hidden = true;
  document.body.append(ring, bub, beacon);

  let cur = null;          // step on screen
  const queue = [];        // waiting one-time tips
  let tour = null;         // { steps, i }
  const done = {};         // goals done this session
  let beaconSel = null;

  // ---------- positioning ----------
  const q = sel => { if (!sel) return null; for (const s of [].concat(sel)) { const el = document.querySelector(s); if (el && el.getClientRects().length) return el; } return null; };
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  function place() {
    if (cur) {
      const el = q(cur.sel);
      if (el) {
        const r = el.getBoundingClientRect(), pad = 6;
        ring.hidden = false; ring.classList.toggle("dim", !!cur.dim);
        Object.assign(ring.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
        const bw = bub.offsetWidth, bh = bub.offsetHeight, vw = innerWidth, vh = innerHeight, m = 12;
        let y, side;
        if (r.bottom + bh + 18 < vh) { side = "below"; y = r.bottom + 14; }
        else if (r.top - bh - 18 > 0) { side = "above"; y = r.top - bh - 14; }
        else { side = "inside"; y = clampN(r.top + 10, m, vh - bh - m); }
        const x = clampN(r.left + r.width / 2 - bw / 2, m, vw - bw - m);
        bub.style.left = x + "px"; bub.style.top = y + "px"; bub.dataset.side = side;
        bub.style.setProperty("--ax", clampN(r.left + r.width / 2 - x, 18, bw - 18) + "px");
      } else {
        ring.hidden = true; bub.dataset.side = "inside";
        bub.style.left = Math.max(12, innerWidth / 2 - bub.offsetWidth / 2) + "px"; bub.style.top = Math.max(12, innerHeight / 2 - bub.offsetHeight / 2) + "px";
      }
    }
    const bt = !cur && beaconSel ? q(beaconSel) : null;
    if (bt) { const r = bt.getBoundingClientRect(); beacon.hidden = false; beacon.style.left = r.right - 9 + "px"; beacon.style.top = r.top - 9 + "px"; }
    else beacon.hidden = true;
    requestAnimationFrame(place);
  }
  requestAnimationFrame(place);

  // ---------- showing steps ----------
  function show(step) {
    if (step.room && U.room !== step.room) { closeSheet(); room(step.room); }
    step._wait = step.wait || null;
    cur = step;
    const count = tour && step.tour ? `<span class="g-count">${tour.i + 1} / ${tour.steps.length}</span>` : `<span class="g-count">Tip</span>`;
    bub.innerHTML = `<div class="g-head">${count}<b>${step.title}</b></div><div class="g-text">${step.text}</div>
      <div class="g-act">${step._wait ? `<span class="g-do">${step.doLabel || "Do it to continue"}</span>` : `<button class="btn primary sm" data-g="next">${step.next || "Got it"}</button>`}
      <button class="g-skip" data-g="skip">${tour && step.tour ? "Skip tour" : "Hide tips"}</button></div>`;
    bub.hidden = false;
    const el = q(step.sel);
    if (el) { const r = el.getBoundingClientRect(); if (r.top < 80 || r.bottom > innerHeight - 60) el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); }
    bub.querySelector("[data-g=next]")?.focus({ preventScroll: true });
  }
  function hide() { cur = null; bub.hidden = true; ring.hidden = true; }
  function finish() {
    if (!cur) return;
    const step = cur; hide();
    if (step.id) { st.seen[step.id] = true; save(); }
    if (step.tour && tour) {
      tour.i++; if (tour.i < tour.steps.length) return show(tour.steps[tour.i]);
      tour = null; st.tourDone = true; save(); lastGoals = ""; renderGoals();
      toast("Tour done. The <b>First rounds</b> checklist on your Desk shows what to try next.");
    }
    while (queue.length) { const n = queue.shift(); if (!n.only || n.only === U.room) return show(n); }
  }
  bub.addEventListener("click", e => {
    const b = e.target.closest("[data-g]"); if (!b) return;
    if (b.dataset.g === "next") finish();
    if (b.dataset.g === "skip") {
      if (tour && cur?.tour) { tour = null; st.tourDone = true; save(); hide(); lastGoals = ""; renderGoals(); toast("Tour skipped. Replay it any time from Rules."); }
      else { st.hints = false; save(); queue.length = 0; hide(); lastGoals = ""; renderGoals(); toast("Tips are off. Turn them back on in Rules."); }
    }
  });

  /** One-time tip. Shows once per browser unless reset from Rules. */
  function hint(id, step) {
    if (!st.hints || st.seen[id] || cur?.id === id || queue.some(s => s.id === id)) return;
    if (step.only && U.room !== step.only) return;
    const s = { ...step, id };
    if (cur || tour) queue.push(s); else show(s);
  }

  // ---------- the first-visit tour: Desk → Map → roll → title deed → Bank → checklist ----------
  const TOUR = () => [
    { room: "desk", title: "This is your Desk", sel: "#deskChog", text: "Your Chog and what it's worth. Everything you build lives inside this NFT. Start here every visit: it shows what happened while you were away." },
    { room: "desk", title: "Your move and the clock", sel: "#deskMove", text: "Rolls ready and time left in the season. When the clock hits zero, the top Chogs share the season pot and the bottom quarter pays into it." },
    { room: "map", title: "Press Roll", sel: "#roll", dim: true, wait: "rolled", doLabel: "Click Roll", text: "Your Chog moves around the board, and your <b>buying plan</b> buys Bricks (shares of the street) where it lands. One roll refills every 30 minutes, up to 8." },
    { room: "map", title: "Tap your square", sel: ["#mapBox .tile.here", "#mapBox"], wait: "tile", doLabel: "Tap the glowing square", text: "Every square opens a title deed. Try the one your Chog is standing on." },
    { title: "The title deed", sel: "#modal", wait: "sheetClosed", doLabel: "Close the card to continue", text: "Rent per level, the Brick price, and which Chogs own it. This is the only place you see other Chogs: <b>Message</b> or <b>Hype</b> them from here." },
    { room: "map", title: "Your buying plan", sel: "#plans", text: "<b>Safe</b> buys a few Bricks and keeps half your cash. <b>Balanced</b> buys up to 6. <b>Degen</b> spends it all. It's set before the dice land." },
    { room: "bank", title: "The Bank", sel: ["#claimBtn", "#bankTax"], text: "Claim rent, keep Property Tax paid (autopay is on), and see what leaving would cost. Cash-out tax goes to the Chogs who stay." },
    { room: "leaders", title: "Leaders", sel: [".podium", "#room-leaders .lbtabs"], text: "Its own page. <b>This season</b> ranks growth and pays the prizes. <b>Richest</b> ranks total net worth. The bottom quarter pays 5% of its cash into the pot when the season ends." },
    { room: "desk", title: "Your first rounds", sel: "#goals", text: "Work down this list. Press <b>Show me</b> and the game points at exactly where to click." },
  ].map(s => ({ ...s, tour: true }));
  function startTour() { if (!G.me) return; queue.length = 0; hide(); closeSheet(); tour = { steps: TOUR(), i: 0 }; show(tour.steps[0]); }

  // ---------- First rounds checklist (lives on the Desk) ----------
  let seenBankOut = false;
  const GOALS = [
    { id: "roll", label: "Roll the dice", room: "map", sel: "#roll", how: "On the Map, press Roll." },
    { id: "bricks", label: "Own your first Bricks", room: "map", sel: ["#plans", "#roll"], how: "Keep rolling with Balanced or Degen. Your Chog buys Bricks on the street it lands on.", check: () => brickValue(G.me) > 0 },
    { id: "rent", label: "Earn rent from another Chog", room: "desk", sel: ["#ff2", "#deskInbox"], how: "Other Chogs land on your streets over time. In Practice, press +2 hours to let the city move.", check: () => G.me.unclaimed > 0 || G.me.lastIncome > 0 },
    { id: "claim", label: "Claim your rent", room: "bank", sel: "#claimBtn", how: "In the Bank, press Claim. Prestige and stamps add a bonus from the Commons." },
    { id: "quest", label: "Use a Monad app square", room: "map", sel: ["#modal [data-quest]", "#roll"], how: "Land on a square with an app logo, then press its app button. The position is held by your Chog." },
    { id: "dm", label: "Message another Chog", room: "map", sel: ["#mapBox .tile.mine", "#mapBox .tile.here"], how: "Tap a street, find an owner on its title deed and press Message." },
    { id: "cashout", label: "See what cashing out costs", room: "bank", sel: ["#coAmt", "#bankOut"], how: "In the Bank, drag the cash-out slider. You don't have to confirm.", check: () => seenBankOut },
  ];
  const nextGoal = () => GOALS.find(g => !done[g.id]);
  let lastGoals = "";
  function renderGoals() {
    const box = document.getElementById("goals"); if (!box || !G.me) return;
    const html = goalsHtml(); if (html !== lastGoals || !box.innerHTML) { lastGoals = html; box.innerHTML = html; }
  }
  function goalsHtml() {
    const n = GOALS.filter(g => done[g.id]).length, nx = nextGoal();
    if (!nx) { beaconSel = null; return `<div class="goals done"><b>First rounds done.</b> You know the city. Replay the tour any time from Rules.</div>`; }
    beaconSel = st.hints && !tour && U.room === nx.room ? nx.sel : null;
    return `<div class="goals"><button class="g-top" data-goal-toggle aria-expanded="${st.goalsOpen}"><span>First rounds</span><span class="g-prog"><i style="width:${n / GOALS.length * 100}%"></i></span><span class="num">${n}/${GOALS.length}</span></button>
      ${st.goalsOpen ? `<ol>${GOALS.map(g => `<li class="${done[g.id] ? "ok" : g === nx ? "now" : ""}"><span class="tick">${done[g.id] ? "✓" : ""}</span><span>${g.label}</span>${g === nx ? `<button class="btn sm" data-goal-show="${g.id}">Show me</button>` : ""}</li>`).join("")}</ol>` : ""}</div>`;
  }
  function complete(id) { if (done[id]) return; done[id] = true; const g = GOALS.find(x => x.id === id); if (g && G.me) toast(`✓ ${g.label}`); lastGoals = ""; renderGoals(); }
  document.addEventListener("click", e => {
    if (e.target.closest("[data-goal-toggle]")) { st.goalsOpen = !st.goalsOpen; save(); lastGoals = ""; renderGoals(); return; }
    const h = e.target.closest("[data-help]");
    if (h) {
      if (h.dataset.help === "tour") { st.hints = true; save(); startTour(); }
      if (h.dataset.help === "reset") { st.seen = {}; st.hints = true; save(); lastGoals = ""; renderGoals(); toast("Tips reset. You'll see each one again the first time it applies."); }
      return;
    }
    const s = e.target.closest("[data-goal-show]"); if (!s) return;
    const g = GOALS.find(x => x.id === s.dataset.goalShow);
    queue.length = 0; hide();
    setTimeout(() => show({ room: g.room, title: g.label, sel: g.sel, text: g.how, next: "OK" }), 30);
  });

  // ---------- events from the interface ----------
  function on(ev, d) {
    if (ev === "room" && cur && !cur.tour && cur.only && cur.only !== d) { hide(); queue.length = 0; }
    if (ev === "woke") { lastGoals = ""; renderGoals(); if (!st.tourDone) setTimeout(startTour, 400); return; }
    if (tour && cur?.tour && cur._wait === ev) finish();
    if (tour) return; // no tips on top of the tour
    if (ev === "rolled") {
      complete("roll");
      if (d?.jail) hint("jail", { only: "map", title: "Rug Jail", sel: "#bail", text: "Roll doubles to walk out (3 tries), or pay 500 bail. Your Bricks still earn rent while you're inside." });
      const sq = d?.sq;
      if (sq?.t === "go") hint("go", { only: "map", title: "GENESIS dividend", sel: "#lastev", text: "Passing GENESIS pays 1% of your Bricks' value (max 500) from the Commons. Own nothing, earn nothing." });
      if (sq?.t === "tax") hint("tax-sq", { only: "map", title: sq.name, sel: "#lastev", text: "Tax squares pay into the Nad Lounge pot. Land on the Nad Lounge corner to win 25% of it." });
    }
    if (ev === "tile" && d?.landed && SQ[d.i].brand) hint("quest-card", { title: "A real Monad app", sel: "#modal .questbox", text: "This square is wired to a real app. In Practice it's simulated. On Testnet and Mainnet the position is bought for real and held by your Chog, not your wallet." });
    if (ev === "heistOpen") hint("heist", { title: "Heist", sel: "#modal", text: "Pick a target. The % is your chance. Win: take 10% of their unclaimed rent. Lose: pay them 500 and go to Rug Jail. Cash and Bricks are never at risk." });
    if (ev === "room" && d === "bank") hint("bank-out", { only: "bank", title: "Leaving costs money", sel: ["#coAmt", "#bankOut"], text: "Drag the slider to see the tax (20%, falling to 10% the longer you stay), the 48-hour wait, and the Prestige you'd lose. Selling the whole Chog usually beats stripping it." });
    if (ev === "render" && G.me) stateHints();
  }
  // goals count even during the tour
  const onAny = (ev, d) => {
    if (ev === "rolled") complete("roll");
    if (ev === "claimed") complete("claim");
    if (ev === "quest") complete("quest");
    if (ev === "dm") complete("dm");
    if (ev === "cashslide") { seenBankOut = true; complete("cashout"); }
    on(ev, d);
  };

  function stateHints() {
    const c = G.me;
    GOALS.forEach(g => { if (g.check && !done[g.id] && g.check()) complete(g.id); });
    if (brickValue(c) > 0 && U.room === "map") hint("bricks", { only: "map", title: "You own Bricks", sel: "#mapBox .tile.mine", text: "Squares with a gold dot are yours. Every Chog that lands there pays rent, and 90% goes to the holders." });
    if (c.unclaimed > 0 && U.room === "desk") hint("claim", { only: "desk", title: "Rent is waiting", sel: "#deskTodo", text: "Other Chogs paid rent to your Bricks. Claim it from your to-do list or the Bank. Unclaimed rent can be stolen in a HEIST." });
    if (G.bellEnd !== null && U.room === "desk") hint("bell", { only: "desk", title: "The Closing Bell", sel: "#deskMove", text: "The last 24 hours. Every Brick buy adds a minute. The last buyer when it hits zero wins 10% of the season pot." });
    renderGoals();
  }

  return { on: onAny, startTour };
})();
