"use strict";
/* ============ The Chog of Wall Street guide: first-round tour, one-time explainers, "First rounds" checklist, help + glossary ============
   Reads game state (G, SQ, K, helpers from game.js) and listens to window.Guide.on(event, data) calls from the game. */
window.Guide = (() => {
  const LS = "cows.guide.v1";
  const st = { seen: {}, tourDone: false, hints: true, goalsOpen: true };
  try { Object.assign(st, JSON.parse(localStorage.getItem(LS) || "{}")); } catch (e) { /* storage blocked: guide still works for this visit */ }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) { /* ignore */ } };

  // ---------- DOM ----------
  const ring = document.createElement("div"); ring.className = "g-ring"; ring.hidden = true;
  const bub = document.createElement("div"); bub.className = "g-bub"; bub.hidden = true; bub.setAttribute("role", "dialog"); bub.setAttribute("aria-live", "polite");
  const beacon = document.createElement("div"); beacon.className = "g-beacon"; beacon.hidden = true;
  document.body.append(ring, bub, beacon);

  let cur = null;          // step on screen
  const queue = [];        // waiting one-time hints
  let tour = null;         // { steps, i }
  const done = {};         // goals done this session
  let beaconSel = null;

  // ---------- positioning ----------
  const q = sel => { if (!sel) return null; const list = Array.isArray(sel) ? sel : [sel]; for (const s of list) { const el = document.querySelector(s); if (el && el.getClientRects().length) return el; } return null; };
  function place() {
    if (cur) {
      const el = q(cur.sel);
      if (el) {
        const r = el.getBoundingClientRect(), pad = 6;
        ring.hidden = false; ring.classList.toggle("dim", !!cur.dim);
        Object.assign(ring.style, { left: r.left - pad + "px", top: r.top - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
        const bw = bub.offsetWidth, bh = bub.offsetHeight, vw = innerWidth, vh = innerHeight, m = 12;
        let x, y, side;
        if (r.bottom + bh + 18 < vh) { side = "below"; y = r.bottom + 14; }
        else if (r.top - bh - 18 > 0) { side = "above"; y = r.top - bh - 14; }
        else if (r.right + bw + 18 < vw) { side = "right"; x = r.right + 14; y = clampN(r.top, m, vh - bh - m); }
        else if (r.left - bw - 18 > 0) { side = "left"; x = r.left - bw - 14; y = clampN(r.top, m, vh - bh - m); }
        else { side = "inside"; y = clampN(r.top + 10, m, vh - bh - m); }
        if (x === undefined) x = clampN(r.left + r.width / 2 - bw / 2, m, vw - bw - m);
        bub.style.left = x + "px"; bub.style.top = y + "px"; bub.dataset.side = side;
        const ax = clampN(r.left + r.width / 2 - x, 18, bw - 18), ay = clampN(r.top + r.height / 2 - y, 18, bh - 18);
        bub.style.setProperty("--ax", ax + "px"); bub.style.setProperty("--ay", ay + "px");
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
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  requestAnimationFrame(place);

  // ---------- showing steps ----------
  function show(step) {
    step._wait = step.wait && (!step.waitIf || step.waitIf()) ? step.wait : null;
    cur = step;
    const total = tour ? tour.steps.length : 0;
    const count = tour && step.tour ? `<span class="g-count">${tour.i + 1} / ${total}</span>` : `<span class="g-count">New</span>`;
    bub.innerHTML = `<div class="g-head">${count}<b>${step.title}</b></div><div class="g-text">${typeof step.text === "function" ? step.text() : step.text}</div>
      <div class="g-act">${step._wait ? `<span class="g-do">${step.doLabel || "Do it to continue"}</span>` : `<button class="btn sm gold" data-g="next">${step.next || "Got it"}</button>`}
      <button class="g-skip" data-g="skip">${tour && step.tour ? "Skip tour" : "Hide hints"}</button></div>`;
    bub.hidden = false;
    const el = q(step.sel);
    if (el) { const r = el.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 40) el.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
    if (step.onShow) step.onShow();
    const btn = bub.querySelector("[data-g=next]"); if (btn) btn.focus({ preventScroll: true });
  }
  function finish() {
    if (!cur) return;
    const step = cur; cur = null; bub.hidden = true; ring.hidden = true;
    if (step.id) { st.seen[step.id] = true; save(); }
    if (step.tour && tour) { tour.i++; if (tour.i < tour.steps.length) return show(tour.steps[tour.i]); tour = null; st.tourDone = true; save(); renderGoals(); toast("Tour done. Follow the First rounds checklist on the right."); }
    if (queue.length) show(queue.shift());
  }
  bub.addEventListener("click", e => {
    const b = e.target.closest("[data-g]"); if (!b) return;
    if (b.dataset.g === "next") finish();
    if (b.dataset.g === "skip") {
      if (tour && cur && cur.tour) { tour = null; st.tourDone = true; cur = null; bub.hidden = true; ring.hidden = true; save(); renderGoals(); toast("Tour skipped. Replay it any time from ? Help."); }
      else { st.hints = false; save(); queue.length = 0; cur = null; bub.hidden = true; ring.hidden = true; toast("Hints are off. Turn them back on in ? Help."); }
    }
  });

  /** One-time explainer. Shows once per browser unless reset from Help. */
  function hint(id, step) {
    if (!st.hints || st.seen[id] || (cur && cur.id === id) || queue.some(s => s.id === id)) return;
    const s = { ...step, id };
    if (cur || tour) queue.push(s); else show(s);
  }

  // ---------- the first-round tour ----------
  const TOUR = () => [
    { title: "Welcome to Monad City", sel: "#board", dim: true, text: "40 squares. Every street, station and utility is named after a real Monad app. Other Chogs are moving around the board right now." },
    { title: "Press ROLL", sel: "#roll", dim: true, wait: "rolled", doLabel: "Click ROLL", text: "Rolling moves your Chog. Your <b>plan</b> (below the button) decides what it buys where it lands. You get one roll every 30 minutes, up to 8." },
    { title: "What just happened", sel: [".sheet", "#lastev"], wait: "sheetClosed", waitIf: () => !!document.querySelector(".sheet"), doLabel: "Close the card to continue", text: () => landingText() },
    { title: "Your buying plan", sel: [".cmid .plans", ".mplans"], text: "<b>Safe</b> buys up to 3 Bricks on cheap streets and keeps half your cash. <b>Balanced</b> buys up to 6. <b>Degen</b> buys up to 15. It's locked in before the dice land, so nobody can snipe you." },
    { title: "Rolls left", sel: "#energy", text: "Green bars are stored rolls. One refills every 30 minutes. Out of rolls? Wait, use <b>+2 hours</b>, or pay 100 $CHOG for an extra roll." },
    { title: "What your NFT is worth", sel: ["#pane .big", ".tabs"], onShow: () => { if (G.tab !== "chog") setTab("chog"); }, text: "The <b>Appraisal</b>: cash + Bricks + unclaimed rent + dapp positions inside this Chog. It all lives in the NFT. Sell the Chog and the buyer gets everything." },
    { title: "Prestige", sel: ["#pane .bar", ".tabs"], text: "+1% claim weight for every day you don't cash out, up to +50%. It belongs to the Chog. <b>Cashing out resets it to zero.</b>" },
    { title: "The city's money", sel: ".cbot", text: "<b>Commons</b>: the shared treasury that pays dividends and bonuses. <b>Nad Lounge</b>: land on that corner to win 25% of it. Nothing is ever minted: every coin came from a player." },
    { title: "More to explore", sel: ".tabs", text: "<b>Land</b>: your streets and Property Tax. <b>Cash out</b>: what leaving costs. <b>City</b>: leaderboard and hype. You'll get a short tour the first time you open each one." },
    { title: "Your first rounds", sel: "#goals", text: "Work through this checklist. Press <b>Show me</b> on any step and the game points at exactly where to click." },
  ].map(s => ({ ...s, tour: true }));
  function landingText() {
    const c = G.me, sq = SQ[c.pos], last = G.feed[0]?.text || "";
    let t = `You landed on <b>${sq.name}</b>. `;
    if (sq.t === "prop") {
      if (/Bricks/.test(last)) t += "Your plan bought <b>Bricks</b> here: shares of this street. Every Chog that lands here now pays rent, and part of it goes to your Chog. ";
      else if (/rent/.test(last)) t += "Other Chogs own Bricks here, so you paid them rent. ";
      t += `The purple button on the card is a <b>dapp quest</b>: use ${sq.dapp} for a Patron Stamp and a free roll.`;
    } else t += "Special squares do things instead of charging rent. Tap any square on the board to read what it does.";
    return t;
  }
  function startTour() { if (!G.me) return; queue.length = 0; cur = null; tour = { steps: TOUR(), i: 0 }; show(tour.steps[0]); }

  // ---------- First rounds checklist ----------
  const GOALS = [
    { id: "roll", label: "Roll the dice", sel: "#roll", how: "Click the big yellow ROLL button in the middle of the board." },
    { id: "bricks", label: "Own your first Bricks", sel: ["#roll"], how: "Keep rolling. With BALANCED or DEGEN selected, your Chog buys Bricks on the street it lands on.", check: () => brickValue(G.me) > 0 },
    { id: "rent", label: "Earn rent from another Chog", sel: "#ff1", how: "Bots land on your streets over time. Click +2 hours to let the city move.", check: () => G.me.unclaimed > 0 || G.me.lastIncome > 0 },
    { id: "claim", label: "Claim rent into your Chog", sel: ["#claimBtn", '[data-tab="chog"]'], tab: "chog", how: "In My Chog, press the gold Claim button. Prestige and stamps add a bonus from the Commons." },
    { id: "quest", label: "Do a dapp quest", sel: ["[data-quest]", "#roll"], how: "Land on any app street or station, then press the purple quest button on its card." },
    { id: "tax", label: "Set up Property Tax", sel: ["#autoTax", '[data-tab="land"]'], tab: "land", how: "In Land, keep Autopay on or prepay. Unpaid Bricks stop earning (but you never lose them)." },
    { id: "vault", label: "See what cashing out costs", sel: '[data-tab="vault"]', how: "Open the Cash out tab and compare stripping the Chog with selling it whole." },
    { id: "hype", label: "Hype another Chog", sel: ["#hypeTop", '[data-tab="city"]'], tab: "city", how: "In City, hype the leader. 10% is burned and the rest boosts their rent for 4 hours." },
  ];
  const gEl = () => document.getElementById("goals");
  function nextGoal() { return GOALS.find(g => !done[g.id]); }
  let lastGoals = "";
  function renderGoals() {
    const box = gEl(); if (!box) return;
    const html = goalsHtml(); if (html !== lastGoals) { lastGoals = html; box.innerHTML = html; }
  }
  function goalsHtml() {
    if (!G.me) return "";
    const n = GOALS.filter(g => done[g.id]).length, nx = nextGoal();
    if (!nx) { beaconSel = null; return `<div class="goals done"><b>All first rounds done.</b> You know the city. Replay the tour any time from ? Help.</div>`; }
    beaconSel = st.hints && !tour ? nx.sel : null;
    return `<div class="goals">
      <button class="g-top" data-goal-toggle aria-expanded="${st.goalsOpen}"><span>First rounds</span><span class="g-prog"><i style="width:${n / GOALS.length * 100}%"></i></span><span class="num">${n}/${GOALS.length}</span><span aria-hidden="true">${st.goalsOpen ? "▾" : "▸"}</span></button>
      ${st.goalsOpen ? `<ol>${GOALS.map(g => `<li class="${done[g.id] ? "ok" : g === nx ? "now" : ""}"><span class="tick">${done[g.id] ? "✓" : ""}</span><span>${g.label}</span>${g === nx ? `<button class="btn sm gold" data-goal-show="${g.id}">Show me</button>` : ""}</li>`).join("")}</ol>` : ""}
    </div>`;
  }
  function complete(id) { if (done[id]) return; done[id] = true; const g = GOALS.find(x => x.id === id); if (g && G.me) toast(`✓ ${g.label}`); renderGoals(); }
  document.addEventListener("click", e => {
    if (e.target.closest("[data-goal-toggle]")) { st.goalsOpen = !st.goalsOpen; save(); renderGoals(); return; }
    const s = e.target.closest("[data-goal-show]"); if (!s) return;
    const g = GOALS.find(x => x.id === s.dataset.goalShow);
    if (g.tab && G.tab !== g.tab && g.id !== "vault") setTab(g.tab);
    queue.length = 0; cur = null;
    setTimeout(() => show({ title: g.label, sel: g.sel, text: g.how, next: "OK" }), 30);
  });

  // ---------- tab tours (first visit of each tab) ----------
  const TAB_HINTS = {
    land: [
      ["land-tax", { title: "Property Tax", sel: "#pane .card:nth-child(1)", text: "Bricks cost 0.5% of their value per day. <b>Autopay</b> is on, so your Chog pays from its cash. If it's unpaid, rent goes to the Commons, but you never lose the Bricks." }],
      ["land-streets", { title: "Your streets", sel: "#pane .card:nth-child(2)", text: "Every street where your Chog holds Bricks. Tap one for details. You can sell Bricks back any time (5% spread), and the cash stays inside the Chog." }],
      ["land-guards", { title: "Guards", sel: "#guard", text: "Other Chogs can land on HEIST and rob 10% of your <b>unclaimed</b> rent. Each guard cuts their odds by 5%. Claiming often also protects you." }],
    ],
    vault: [
      ["vault-out", { title: "Leaving costs money", sel: "#pane .card.paper", text: "Drag the slider. You'll see the tax (20%, down to 10% if you're loyal), where it goes, the Prestige you'd lose, and the 48-hour wait." }],
      ["vault-sell", { title: "The better exit", sel: "#pane .compare", text: "Bricks can't leave the Chog. Selling the whole Chog on a marketplace usually beats stripping it, which is why holding the NFT gets more valuable." }],
    ],
    city: [
      ["city-lb", { title: "Leaderboard", sel: "#pane .card:nth-child(1)", text: "Chogs ranked by Appraisal. When the season ends, the #1 Chog becomes the gold statue in the centre of the board." }],
      ["city-hype", { title: "Hype", sel: "#hypeTop", text: "Send $CHOG to another Chog's hype jar. 10% is burned. Their rent claims get boosted for 4 hours, paid only from the jar." }],
      ["city-zero", { title: "Zero-sum check", sel: "#pane .card:nth-child(3)", text: "Proof that the game never prints money: everything held equals what came in, minus what left and what burned." }],
    ],
  };

  // ---------- events from the game ----------
  function on(ev, d) {
    if (ev === "woke") { renderGoals(); if (!st.tourDone) setTimeout(startTour, 350); else toast("Your Chog is awake. Press ROLL."); return; }
    if (tour && cur && cur.tour && cur._wait === ev) { finish(); }
    if (ev === "rolled") {
      complete("roll");
      const c = G.me;
      if (d && d.jail) hint("jail", { title: "Rug Jail", sel: "#bail", text: "You're in Rug Jail. Roll doubles to walk out (3 tries), or pay 500 bail with this button. Rent still flows to your Bricks while you're inside." });
      const sq = d && d.sq;
      if (sq && sq.t === "lounge") hint("lounge", { title: "Nad Lounge jackpot", sel: "#potLounge", text: "You won 25% of the Nad Lounge pot. Taxes, bail and extra rolls keep refilling it." });
      if (sq && sq.t === "go") hint("go", { title: "GENESIS dividend", sel: "#t0", text: "Each time you pass GENESIS, you collect 1% of your Bricks' value (max 500) from the Commons. Own nothing, earn nothing." });
      if (sq && sq.t === "tax") hint("tax-sq", { title: sq.name, sel: "#potLounge", text: "Tax squares pay into the Nad Lounge pot. Somebody's next jackpot." });
    }
    if (ev === "tile" && d && d.landed && SQ[d.i].t === "prop" && !(tour && cur && cur.tour)) {
      hint("quest-card", { title: "Dapp quest", sel: ".sheet .quest", text: "Do this with the real app (the button is simulated here) for a <b>Patron Stamp</b> (+1% claim weight, forever, on this Chog) and a free roll once a day." });
    }
    if (ev === "tile" && d && !d.landed) hint("tile-info", { title: "Square details", sel: ".sheet", text: "Any square can be tapped. You see rent, Brick price, which Chogs own it, and the dapp quest. You can only <b>buy</b> by landing here." });
    if (ev === "heistOpen") hint("heist", { title: "Heist", sel: ".sheet", text: "Pick a target. The % is your chance. Win: take 10% of their unclaimed rent. Lose: pay them 500 and go to Rug Jail. Cash and Bricks are never at risk." });
    if (ev === "card") hint("card", { title: "Cards", sel: ".sheet", text: "Entropy and Commons Chest cards move you, pay you from the Commons, or charge you into the Nad Lounge. On mainnet the draw uses Pyth Entropy randomness." });
    if (ev === "claimed") complete("claim");
    if (ev === "quest") complete("quest");
    if (ev === "tax") complete("tax");
    if (ev === "hyped") complete("hype");
    if (ev === "tab") {
      if (d === "land") complete("tax"); // autopay is on by default; seeing it counts
      if (d === "vault") complete("vault");
      (TAB_HINTS[d] || []).forEach(([id, s]) => hint(id, s));
    }
    if (ev === "plan") hint("plan", { title: `Plan: ${d.toUpperCase()}`, sel: [".cmid .plans", ".mplans"], text: "Your plan applies from your next roll." });
    if (ev === "render" && G.me) stateHints();
  }

  function stateHints() {
    const c = G.me;
    if (!done.bricks && brickValue(c) > 0) { complete("bricks"); hint("bricks", { title: "You own Bricks", sel: ".tile .mine", text: "The gold dot marks streets where your Chog holds Bricks. Every Chog that lands there pays rent, and 90% of it goes to the Brick holders." }); }
    if (!done.rent && (c.unclaimed > 0 || c.lastIncome > 0)) complete("rent");
    if (c.unclaimed > 0) hint("claim", { title: "Rent is waiting", sel: ["#claimBtn", '[data-tab="chog"]'], text: "Other Chogs paid rent to your Bricks. Claim it into your Chog's cash. Unclaimed rent can be stolen by a HEIST." });
    if (c.rolls === 0 && !c.jail) hint("norolls", { title: "Out of rolls", sel: "#energy", text: "One roll refills every 30 minutes. Use +2 hours to jump ahead, or press ROLL to buy an extra roll for 100 $CHOG (half burned)." });
    if (c.jar > 0) hint("hyped-me", { title: "Someone hyped you", sel: ['[data-tab="chog"]'], text: "Another Chog dropped $CHOG in your hype jar. Your claims are boosted for 4 hours, paid from the jar. Leftovers stay in your Chog." });
    if (G.bellEnd !== null) hint("bell", { title: "The Closing Bell", sel: "#bell", text: "The season ends when this timer hits zero. Every Brick buy adds a minute. The last buyer wins 10% of the season pot." });
    if (!c.autoTax && c.taxUntil - G.t < 6 * 60 && brickValue(c) > 0) hint("taxlow", { title: "Property Tax running out", sel: '[data-tab="land"]', text: "Prepay in the Land tab, or your Bricks stop earning until you do." });
    if (G.t > (G.seasonStartT || 0) + 60 && !st.seen.hot) hint("hot", { title: "Hot Street", sel: ".tile.hot", text: "Today's Hot Street pays double rent. The extra comes from the Commons. It moves to a new street every day." });
    renderGoals();
  }

  // ---------- help + glossary ----------
  const GLOSSARY = [
    ["Brick", "A share of one street, held inside a Chog. Bought by your plan where you land. It can never leave the Chog."],
    ["Rent", "Paid by any Chog that lands on a street with Bricks. 90% goes to the Brick holders, 10% to the Commons."],
    ["Appraisal", "Everything inside a Chog: cash, Bricks, unclaimed rent and dapp positions."],
    ["Prestige", "+1% claim weight per day without cashing out, up to 50%. It resets when you cash out and transfers with the NFT."],
    ["Property Tax", "0.5% of Brick value per day. Unpaid Bricks earn nothing until you pay. They're never taken."],
    ["Commons", "The shared treasury. 80% of fees, plus 10% each to the Sleeping Chog Dividend and the season pot."],
    ["Sleeping Chog Dividend", "Every one of the 1,969 Chogs earns a share of the Commons income, even asleep. Waking claims it."],
    ["Nad Lounge", "The corner jackpot. Land on it to win 25% of the pot."],
    ["Patron Stamp", "Earned by doing a dapp quest. +1% claim weight each, forever, on that Chog."],
    ["Heist", "Rob 10% of another Chog's unclaimed rent. Fail and you pay them 500 and go to jail."],
    ["Hype", "Boost another Chog's claims for 4 hours with $CHOG. 10% is burned."],
    ["Cash out", "10 to 20% tax, a 48-hour wait, a city-wide daily cap, and Prestige resets to 0."],
    ["Closing Bell", "The last 24 hours of a season. The last Brick buyer when it hits zero wins 10% of the season pot."],
  ];
  function openHelp() {
    const ov = document.createElement("div"); ov.className = "overlay"; ov.id = "helpov";
    ov.innerHTML = `<div class="wake" style="max-width:720px">
      <div class="row sp"><h1 style="font-size:clamp(22px,4vw,34px)">How to play</h1><button class="btn sm" data-help-close>Close</button></div>
      <ol class="howto">
        <li><b>Roll.</b> Your Chog moves. Your plan buys Bricks where it lands.</li>
        <li><b>Collect.</b> Other Chogs pay rent to your Bricks. Claim it into your Chog.</li>
        <li><b>Quest.</b> On app squares, use the real Monad app for stamps and free rolls.</li>
        <li><b>Grow the NFT.</b> Cash, Bricks, stamps and Prestige all live inside the Chog.</li>
        <li><b>Stay or sell.</b> Cashing out costs 10 to 20% and resets Prestige. Selling the whole Chog keeps everything.</li>
      </ol>
      <div class="row">
        <button class="btn gold" data-help="tour">Replay the tour</button>
        <button class="btn" data-help="reset">Show every hint again</button>
        <button class="btn ghost" data-help="toggle">${st.hints ? "Turn hints off" : "Turn hints on"}</button>
      </div>
      <div class="h">Glossary</div>
      <dl class="gloss">${GLOSSARY.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>
    </div>`;
    document.body.appendChild(ov);
    ov.addEventListener("click", e => {
      const b = e.target.closest("[data-help]");
      if (e.target === ov || e.target.closest("[data-help-close]")) return ov.remove();
      if (!b) return;
      ov.remove();
      if (b.dataset.help === "tour") { st.hints = true; save(); startTour(); }
      if (b.dataset.help === "reset") { st.seen = {}; st.hints = true; save(); toast("Hints reset. You'll see each one again the first time it applies."); renderGoals(); }
      if (b.dataset.help === "toggle") { st.hints = !st.hints; save(); if (!st.hints) { queue.length = 0; cur = null; bub.hidden = true; ring.hidden = true; } renderGoals(); toast(st.hints ? "Hints on." : "Hints off."); }
    });
  }
  document.getElementById("help").addEventListener("click", openHelp);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && cur && !cur._wait) finish(); });

  renderGoals();
  return { on, startTour, openHelp };
})();
