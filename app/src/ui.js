"use strict";
/* ============ The Chog of Wall Street: interface (landing, open an account, Desk, Map, Bank, Rules) ============
   Reads the engine state in G. In Testnet/Mainnet, chain.js fills G from the contracts and routes actions to transactions. */

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const onChain = () => !!window.Chain?.on();
const WIRED = { nadfun: { name: "nad.fun", what: "Buy $CHOG with MON. The $CHOG is held by your Chog." }, fastlane: { name: "FastLane", what: "Stake MON into shMON. The shMON is held by your Chog." }, apriori: { name: "aPriori", what: "Stake MON into aprMON. Held by your Chog." }, kintsu: { name: "Kintsu", what: "Stake MON into sMON. Held by your Chog." }, uniswap: { name: "Uniswap", what: "Swap MON into USDC, straight into your Chog's balance." } };

// ---------- logs, toasts, time ----------
function log(text, cls = "") { G.feed.unshift({ t: G.t, text, cls }); G.feed.length = Math.min(G.feed.length, 80); }
let toastT; function toast(msg) { const t = $("#toast"); t.innerHTML = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3600); }
function clockStr(t) { const d = Math.floor((t - G.seasonStartT) / DAY), m = Math.floor(t % DAY); return `Day ${d + 1} · ${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }
function ago(t) { const m = Math.max(0, Math.round(G.t - t)); if (m < 60) return m <= 1 ? "just now" : `${m} min ago`; if (m < DAY) return `${Math.floor(m / 60)} h ago`; return `${Math.floor(m / DAY)} d ago`; }
function dur(mins) { mins = Math.max(0, Math.floor(mins)); const d = Math.floor(mins / DAY), h = Math.floor(mins % DAY / 60), m = mins % 60; return d ? `${d}d ${h}h` : `${h}h ${String(m).padStart(2, "0")}m`; }
const seasonEnd = () => G.bellEnd ?? (G.seasonStartT + K.seasonLen);

// ---------- views ----------
const U = { view: "landing", room: "desk", angled: false, city: null, pick: null, lb: "season" };
try { U.angled = localStorage.getItem("cows.view") === "3d"; } catch (e) { /* storage blocked */ }

// ---------- light / dark ----------
const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
const isDark = () => document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
function paintThemeBtn() { const b = $("#themeBtn"); b.innerHTML = isDark() ? ICON_SUN : ICON_MOON; b.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode"); }
$("#themeBtn").onclick = () => { const next = isDark() ? "light" : "dark"; document.documentElement.dataset.theme = next; try { localStorage.setItem("cows.theme", next); } catch (e) { /* storage blocked */ } paintThemeBtn(); };
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", paintThemeBtn);
paintThemeBtn();
function go(view) {
  U.view = view;
  $("#landing").hidden = view !== "landing"; $("#onboard").hidden = view !== "onboard"; $("#app").hidden = view !== "app";
  $("#landingLinks").hidden = view === "app"; $("#appLinks").hidden = view !== "app"; $("#tabbar").hidden = view !== "app";
  if (view === "onboard") renderOnboard();
  if (view === "app") room(U.room);
  scrollTo({ top: 0 });
}
function room(name) {
  if (U.room === "desk" && name !== "desk") G.lastSeen = G.t;
  U.room = name;
  document.querySelectorAll("[data-roomview]").forEach(s => s.hidden = s.dataset.roomview !== name);
  document.querySelectorAll("[data-room]").forEach(b => b.setAttribute("aria-current", b.dataset.room === name ? "page" : "false"));
  render(); window.Guide?.on("room", name);
  if (name === "bank" && onChain()) Chain.loadBank().then(render).catch(() => {});
}

// ---------- landing ----------
function renderLanding() {
  $("#appCards").innerHTML = Object.entries(WIRED).map(([k, w]) => `<div class="card appc"><img src="${LOGOS[k]}" alt=""><div><h3>${w.name}</h3><p class="muted small">${w.what}</p><p class="tiny">${SQ.filter(s => s.brand === k).map(s => s.name).join(" · ")}</p></div></div>`).join("");
  const tick = ["CHOG #1462 bought 6 Bricks on Penny Stock Row", "Rent paid on Leverage Pit <b>+$1.54</b>", "Nad Lounge jackpot <b>+$2.31</b>", "Heist foiled on Lender's Court", "Prestige +1% · day 12", "Cash-out tax <b class=dn>-19%</b> paid to the stayers", "Closing Bell: last buyer wins 10% of the pot", "Fees bought back and burned 14,077 $CHOG", "Everyone starts with $20"];
  $("#ticker").innerHTML = [...tick, ...tick].map(t => `<span>${t}</span>`).join("");
  const faq = [
    ["Do I have to wait for my turn?", "No. There are no turns. You get one roll every 30 minutes (store up to 8) and play whenever you like. Everyone shares one city."],
    ["When does the game start and end?", "The city never resets, so your Bricks and Prestige keep their value. Seasons last 7 days. A timer on your Desk counts down; in the last 24 hours the Closing Bell rings and the last Brick buyer wins 10% of the season pot. At the end of a season the richest Chogs share the pot, and the poorest active Chogs pay a small 5% wealth tax on their cash into it."],
    ["What if I go bankrupt?", "If you can't pay rent, your Bricks are sold to cover it. If you run out completely, your Chog sits out until next season, unless you top it up from the Bank."],
    ["What happens while I'm away?", "Your Bricks keep earning rent as long as Property Tax is paid (prepay up to 3 days, or turn on autopay). Rolls pile up to 8. Your Desk shows everything that happened while you were gone, plus messages from other Chogs."],
    ["How much do I need to play?", "$20 of USDC, the same for everyone. You can top up to $20 more each season. Practice City is free and needs no wallet."],
    ["What is $CHOG for?", "The game money is USDC, so prices don't swing. $CHOG is the power-up token: extra rolls, guards and hype are paid in $CHOG and burned, and the game's fees buy $CHOG back and burn it too."],
    ["What if I stop playing?", "Your streets keep earning for 48 hours after your last roll. After that they stop paying you until you roll again. You never lose your Bricks."],
    ["Can someone who plays all day take over?", "Not easily. Everyone starts with the same $20, rolls refill one every 30 minutes, extra rolls cost $CHOG, one Chog can own at most 40% of a street, and Property Tax grows with what you hold."],
    ["Why can't I just withdraw everything?", "You can, but it costs 10 to 20% (paid to the players who stay), waits 48 hours, and resets your Prestige. Bricks can't be withdrawn at all. Selling the whole Chog is usually the better exit."],
    ["Do I need a Chog NFT?", "Not for Practice City. Testnet gives you a free test Chog. Mainnet needs a real Chog Genesis NFT."],
  ];
  $("#faqList").innerHTML = faq.map(([q, a]) => `<details><summary>${q}</summary><p class="muted">${a}</p></details>`).join("");
  // the hero: three columns of Chog cards drifting past, each showing what a Chog owns and how it's doing this season
  const streets = PROPS.filter(x => !x.brand).slice(0, 15), card = (a, k) => { const st = streets[k % streets.length], g = ((a.id * 37) % 900 + 40) * 10, nw = 20000 + ((a.id * 53) % 400) * 120;
    return `<div class="ccard"><i class="cimg" style="background-image:url(${a.img})"></i><div class="cbody"><div class="row between"><b>${esc(a.name.replace(/^CHOG /, ""))}</b><span class="pill purple">${a.tier}</span></div><div class="cstreet"><i style="background:${D[st.d].c}"></i>${st.name}</div><div class="row between"><span class="num">${fmt(nw)}</span><span class="num up">+${fmt(g)}</span></div></div></div>`; };
  $("#heroCards").innerHTML = [0, 1, 2].map(col => { const set = CHOG_ART.filter((_, i) => i % 3 === col).map((a, k) => card(a, k * 3 + col)).join(""); return `<div class="ccol c${col}"><div class="ctrack">${set}${set}</div></div>`; }).join("");
}

// ---------- the board (used by the hero and the Map) ----------
function gridPos(i) { if (i <= 10) return [11, 11 - i]; if (i <= 20) return [11 - (i - 10), 1]; if (i <= 30) return [1, 1 + (i - 20)]; return [1 + (i - 30), 11]; }
const GLYPH = { chance: "?", chest: "◆", tax: "%", heist: "!" };
function tileInner(s, i) {
  const side = i < 10 ? "b" : i < 20 ? "l" : i < 30 ? "t" : "r";
  if (["go", "jail", "lounge", "gojail"].includes(s.t)) return { cls: "corner", html: `<div class="tb"><div class="tn">${s.name}</div><div class="tp">${s.sub}</div></div>` };
  if (s.t === "prop") return { cls: side, html: `<div class="bd" style="background:${D[s.d].c}"><span class="lvl"></span></div><div class="tb">${s.brand ? `<img class="logo" src="${LOGOS[s.brand]}" alt="">` : ""}<div class="tn">${s.name}</div><div class="tp"></div></div>` };
  return { cls: "special " + side, html: `<div class="tb"><div class="gl">${GLYPH[s.t] || ""}</div><div class="tn">${s.name}</div></div>` };
}function buildBoard(box, { preview } = {}) {
  box.innerHTML = `<div class="board">${SQ.map((s, i) => { const [r, c] = gridPos(i); const t = tileInner(s, i); return `<button class="tile ${t.cls}" data-tile="${i}" style="grid-row:${r};grid-column:${c}" aria-label="${esc(s.name)}" ${preview ? 'tabindex="-1"' : ""}>${t.html}</button>`; }).join("")}<div class="boardcenter"><div><b>Chog Street</b><small id="${preview ? "" : "centerNote"}">${preview ? "40 squares · 6 real Monad apps" : ""}</small></div></div></div><div class="pawn" ${preview ? "" : 'id="pawn"'} hidden></div>`;
  if (preview) {
    const p = box.querySelector(".pawn"); const art = CHOG_ART.find(a => a.id === 561) || CHOG_ART[0];
    p.style.backgroundImage = `url(${art.img})`; p.hidden = false;
    let pos = 0; const place = () => placePawn(box, p, pos);
    requestAnimationFrame(place); addEventListener("resize", place);
    if (!reduce) setInterval(() => { if (U.view === "landing") { pos = (pos + 1) % 40; place(); } }, 900);
  }
}
function placePawn(box, pawn, pos) {
  const t = box.querySelector(`[data-tile="${pos}"]`); if (!t) return;
  const b = box.getBoundingClientRect(), r = t.getBoundingClientRect();
  pawn.style.left = (r.left + r.width / 2 - b.left) + "px"; pawn.style.top = (r.top + r.height / 2 - b.top) + "px";
}
function renderTiles(box) {
  const hot = hotIndex();
  PROPS.forEach(p => {
    const el = box.querySelector(`[data-tile="${p.i}"]`); if (!el) return; const l = level(p);
    el.classList.toggle("hot", p.i === hot);
    el.classList.toggle("mine", !!(G.me && myBricks(G.me, p)));
    el.querySelector(".lvl").innerHTML = "<i></i>".repeat(l);
    el.querySelector(".tp").textContent = p.d === "util" ? `dice×${20 * LEVEL_MULT[l]}` : fmt(rentOf(p));
  });
  box.querySelectorAll(".tile.here").forEach(t => t.classList.remove("here"));
  if (G.me) box.querySelector(`[data-tile="${G.me.pos}"]`)?.classList.add("here");
}
function renderPawns() {
  const box = $("#mapBox"); if (!box || !G.me) return; const p = $("#pawn");
  p.hidden = false; p.style.backgroundImage = `url(${G.me.img})`; placePawn(box, p, G.me.pos);
}
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function drawDie(el, v) { if (el) el.innerHTML = Array.from({ length: 9 }, (_, k) => `<b class="${PIPS[v].includes(k) ? "v" : ""}"></b>`).join(""); }
async function showDice(a, b) {
  const d1 = $("#d1"), d2 = $("#d2"); if (!d1) return;
  for (let k = 0; k < 5; k++) { drawDie(d1, 1 + Math.floor(Math.random() * 6)); drawDie(d2, 1 + Math.floor(Math.random() * 6)); await sleep(70); }
  [d1, d2].forEach(d => { d.classList.remove("roll"); void d.offsetWidth; d.classList.add("roll"); });
  drawDie(d1, a); drawDie(d2, b); await sleep(420);
}
function floatAt(i, text, bad) {
  if (reduce || U.room !== "map") return; const t = document.querySelector(`#mapBox [data-tile="${i}"]`); if (!t) return;
  const r = t.getBoundingClientRect(); const f = document.createElement("div"); f.className = "float" + (bad ? " bad" : ""); f.textContent = text;
  f.style.left = r.left + r.width / 2 - 30 + "px"; f.style.top = r.top - 6 + "px"; document.body.appendChild(f); setTimeout(() => f.remove(), 1500);
}

// ---------- open an account ----------
function renderOnboard() {
  if (U.city && U.city !== "practice") return; // chain.js renders Testnet/Mainnet onboarding
  const box = $("#onboard");
  if (!U.city) {
    box.innerHTML = `<div class="stepper"><span class="on">1 · City</span><span>2 · Chog</span><span>3 · Deposit</span></div>
      <h1 style="font-size:clamp(2rem,4.5vw,3.2rem)">Open an account</h1><p class="muted" style="margin:10px 0 24px">Pick a city. Start with Practice if it's your first time.</p>
      <div class="cities">${document.querySelector(".cities").innerHTML}</div>`;
    return;
  }
  if (!G.chogs.length) initWorld();
  const each = G.sleep / SUPPLY; const pick = U.pick ?? G.chogs[0].id; U.pick = pick;
  const c = byId(pick);
  box.innerHTML = `<div class="stepper"><span class="done">1 · Practice City</span><span class="on">2 · Chog</span><span class="on">3 · Deposit</span></div>
    <div class="cols"><div class="stack"><h1 style="font-size:clamp(2rem,4.5vw,3.2rem)">Pick your Chog</h1><p class="muted">Practice uses real Chog Genesis art with play money. 14 other Chogs are already playing.</p>
      <div class="pick">${G.chogs.map(x => `<button data-pickchog="${x.id}" aria-pressed="${x.id === pick}"><span class="im" style="background-image:url(${x.img})"></span><b>${x.full}</b><small>${x.tier}</small></button>`).join("")}</div></div>
    <div class="card stack" style="position:sticky;top:96px"><div class="row"><i class="avatar" style="width:64px;height:64px;background-image:url(${c.img})"></i><div><h3>${c.full}</h3><span class="pill">${c.tier}</span></div></div>
      <dl class="kv"><dt>Opening deposit (same for everyone)</dt><dd>${fmt(K.startDeposit)}</dd><dt>Waiting for this Chog (Sleeping Dividend)</dt><dd>${fmt(each)}</dd><dt>Starting cash</dt><dd>${fmt(K.startDeposit + each)}</dd></dl>
      <button class="btn primary lg" id="openAcct">Open account for ${c.name}</button>
      <p class="tiny">Play money in USDC. You can top up to ${fmt(K.topUpCap)} more each season from your Portfolio.</p></div></div>`;
  $("#openAcct").onclick = () => openPracticeAccount(K.startDeposit);
}
function openPracticeAccount(dep) {
  const pick = byId(U.pick);
  PROPS.forEach(p => { const n = p.h[pick.id]; if (n) { const v = sellValue(p, n); p.supply -= n; p.reserve -= v; G.commons += v; delete p.h[pick.id]; } });
  G.commons += pick.cash + pick.unclaimed + pick.jar;
  const fresh = mkChog(CHOG_ART.find(a => a.id === pick.id), false);
  G.chogs[G.chogs.indexOf(pick)] = fresh; G.me = fresh;
  const div = G.sleep / SUPPLY; G.sleep -= div; G.wallet.usdc -= dep; G.inflow += dep;
  Object.assign(fresh, { cash: dep + div, woke: G.t, lastCash: G.t, lastRoll: G.t, taxUntil: G.t + DAY, immuneUntil: G.t + DAY, seasonAppraisal: 0, plan: "manual", autoTax: true });
  fresh.seasonAppraisal = appraisal(fresh); G.lastSeen = G.t;
  act("welcome", `Account opened. You deposited ${fmt(dep)} and claimed a ${fmt(div)} Sleeping Chog Dividend`, dep + div);
  sendDM(G.chogs.find(x => x.bot), fresh, "gm, new neighbour. The Lending Quarter is where the money is.");
  enterApp();
}
function enterApp() {
  document.body.dataset.mode = G.mode; $("#cityBadge").textContent = { practice: "Practice", testnet: "Testnet", mainnet: "Mainnet" }[G.mode];
  buildBoard($("#mapHost") || document.createElement("div"));
  U.room = "desk"; go("app"); window.Guide?.on("woke");
}

// ---------- render ----------
function render() {
  if (U.view !== "app" || !G.me) return;
  const c = G.me; c.mood = moodOf(c);
  $("#meAvatar").style.backgroundImage = `url(${c.img})`; $("#meWorth").textContent = fmt(c.cash);
  if (!$("#meMenu").hidden) renderMeMenu();
  if (U.room === "desk") renderDesk();
  if (U.room === "map") renderMap();
  if (U.room === "portfolio") renderPortfolio();
  if (U.room === "bank") renderBank();
  if (U.room === "leaders") renderLeaders();
  if (U.room === "rules" && !$("#room-rules").dataset.built) renderRules();
  window.Guide?.on("render");
}
const ICON = { rent: ["+", "plus"], hype: ["★", "plus"], guard: ["✓", "plus"], cashout: ["$", "plus"], welcome: ["+", "plus"], heist: ["!", "minus"], taxlost: ["!", "minus"], dm: ["@", "info"], bell: ["⏱", "info"], season: ["★", "info"], bankrupt: ["!", "minus"], wealthtax: ["%", "minus"] };
function activityHtml(limit = 10) {
  const items = G.activity.slice(0, limit);
  if (!items.length) return `<p class="empty">Nothing yet. Roll a few times, buy Bricks, and this fills up with rent from other Chogs.</p>`;
  return `<div class="feed">${items.map(a => { const [ic, cls] = ICON[a.type] || ["•", "info"]; const isNew = a.t > G.lastSeen; return `<div class="item"><span class="ic ${cls}">${ic}</span><span><span style="${isNew ? "font-weight:600" : ""}">${esc(a.text)}</span><time>${ago(a.t)}${isNew ? " · new" : ""}</time></span><span class="amt ${a.amt > 0 ? "plus" : a.amt < 0 ? "minus" : ""}">${a.amt ? (a.amt > 0 ? "+" : "−") + fmt(Math.abs(a.amt)) : ""}</span></div>`; }).join("")}</div>`;
}
function todos() {
  const c = G.me, out = [];
  if (c.bankrupt === G.seasonNo) out.push(["Bankrupt: top up to play again", "portfolio"]);
  if (c.unclaimed >= 1) out.push([`Claim ${fmt(c.unclaimed)} rent`, "claim"]);
  if (c.queue.some(q => q.ready)) out.push(["Cash-out ready to collect", "portfolio"]);
  if (brickValue(c) > 0 && !c.autoTax && c.taxUntil - G.t < 12 * HOUR) out.push([G.t > c.taxUntil ? "Property Tax unpaid: Bricks earn nothing" : `Property Tax runs out in ${dur(c.taxUntil - G.t)}`, "portfolio"]);
  if (c.jail) out.push(["You're in Rug Jail: roll doubles or pay bail", "map"]);
  const idleLeft = (c.lastRoll || 0) + K.idle - G.t;
  if (idleLeft <= 0) out.push(["Your streets stopped paying: roll to switch rent back on", "map"]);
  else if (idleLeft < 12 * HOUR) out.push([`Roll within ${dur(idleLeft)} to keep earning rent`, "map"]);
  if (c.rolls > 0 && c.bankrupt !== G.seasonNo) out.push([`${c.rolls} roll${c.rolls > 1 ? "s" : ""} ready`, "map"]);
  return out;
}
function threads() {
  const me = G.me.id, by = new Map();
  for (const m of G.inbox) { if (m.from !== me && m.to !== me) continue; const other = m.from === me ? m.to : m.from; by.set(other, m); }
  return [...by.entries()].sort((a, b) => b[1].t - a[1].t);
}
function ranking() { return [...G.chogs].sort((a, b) => appraisal(b) - appraisal(a)); }
// Growth this season: on-chain it's the contract's appraisal minus the value it stored at the Chog's first roll of the season.
function seasonGain(c) { if (c.chainGrowth != null) return c.chainGrowth; return c.seasonAppraisal == null ? 0 : appraisal(c) - c.seasonAppraisal; }
function renderLeaders() {
  const bySeason = U.lb === "season";
  const r = bySeason ? [...G.chogs].sort((a, b) => seasonGain(b) - seasonGain(a)) : ranking();
  const n = r.length, bq = new Set(bottomQuarter()), me = r.indexOf(G.me), left = seasonEnd() - G.t;
  const val = x => bySeason ? seasonGain(x) : appraisal(x);
  const money = v => `<span class="num ${v > 0 ? "up" : v < 0 ? "down" : ""}">${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt(Math.abs(v))}</span>`;
  const plinth = (x, k) => x ? `<div class="plinth p${k + 1}" data-profile="${x.id}" role="button" tabindex="0"><i class="avatar" style="background-image:url(${x.img})"></i><b>${x === G.me ? "You" : esc(x.name)}</b><span class="small">${bySeason ? money(val(x)) : `<span class="num">${fmt(val(x))}</span>`}</span><div class="base">${k + 1}</div></div>` : "<div></div>";
  const row = (x, i) => `<div class="lbrow ${x === G.me ? "me" : ""} ${bq.has(x) ? "inbottom" : ""}" data-profile="${x.id}" role="button" tabindex="0"><span class="num"><b>#${i + 1}</b></span><i class="avatar" style="background-image:url(${x.img})"></i><span class="nm">${x === G.me ? "You" : esc(x.name)}${bq.has(x) ? ' <span class="pill bad" title="Bottom quarter of active Chogs: pays 5% of cash at season end">5%</span>' : ""}</span><span class="num">${fmt(appraisal(x))}</span><span class="chg">${money(seasonGain(x))}</span></div>`;
  const rows = [];
  r.forEach((x, i) => {
    if (i === 0) rows.push(`<div class="lbzone top"><span>Top 10 · share 45% of the prize pool</span><span>${fmt(G.season)} in the pot</span></div>`);
    if (i === 10 && n > 10) rows.push(`<div class="lbzone"><span>Everyone else</span><span>a red 5% marks the bottom quarter of active Chogs</span></div>`);
    rows.push(row(x, i));
  });
  $("#room-leaders").innerHTML = `
  <div class="pagehead"><div><div class="eyebrow">Season ${G.seasonNo} · ends in ${dur(left)}</div><h1>Leaders</h1></div>
    <div class="lbtabs" role="group" aria-label="Rank by"><button data-lb="season" aria-pressed="${bySeason}">This season</button><button data-lb="rich" aria-pressed="${!bySeason}">Richest</button></div></div>
  <p class="muted" style="margin:-8px 0 20px;max-width:64ch">${bySeason ? "Ranked by how much each Chog grew this season. This is the board that pays prizes." : "Ranked by total net worth: cash, Bricks, unclaimed rent and app positions inside the Chog."} You're <b>#${me + 1}</b> of ${n}.</p>
  <div class="cols"><div class="card"><div class="podium">${plinth(r[1], 1)}${plinth(r[0], 0)}${plinth(r[2], 2)}</div>
      <div class="lbrow" style="background:none;font-size:11.5px;font-weight:800;color:var(--ink-3);letter-spacing:.06em;text-transform:uppercase"><span>Rank</span><span></span><span>Chog</span><span>Net worth</span><span class="chg">This season</span></div>
      <div class="lbtable">${rows.join("")}</div></div>
    <div class="stack"><div class="card stack"><h3>How the season pays</h3><dl class="kv"><dt>Closing Bell (last Brick buyer)</dt><dd>10%, first</dd><dt>Top 10 by growth</dt><dd>45%</dd><dt>#1 of the season</dt><dd>+5%</dd><dt>Best defenders (heists stopped)</dt><dd>15%</dd><dt>Every Chog with 20+ rolls</dt><dd>35%</dd></dl>
      <p class="tiny">Before the payout, the bottom quarter of active Chogs (20+ rolls) by net worth pays 5% of its cash into the prize pool. Bricks are never taxed. Details in the Bank's Season office.</p></div>
      <div class="card tint stack"><h3>Your season</h3><dl class="kv"><dt>Rank this season</dt><dd>#${[...G.chogs].sort((a, b) => seasonGain(b) - seasonGain(a)).indexOf(G.me) + 1}</dd><dt>Rank by net worth</dt><dd>#${ranking().indexOf(G.me) + 1}</dd><dt>Growth this season</dt><dd>${money(seasonGain(G.me))}</dd><dt>Rolls this season</dt><dd>${G.me.rollsSeason}</dd></dl></div></div></div>`;
  document.querySelectorAll("[data-lb]").forEach(b => b.onclick = () => { U.lb = b.dataset.lb; renderLeaders(); });
}function renderDesk() {
  const c = G.me, pr = prestige(c), th = threads(), unread = G.inbox.filter(m => m.to === c.id && !m.read).length;
  const left = seasonEnd() - G.t, bell = G.bellEnd !== null, rank = ranking().indexOf(c) + 1, hot = SQ[hotIndex()];
  const idleLeft = (c.lastRoll || 0) + K.idle - G.t, taxLeft = c.taxUntil - G.t, earnLeft = Math.min(idleLeft, taxLeft);
  $("#room-desk").innerHTML = `
  <div class="pagehead"><div><div class="eyebrow">Season ${G.seasonNo} · ${clockStr(G.t)}</div><h1>Your desk, ${esc(c.name)}</h1></div>
    ${G.mode === "practice" ? `<div class="row"><span class="tiny">Practice clock</span><button class="btn sm" id="ff2">+2 hours</button><button class="btn sm" id="ffd">+1 day</button></div>` : ""}</div>
  <div class="cols">
    <div class="card" id="deskChog">
      <div class="deskhero"><i class="avatar" style="background-image:url(${c.img})"></i><div class="stack" style="gap:6px">
        <div class="row" style="gap:6px"><span class="pill purple">${c.tier}</span><span class="pill">${c.mood}</span>${c.jail ? '<span class="pill bad">In Rug Jail</span>' : ""}${c.bankrupt === G.seasonNo ? '<span class="pill bad">Bankrupt</span>' : ""}</div>
        <div class="eyebrow">What this Chog is worth</div><div class="big" id="deskWorth">${fmt(appraisal(c))}</div>
        <div class="tiny">Prestige +${pr}% · ${c.stamps.size} stamps · <button class="linkbtn" data-room="leaders">#${rank} of ${G.chogs.length} in the city</button></div></div></div>
      <div class="stats"><div class="stat"><span>Cash</span><b>${fmt(c.cash)}</b></div><div class="stat"><span>Unclaimed rent</span><b>${fmt(c.unclaimed)}</b></div><div class="stat"><span>Bricks</span><b>${fmt(brickValue(c))}</b></div><div class="stat"><span>This season</span><b class="${seasonGain(c) > 0 ? "up" : seasonGain(c) < 0 ? "down" : ""}">${seasonGain(c) >= 0 ? "+" : "−"}${fmt(Math.abs(seasonGain(c)))}</b></div></div>
    </div>
    <div class="card move stack" id="deskMove">
      <div class="row between"><h3>Your move</h3><span class="tiny">1 roll every 30 min</span></div>
      <div class="pips" aria-label="${c.rolls} rolls ready">${Array.from({ length: K.rollCap + (c.tier !== "Common" ? 1 : 0) }, (_, k) => `<i class="${k < c.rolls ? "on" : ""}"></i>`).join("")}</div>
      <button class="btn gold lg" id="deskRoll" ${c.bankrupt === G.seasonNo ? "disabled" : ""}>${c.rolls ? `Roll now · ${c.rolls} ready` : "Roll · extra roll 100 $CHOG"}</button>
      <div class="row between"><span class="tiny">Your streets earn for</span><span class="timer ${earnLeft < 12 * HOUR ? "warn" : ""}" id="earnTimer">${earnLeft > 0 ? dur(earnLeft) : "stopped"}</span></div>
      <p class="tiny" style="margin-top:-6px">${earnLeft > 0 ? (idleLeft < taxLeft ? "Roll at least once every 48 hours to keep earning." : "Property Tax runs out first. Prepay it in your Portfolio.") : (idleLeft <= 0 ? "You haven't rolled in 48 hours. Roll once to switch rent back on." : "Property Tax is unpaid. Pay it in your Portfolio.")}</p>
      <div class="row between"><span class="tiny">Season ${bell ? "ends (Closing Bell) in" : "ends in"}</span><span class="timer" style="color:${bell ? "var(--gold)" : "inherit"}">${dur(left)}</span></div>
    </div>
  </div>
  <div class="cols" style="margin-top:18px">
    <div class="card"><div class="row between"><h3>While you were away</h3>${G.activity.some(a => a.t > G.lastSeen) ? `<button class="link" id="markRead">Mark as read</button>` : ""}</div>${activityHtml(10)}</div>
    <div class="stack">
      <div class="card" id="deskTodo"><h3>To do</h3><div class="todo">${todos().map(([t, a]) => `<button data-todo="${a}"><span>${t}</span><span aria-hidden="true">→</span></button>`).join("") || `<p class="empty">All clear.</p>`}</div></div>
${onChain() ? "" : `<div class="card" id="deskInbox"><div class="row between"><h3>Messages ${unread ? `<span class="pill purple">${unread} new</span>` : ""}</h3></div>
        ${th.length ? th.slice(0, 5).map(([id, m]) => { const o = byId(id); if (!o) return ""; const un = G.inbox.some(x => x.from === id && x.to === c.id && !x.read); return `<button class="thread" data-thread="${id}"><i class="avatar" style="background-image:url(${o.img})"></i><span style="min-width:0"><span class="t">${esc(o.name)}</span><span class="s" style="display:block">${m.from === c.id ? "You: " : ""}${esc(m.text)}</span></span>${un ? '<i class="unread"></i>' : ""}</button>`; }).join("") : `<p class="empty">No messages yet. Open any street on the Map to message its owners.</p>`}</div>`}
      <div class="card tint" id="deskCity"><h3>City today</h3><div class="citytoday" style="margin-top:8px"><div><div class="tiny">Hot Street (rent ×2)</div><button class="linkbtn" data-tile="${hot.i}"><b>${hot.name}</b></button></div><div><div class="tiny">Nad Lounge pot</div><b class="num">${fmt(G.lounge)}</b></div><div><div class="tiny">Season pot</div><b class="num">${fmt(G.season)}</b></div></div></div>
      <div id="goals"></div>
    </div>
  </div>`;
  const ff2 = $("#ff2"); if (ff2) { ff2.onclick = () => { advance(2 * HOUR); render(); window.Guide?.on("ff"); }; $("#ffd").onclick = () => { advance(DAY); render(); window.Guide?.on("ff"); }; }
  $("#deskRoll").onclick = () => { room("map"); setTimeout(rollMe, 250); };
  const mr = $("#markRead"); if (mr) mr.onclick = () => { G.lastSeen = G.t; render(); };
}function renderMap() {
  const host = $("#room-map");
  if (!host.dataset.built) {
    host.innerHTML = `<div class="grid-map">
      <div class="stage"><div class="stagebar"><div><div class="eyebrow">Chog Street</div><h2 style="font-size:clamp(1.5rem,3vw,2rem)">Map</h2></div>
          <button class="viewswitch" id="viewSwitch" role="switch" aria-checked="${U.angled}" aria-label="3D view"><span data-v="flat">Flat</span><span class="vs"><i></i></span><span data-v="3d">3D</span></button></div>
        <div class="mapbox ${U.angled ? "angled" : ""}" id="mapBox"></div></div>
      <div class="rail">
        <div class="card dock stack" id="rollCard"><div class="dice"><div class="die" id="d1"></div><div class="die" id="d2"></div></div>
          <button class="rollbtn" id="roll">ROLL</button><button class="btn danger" id="bail" hidden>Pay $0.50 bail</button>
          <div class="row between"><span class="tiny">Rolls ready</span><span class="pips" id="mapPips"></span></div>
          <div id="planBox"><div class="tiny" style="margin-bottom:6px">Buying plan</div><div class="seg" id="plans" role="group" aria-label="Buying plan"><button data-plan="safe">Safe</button><button data-plan="balanced">Balanced</button><button data-plan="degen">Degen</button></div><p class="tiny" id="planNote" style="margin-top:6px"></p></div>
          <p class="result" id="lastev"></p></div>
        <div class="card tint stack" id="hereCard"></div></div></div>`;
    buildBoard($("#mapBox")); drawDie($("#d1"), 6); drawDie($("#d2"), 6); host.dataset.built = 1;
    paintSwitch();
    $("#viewSwitch").onclick = () => { U.angled = !U.angled; try { localStorage.setItem("cows.view", U.angled ? "3d" : "flat"); } catch (e) { /* storage blocked */ } $("#mapBox").classList.toggle("angled", U.angled); paintSwitch(); requestAnimationFrame(renderPawns); };
    $("#roll").onclick = rollMe; $("#bail").onclick = payBail;
    $("#plans").onclick = e => { const b = e.target.closest("[data-plan]"); if (!b) return; G.plan = b.dataset.plan; if (G.me) G.me.plan = G.plan; render(); window.Guide?.on("plan", G.plan); };
    addEventListener("resize", () => U.room === "map" && renderPawns());
  }
  const c = G.me, s = SQ[c.pos];
  renderTiles($("#mapBox"));
  if ($("#hudMe")) $("#hudMe").innerHTML = `<i class="avatar" style="background-image:url(${c.img})"></i><div style="min-width:0"><div class="row between"><b>${esc(c.name)}</b><span class="tiny">#${ranking().indexOf(c) + 1} in the city</span></div><div class="row between" style="margin-top:4px"><span class="tiny">Cash</span><b class="num">${fmt(c.cash)}</b></div><div class="row between"><span class="tiny">Worth</span><b class="num">${fmt(appraisal(c))}</b></div></div>`;
  $("#plans").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.plan === G.plan)));
  $("#planNote").textContent = { safe: "Up to 3 Bricks, cheap streets only.", balanced: "Up to 6 Bricks.", degen: "Up to 15 Bricks." }[G.plan];
  $("#mapPips").innerHTML = Array.from({ length: K.rollCap + (c.tier !== "Common" ? 1 : 0) }, (_, k) => `<i class="${k < c.rolls ? "on" : ""}" style="width:9px;height:14px"></i>`).join("");
  $("#roll").textContent = c.jail ? "ROLL FOR DOUBLES" : c.rolls ? "ROLL" : "ROLL · 100";
  $("#roll").disabled = G.busy || c.bankrupt === G.seasonNo; $("#bail").hidden = !c.jail;
  $("#planBox").hidden = !onChain(); // in Practice you buy by hand from the street's card
  const brick = s.t === "prop" ? buyCost(s, 1) * (1 + K.buyFee) : 0;
  $("#hereCard").innerHTML = s.t === "prop" ? `<div class="row between"><div><div class="eyebrow">You are on</div><h3>${s.name}</h3></div><div style="text-align:right"><div class="tiny">1 Brick</div><b class="num" style="font-size:20px">${fmt(brick)}</b></div></div>${onChain() ? "" : `<button class="btn primary" data-tile="${c.pos}" data-buytab>Buy Bricks here</button>`}` : `<div class="eyebrow">You are on</div><h3>${s.name}</h3>`;
  requestAnimationFrame(renderPawns);
}
function paintSwitch() {
  const sw = $("#viewSwitch"); if (!sw) return; sw.setAttribute("aria-checked", String(U.angled));
  sw.querySelector('[data-v="flat"]').className = U.angled ? "" : "on"; sw.querySelector('[data-v="3d"]').className = U.angled ? "on" : "";
}function squareText(s) {
  return { go: "Pass it to collect 1% of your Bricks' value (max $0.50) from the Commons.", chest: "Draw a Commons Chest card: payouts, moves and a get-out-of-jail card.", chance: "Draw a Market News card: payouts, fees, moves.", tax: s.name === "Gas Tax" ? "Pay 5% of your cash (max $1.00) into the Nad Lounge pot." : "Pay $0.75 into the Nad Lounge pot.", jail: "Just visiting, unless you were sent here. To get out: roll doubles (3 tries), pay $0.50, or use a card.", lounge: `Land here to win 25% of the Nad Lounge pot (now ${fmt(G.lounge)}).`, gojail: "Go straight to Rug Jail without passing GENESIS.", heist: "Pick a Chog and try to rob 10% of its unclaimed rent." }[s.t] || "";
}
function holdRow(label, count, value, body, open, cls = "") {
  return `<details class="hold" ${open ? "open" : ""}><summary><span>${label}${count != null ? ` <span class="tiny">${count}</span>` : ""}</span><span class="num ${cls}">${value}</span><svg class="chev" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l5 5 5-5"/></svg></summary><div class="holdbody">${body}</div></details>`;
}
function streetLine(c, p) {
  const n = myBricks(c, p), tag = c.mort?.[p.i] ? '<span class="pill bad">Mortgaged</span>' : c.auc?.[p.i] ? '<span class="pill gold">On auction</span>' : "";
  return `<button class="sline" data-tile="${p.i}"><i style="background:${D[p.d].c}"></i><span><b>${p.name}</b> ${tag}<span class="tiny" style="display:block">${n} Bricks · ${Math.round(n / p.supply * 100)}% of the street · ${LEVEL_NAME[level(p)]}</span></span><span class="num">${fmt(sellValue(p, n) * (1 - K.sellSpread))}</span></button>`;
}
function renderPortfolio() {
  const c = G.me, tr = exitTax(c), capLeft = dailyCapLeft(), maxOut = Math.floor(Math.min(c.cash, capLeft)), pr = prestige(c), dbt = debt(c);
  const amt = Math.min(+(U.coAmt ?? maxOut), maxOut), tax = amt * tr / 100, paid = G.t <= c.taxUntil;
  const mine = PROPS.filter(p => myBricks(c, p)).sort((a, b) => sellValue(b, myBricks(c, b)) - sellValue(a, myBricks(c, a)));
  const g = seasonGain(c), pos = Object.entries(c.pos_ || {});
  $("#room-portfolio").innerHTML = `
  <div class="pagehead"><div><div class="eyebrow">Inside ${esc(c.full || c.name)}</div><h1>Portfolio</h1></div></div>
  <div class="cols">
    <div class="stack">
      <div class="card balcard" id="bankSheet"><div class="tiny">Account balance · USDC</div><div class="big">${fmt(c.cash)}</div>
        <div class="row" style="gap:16px;margin-top:6px"><span class="small muted">Net worth <b class="num" style="color:var(--ink)">${fmt(appraisal(c))}</b></span><span class="small muted">This season <b class="num ${g > 0 ? "up" : g < 0 ? "down" : ""}">${g >= 0 ? "+" : "−"}${fmt(Math.abs(g))}</b></span></div>
        <div class="row" style="margin-top:14px"><button class="btn primary" id="claimBtn" ${c.unclaimed < 1 ? "disabled" : ""}>Claim ${fmt(c.unclaimed)} rent</button><button class="btn" id="topup" ${topUpRoom(c) <= 0 ? "disabled" : ""}>Top up ${fmt(Math.min(5000, topUpRoom(c)))}</button></div></div>
      <div class="card"><h3>What you own</h3><div class="holds">
        ${holdRow("Streets", mine.length, fmt(brickValue(c)), mine.length ? mine.map(p => streetLine(c, p)).join("") : `<p class="empty">No Bricks yet. Roll on the Map and your plan buys them.</p>`, true)}
        ${holdRow("Unclaimed rent", null, fmt(c.unclaimed), `<p class="small muted">Rent other Chogs paid to your Bricks. Claim it into your balance. Until you do, a HEIST can steal 10% of it.</p>`)}
        ${onChain() ? `<div class="holdchain">${Chain.positionsHtml()}</div>` : holdRow("App positions", pos.length, fmt(positionsValue(c)), pos.length ? pos.map(([k, v]) => `<div class="row between small"><span>${esc(k)}</span><span class="num">${fmt(v)}</span></div>`).join("") : `<p class="empty">None yet. App squares on the Map put real positions inside your Chog.</p>`)}
        ${dbt ? holdRow("Mortgages", Object.keys(c.mort).length, "−" + fmt(dbt), Object.entries(c.mort).map(([i, v]) => `<div class="row between small"><span>${SQ[i].name}</span><span class="num down">−${fmt(v)}</span></div>`).join("") + `<button class="btn sm" data-room="bank">Repay in the Bank</button>`, false, "down") : ""}
        <div class="holdtotal"><span>Net worth</span><b class="num">${fmt(appraisal(c))}</b></div></div></div>
    </div>
    <div class="stack">
      <div class="card stack" id="bankTax"><div class="row between"><h3>Property Tax</h3><span class="pill ${paid ? "ok" : "bad"}">${paid ? `Paid ${dur(c.taxUntil - G.t)} ahead` : "Unpaid"}</span></div>
        <p class="small muted">0.5% of your Bricks' value a day (${fmt(brickValue(c) * K.propTaxDay)} today). Unpaid streets earn nothing until you pay.</p>
        <div class="row"><button class="btn sm" data-tax="1">Prepay 1 day</button><button class="btn sm" data-tax="3">Prepay 3 days</button>${onChain() ? "" : `<label class="row small" for="autoTax"><input type="checkbox" id="autoTax" ${c.autoTax ? "checked" : ""}> Autopay</label>`}</div></div>
      <div class="card stack" id="bankGuards"><div class="row between"><h3>Guards</h3><span class="num">${c.guards} / 4</span></div><p class="small muted">Each guard cuts heist odds against you by 5%. Paid in $CHOG, which is burned.</p><div><button class="btn sm" id="guard" ${c.guards >= 4 ? "disabled" : ""}>Hire a guard · ${K.guardChog} $CHOG</button></div></div>
      <div class="card stack" id="bankOut"><h3>Cash out</h3>
        ${dbt ? `<p class="small muted">Pay off your mortgages in the Bank before cashing out.</p>` : `<label class="small" for="coAmt">Amount <b class="num" id="coV">${fmt(amt)}</b> <span class="tiny">(max today ${fmt(maxOut)})</span></label>
        <input type="range" id="coAmt" min="0" max="${maxOut}" step="10" value="${Math.floor(amt)}">
        <dl class="kv"><dt>Exit tax (${tr}%)</dt><dd id="coT">−${fmt(tax)}</dd><dt>Prestige</dt><dd class="down">+${pr}% → 0%</dd><dt>Arrives in</dt><dd>48 hours</dd><dt>You receive</dt><dd id="coN">${fmt(amt - tax)}</dd></dl>
        <div><button class="btn danger" id="coGo" ${amt < 100 ? "disabled" : ""}>Request cash-out</button></div>
        <p class="tiny">Selling the whole Chog usually beats this: a buyer gets everything inside, worth ${fmt(appraisal(c))}.</p>`}</div>
      ${c.queue.length ? `<div class="card stack"><h3>Cash-out queue</h3>${c.queue.map(q => `<div class="row between"><span class="num">${fmt(q.net)}</span><span class="tiny">${q.ready ? "ready" : "ready in " + dur(q.at - G.t)}</span></div>`).join("")}${c.queue.some(q => q.ready) ? `<div><button class="btn gold" id="coClaim">Collect to wallet</button></div>` : ""}</div>` : ""}
      <div class="card stack"><h3>${onChain() ? "Your wallet" : "Practice wallet"}</h3>${onChain() ? Chain.walletHtml() : `<dl class="kv"><dt>USDC</dt><dd>${fmt(G.wallet.usdc)}</dd><dt>$CHOG (power-ups)</dt><dd>${fmtN(G.wallet.chog)}</dd><dt>MON (app squares)</dt><dd>${(+G.wallet.mon).toFixed(1)}</dd></dl><p class="tiny">Top-ups left this season: ${fmt(topUpRoom(c))}.</p>`}</div>
    </div>
  </div>`;
  $("#claimBtn").onclick = doClaim; $("#topup").onclick = doTopUp; $("#guard").onclick = doGuard;
  document.querySelectorAll("[data-tax]").forEach(b => b.onclick = () => doTax(+b.dataset.tax));
  const at = $("#autoTax"); if (at) at.onchange = e => { c.autoTax = e.target.checked; render(); window.Guide?.on("tax"); };
  const sl = $("#coAmt");
  if (sl) { sl.oninput = () => { window.Guide?.on("cashslide"); U.coAmt = +sl.value; const t = U.coAmt * tr / 100; $("#coV").textContent = fmt(U.coAmt); $("#coT").textContent = "−" + fmt(t); $("#coN").textContent = fmt(U.coAmt - t); $("#coGo").disabled = U.coAmt < 100; }; $("#coGo").onclick = () => doCashOut(+sl.value); }
  const cc = $("#coClaim"); if (cc) cc.onclick = doCollect;
}
function practiceLedger() {
  const held = G.chogs.reduce((a, c) => a + c.cash + c.unclaimed + c.jar + positionsValue(c) + c.queue.reduce((x, q) => x + q.net, 0), 0) + PROPS.reduce((a, p) => a + p.reserve, 0) + G.commons + G.lounge + G.season + G.sleep + G.buyback + G.escrow;
  const owed = G.inflow - G.outflow - G.burned, ok = Math.abs(held - owed) < 1;
  return `<dl class="kv"><dt>Everything held in the city</dt><dd>${fmt(held)}</dd><dt>Paid in − paid out − buybacks</dt><dd>${fmt(owed)}</dd><dt>Zero-sum check</dt><dd>${ok ? '<span class="pill ok">balanced</span>' : '<span class="pill bad">mismatch</span>'}</dd></dl>`;
}
// ---------- the Bank: Chog Street's financial district ----------
// The Bank belongs to the city. Its desks: the Treasury (reserves, buyback, backing), Loans (mortgages), the Auction house,
// the Season office (prize pool, wealth tax, payouts) and Savings (USDC in the Morpho vault, outside the game).
const BANK_DESKS = [["treasury", "Treasury"], ["loans", "Loans"], ["auctions", "Auctions"], ["season", "Season office"], ["savings", "Savings"]];
function renderBank() {
  const tab = U.bankTab || "treasury";
  $("#room-bank").innerHTML = `
  <div class="pagehead"><div><div class="eyebrow">Chog Street's financial district</div><h1>Bank of Chog Street</h1></div></div>
  <p class="muted" style="margin:-8px 0 16px;max-width:64ch">The Bank belongs to the city, not to any player. Borrow against your streets, trade Bricks at auction, collect season prizes and park dollars in a real Monad lending market.</p>
  <div class="banktabs" role="tablist" aria-label="Bank desks">${BANK_DESKS.map(([k, n]) => `<button role="tab" data-banktab="${k}" aria-selected="${k === tab}">${n}</button>`).join("")}</div>
  <div class="bankdesk">${({ treasury: deskTreasury, loans: deskLoans, auctions: deskAuctions, season: deskSeason, savings: deskSavings })[tab]()}</div>`;
  const on = $("#room-bank .banktabs [aria-selected=true]"); if (on) on.parentElement.scrollLeft = on.offsetLeft - 8;
}
function deskTreasury() {
  const chain = onChain();
  return `<div class="treasury"><div class="stat"><span>Commons (reserves)</span><b>${fmt(G.commons)}</b></div><div class="stat"><span>Season pot</span><b>${fmt(G.season)}</b></div><div class="stat"><span>Nad Lounge pot</span><b>${fmt(G.lounge)}</b></div><div class="stat"><span>Held in auction escrow</span><b>${fmt(G.escrow || 0)}</b></div><div class="stat"><span>Buyback pot</span><b>${fmt(G.buyback)}</b></div><div class="stat"><span>Spent buying $CHOG</span><b>${fmt(G.burned)}</b></div><div class="stat"><span>$CHOG burned</span><b>${fmtN(G.chogBurned)}</b></div><div class="stat"><span>Can lend right now</span><b>${fmt(loanRoom())}</b></div></div>
  <div class="cols" style="margin-top:18px">
    <div class="stack">
      <div class="card stack"><h3>$CHOG buyback</h3><p class="small muted">A slice of every fee (1% of Brick buys, half of bail, a quarter of the cash-out tax) lands in the buyback pot. The pot buys $CHOG on nad.fun and burns it, so every game played is steady buy pressure for $CHOG.</p>
        ${chain ? (G.buyback > 0 ? `<div class="row"><button class="btn gold sm" data-buyback>Buy back and burn ${fmt(G.buyback)} of $CHOG</button><span class="tiny">Anyone can run this.</span></div>` : `<p class="tiny">The pot is empty right now. Anyone can run the buyback once it fills.</p>`) : `<p class="tiny">In Practice the pot buys back $CHOG automatically every few minutes.</p>`}</div>
      <div class="card stack"><h3>Back the Bank</h3><p class="small muted">Add dollars to the Commons. Nothing comes back to you: it funds loans, claim bonuses and the cards that pay out. Good for a city you want to keep lively.</p>
        <div class="row"><label class="tiny" for="fundAmt">USDC</label><input id="fundAmt" class="qamt" type="number" min="0.01" step="0.01" value="1"><button class="btn sm" data-fund>Add to the Commons</button><span class="tiny">From your wallet (${fmt(G.wallet?.usdc || 0)}).</span></div></div>
    </div>
    <div class="card tint stack"><h3>Zero-sum check</h3><p class="tiny">Nothing is minted. Every dollar the Bank holds came from a player.</p>${chain ? Chain.ledgerHtml() : practiceLedger()}</div>
  </div>`;
}
function deskLoans() {
  const c = G.me, mine = PROPS.filter(p => myBricks(c, p)), dbt = debt(c), room_ = loanRoom();
  return `<div class="cols"><div class="card stack" id="mortDesk"><div class="row between"><h3>Mortgage desk</h3>${dbt ? `<span class="pill bad">You owe ${fmt(dbt)}</span>` : ""}</div>
      ${mine.length ? `<div class="mortlist">${mine.map(p => { const m = c.mort[p.i]; const offer = Math.min(loanOffer(c, p), room_); return `<div class="mortrow"><i style="background:${D[p.d].c}"></i><span><b>${p.name}</b><span class="tiny" style="display:block">${m ? `Loan ${fmt(m)} · repay ${fmt(m * (1 + MORT_FEE))}` : c.auc[p.i] ? "On auction" : `${myBricks(c, p)} Bricks · worth ${fmt(sellValue(p, myBricks(c, p)) * (1 - K.sellSpread))}`}</span></span>${m ? `<button class="btn sm" data-repay="${p.i}">Repay ${fmt(m * (1 + MORT_FEE))}</button>` : `<button class="btn sm primary" data-mort="${p.i}" ${c.auc[p.i] || offer < 1 ? "disabled" : ""}>Borrow ${fmt(offer)}</button>`}</div>`; }).join("")}</div>` : `<p class="empty">You need a street first. Roll on the Map and your plan buys Bricks.</p>`}</div>
    <div class="card tint stack"><h3>How a mortgage works</h3><dl class="kv words"><dt>You get</dt><dd>half the street's value</dd><dt>While it's mortgaged</dt><dd>its rent goes to the Bank</dd><dt>Also blocked</dt><dd>selling, auctions, cash-outs</dd><dt>To lift it</dt><dd>repay the loan + 10%</dd><dt>Biggest single loan now</dt><dd>${fmt(room_)}</dd></dl>
      <p class="tiny">One loan can take at most half of the Commons, so the Bank never lends itself dry. The 10% fee goes back to the city: the Commons, the Sleeping Chog Dividend and the season pot.</p></div></div>`;
}
function deskAuctions() {
  const c = G.me, live = [...G.auctions].sort((a, b) => a.ends - b.ends);
  const row = a => {
    const p = SQ[a.i], s = byId(a.seller), mine = a.seller === c.id, lead = a.bidder === c.id, done = G.t >= a.ends;
    const who = s ? (mine ? "You" : esc(s.name)) : `#${a.seller}`, nb = Math.ceil(minBid(a));
    const btn = done ? (onChain() ? `<button class="btn sm" data-aucsettle="${a.i}">Settle</button>` : `<span class="pill">closing</span>`)
      : mine ? `<span class="pill gold">Yours</span>` : lead ? `<span class="pill ok">You lead</span>`
      : `<button class="btn sm primary" data-aucbid="${a.i}" ${c.cash < nb || capFor(c, p, a.n) < a.n ? "disabled" : ""}>Bid ${fmt(nb)}</button>`;
    return `<div class="mortrow"><i style="background:${D[p.d].c}"></i><span><b>${a.n} Brick${a.n > 1 ? "s" : ""} · ${p.name}</b><span class="tiny" style="display:block">${who} · ${a.bid ? `top bid ${fmt(a.bid)}${a.bidder && byId(a.bidder) ? ` by ${a.bidder === c.id ? "you" : esc(byId(a.bidder).name)}` : ""}` : `reserve ${fmt(a.reserve)}`} · ${done ? "ended" : `ends in ${dur(a.ends - G.t)}`}</span></span>${btn}</div>`;
  };
  return `<div class="cols"><div class="card stack"><div class="row between"><h3>Auction house</h3><span class="tiny">${live.length} live</span></div>
      ${live.length ? `<div class="mortlist">${live.map(row).join("")}</div>` : `<p class="empty">No auctions right now. Put Bricks up from any street's card (the Auction tab).</p>`}</div>
    <div class="card tint stack"><h3>House rules</h3><dl class="kv words"><dt>Length</dt><dd>2 hours, one auction per street</dd><dt>Lowest bid</dt><dd>the bank price</dd><dt>Each new bid</dt><dd>at least 1% higher</dd><dt>Late bids</dt><dd>a bid in the last 10 min adds 10 min</dd></dl>
      <p class="tiny">Bids come out of your Chog's cash and wait in escrow. If someone outbids you, your money comes straight back. The 40% street cap still applies to the winner. Your cash: ${fmt(c.cash)}.</p></div></div>`;
}
function bottomQuarter() {
  const active = G.chogs.filter(x => x.rollsSeason >= 20);
  return [...active].sort((a, b) => appraisal(a) - appraisal(b)).slice(0, Math.min(50, Math.floor(active.length / 4)));
}
function deskSeason() {
  const c = G.me, left = seasonEnd() - G.t, byG = [...G.chogs].sort((a, b) => seasonGain(b) - seasonGain(a)), rank = byG.indexOf(c) + 1;
  const bq = bottomQuarter(), inBottom = bq.includes(c), act_ = c.rollsSeason >= 20;
  const split = `<dl class="kv words"><dt>Closing Bell (last Brick buyer)</dt><dd>10% of the pot, first</dd><dt>Top 10 by growth (10 shares down to 1)</dt><dd>45%</dd><dt>#1 by growth, on top</dt><dd>5%</dd><dt>Top 3 defenders (heists stopped)</dt><dd>15%</dd><dt>Every Chog with 20+ rolls</dt><dd>35%</dd></dl>`;
  return `<div class="cols"><div class="stack">
      <div class="card stack"><div class="row between"><h3>Season ${G.seasonNo}</h3><span class="pill ${G.bellEnd !== null ? "gold" : ""}">${G.bellEnd !== null ? "Closing Bell" : "ends in " + dur(left)}</span></div>
        <div class="treasury"><div class="stat"><span>Season pot</span><b>${fmt(G.season)}</b></div><div class="stat"><span>Your growth rank</span><b>#${rank}</b></div><div class="stat"><span>Rolls toward 20</span><b>${Math.min(20, c.rollsSeason)}/20</b></div><div class="stat"><span>Heists stopped</span><b>${c.warden}</b></div></div>
        <p class="small ${inBottom ? "down" : "muted"}">${act_ ? (inBottom ? "You're in the bottom quarter of active Chogs right now. If the season ended now you'd pay 5% of your cash into the prize pool." : "You're active and outside the bottom quarter. You'll share the 35% split.") : `Roll ${20 - c.rollsSeason} more time${20 - c.rollsSeason === 1 ? "" : "s"} this season to qualify for the 35% split. Under 20 rolls you can't win it, and you can't be taxed either.`}</p>
        ${onChain() ? Chain.seasonHtml() : ""}</div>
      ${onChain() ? Chain.pastSeasonHtml() : pastSeasonsHtml()}</div>
    <div class="card tint stack"><h3>How the season pays</h3>${split}<p class="tiny">When the season ends, the bottom quarter of active Chogs by net worth (at most 50) pays 5% of its cash into the prize pool. Bricks are never taxed. A share nobody qualifies for rolls into next season.</p></div></div>`;
}
function pastSeasonsHtml() {
  if (!G.seasons.length) return `<div class="card stack"><h3>Past seasons</h3><p class="empty">No season has ended yet. Seasons last 7 days; the last 24 hours are the Closing Bell.</p></div>`;
  return `<div class="card stack"><h3>Past seasons</h3><div class="mortlist">${G.seasons.map(r => { const g = byId(r.golden), mine = r.paid[G.me.id] || 0; return `<div class="mortrow"><i style="background:var(--gold)"></i><span><b>Season ${r.no} · Golden Chog ${g ? esc(g.name) : "#" + r.golden}</b><span class="tiny" style="display:block">Pot ${fmt(r.pot)} · wealth tax ${fmt(r.tax)} from ${r.taxed.length} Chogs · ${r.active} active${r.rolled > 1 ? ` · ${fmt(r.rolled)} rolled over` : ""}</span></span><span class="num ${mine ? "up" : ""}">${mine ? "+" + fmt(mine) : "—"}</span></div>`; }).join("")}</div><p class="tiny">In Practice prizes are paid straight into your cash. On-chain you claim them here.</p></div>`;
}
function deskSavings() {
  if (onChain()) return Chain.savingsHtml();
  const c = G.me, v = saved(c), pr = c.save?.principal || 0;
  return savingsCard({ value: v, principal: pr, wallet: G.wallet.usdc, apy: `${(G.vault.apy * 100).toFixed(1)}% a year`, venue: "Morpho · Hyperithm USDC Apex", note: "In Practice the vault pays a steady rate on play money. On mainnet this is the real Morpho vault on Monad and the rate moves with the market." });
}
function savingsCard(o) {
  return `<div class="cols"><div class="card stack"><div class="row between"><h3>Savings desk</h3><span class="pill purple">${o.venue}</span></div>
      <div class="treasury"><div class="stat"><span>Saved</span><b>${fmt(o.value)}</b></div><div class="stat"><span>Interest earned</span><b class="${o.value - o.principal > 0.5 ? "up" : ""}">${fmt(Math.max(0, o.value - o.principal))}</b></div><div class="stat"><span>Rate</span><b style="font-size:15px">${o.apy}</b></div><div class="stat"><span>USDC in wallet</span><b>${fmt(o.wallet)}</b></div></div>
      <div class="row"><label class="tiny" for="saveAmt">USDC</label><input id="saveAmt" class="qamt" type="number" min="0.01" step="0.01" value="${Math.max(0, Math.min(10, o.wallet / 1000)).toFixed(2)}"><button class="btn primary sm" data-save>Save</button>${o.value >= 1 ? `<button class="btn sm" data-unsave>Withdraw everything</button>` : ""}</div></div>
    <div class="card tint stack"><h3>Not game money</h3><p class="small muted">Savings never enter the game. Your dollars go from your wallet into a USDC lending vault on Monad and earn what borrowers there pay. Other players never pay for it, so the city stays zero-sum.</p>
      <dl class="kv words"><dt>Held for</dt><dd>your Chog (it travels with the NFT)</dd><dt>Who can withdraw</dt><dd>whoever holds the Chog</dd><dt>Lock</dt><dd>none</dd></dl><p class="tiny">${o.note}</p></div></div>`;
}
function renderRules() {
  const host = $("#room-rules"); host.dataset.built = 1;
  const rows = SQ.map((s, i) => `<tr><td class="num">${i}</td><td>${s.name}</td><td>${s.t === "prop" ? (s.brand ? `${D[s.d].n} · <b>${WIRED[s.brand].name}</b>` : D[s.d].n) : "Special"}</td><td>${s.t === "prop" ? (s.q ? s.q[2] : `Rent ${s.d === "util" ? "dice × 20 × level" : fmt(s.base) + " × level"}`) : squareText(s)}</td></tr>`).join("");
  host.innerHTML = `<div class="pagehead"><div><div class="eyebrow">Docs</div><h1>Rules</h1></div><div class="row"><button class="btn primary sm" data-help="tour">Replay the tour</button><button class="btn sm" data-help="reset">Show tips again</button></div></div>
  <div class="docs"><nav><a href="#r-quick">Quick start</a><a href="#r-bricks">Bricks and rent</a><a href="#r-value">Your Chog's value</a><a href="#r-time">Seasons and the timer</a><a href="#r-away">Away and always-on</a><a href="#r-cards">Cards, jail, heists</a><a href="#r-money">USDC and $CHOG</a><a href="#r-bank">The Bank</a><a href="#r-out">Cashing out</a><a href="#r-board">Every square</a><a href="#r-glossary">Glossary</a></nav>
  <div>
  <section id="r-quick"><h2>Quick start</h2><ol><li>Open an account: deposit $20 of USDC into your Chog. Everyone starts with the same $20.</li><li>On the Map, press ROLL. Your Chog moves and your buying plan buys Bricks where it lands.</li><li>Other Chogs land on your streets and pay you rent. Claim it in your Portfolio.</li><li>Keep Property Tax paid so your Bricks keep earning. Check your Desk for what happened while you were away.</li></ol></section>
  <section id="r-bricks"><h2>Bricks and rent</h2><p>A Brick is a share of one street. Every Brick bought raises the next price. Rent grows with how much money sits in the street: empty lot ×1, cottage ×2, shop ×4, tower ×7, skyscraper ×11, neon landmark ×16. 90% of each rent goes to the Brick holders, 10% to the Commons. One Chog can hold at most 40% of a street. The two Launch District streets are reserved for Chogs worth less than $50.</p></section>
  <section id="r-value"><h2>Your Chog's value</h2><p>Cash, Bricks, unclaimed rent and dapp positions all live inside the NFT. Bricks can't be withdrawn or sent to another Chog. Sell the Chog and the buyer gets everything. Prestige grows 1% a day while you don't cash out (up to 50%) and boosts your rent claims.</p></section>
  <section id="r-time"><h2>Seasons and the timer</h2><p>The city never resets. Seasons last 7 days and the countdown is on your Desk. In the last 24 hours the Closing Bell rings: every Brick buy adds a minute, and the last buyer when it hits zero wins 10% of the season pot. The rest becomes the prize pool. First the bottom quarter of active Chogs (20+ rolls) by net worth pays 5% of its cash into it. Then it is shared: 45% to the 10 Chogs that grew most this season (10 shares for #1 down to 1 for #10), 5% more to #1, 15% to the best defenders, and 35% split across every Chog with 20+ rolls. A share nobody qualifies for rolls into next season. If your Chog runs out completely (no cash, no rent to claim, no free Bricks), it can't roll until you top it up.</p></section>
  <section id="r-away"><h2>Away and always-on players</h2><p><b>Away:</b> rolls pile up to 8, Property Tax can be prepaid for 3 days (or autopaid), and your Desk shows what happened. Your streets keep earning for 48 hours after your last roll. After that they stop paying you until you roll again (the rent goes to the Commons). You never lose your Bricks. <b>Always-on:</b> rolls refill only every 30 minutes, extra rolls cost 100 $CHOG, one Chog can't own more than 40% of a street, and Property Tax grows with your holdings.</p></section>
  <section id="r-money"><h2>USDC and $CHOG</h2><p>The game money is USDC, so a dollar stays a dollar. Everyone opens with the same $20 and can top up to $20 more per season (USDC bought on the Uniswap square counts too). $CHOG is the power-up token: extra rolls (100), guards (500) and hype are paid in $CHOG and burned. Part of every fee goes into the Bank's buyback pot, which buys $CHOG on nad.fun and burns it.</p></section>
  <section id="r-cards"><h2>Cards, jail, heists</h2><p>Market News (3 squares) and Commons Chest (2 squares) draw a card: a payout from the Commons, a fee into the Nad Lounge, a move, or a free roll. Got Rugged sends you to Rug Jail: roll doubles, pay $0.50, or use a card. On HEIST you can try to rob 10% of another Chog's unclaimed rent. Fail and you pay them $0.50 and go to jail.</p></section>
  <section id="r-bank"><h2>The Bank</h2><p>The Bank belongs to the city, not to any player. Every dollar in it came from players. It has five desks:</p><ul><li><b>Treasury:</b> the Commons (the city's reserves), the pots, and the $CHOG buyback. Anyone can add to the reserves.</li><li><b>Loans:</b> borrow half of a street's value. Until you pay back the loan plus 10%, that street's rent goes to the Bank, its Bricks can't be sold or auctioned, and you can't cash out. One loan can take at most half of the Commons.</li><li><b>Auctions:</b> offer Bricks on a street for 2 hours, one auction per street. Bids start at the bank price, each new bid is at least 1% higher, and a bid in the last 10 minutes adds 10 minutes. Bids wait in escrow; outbid money comes straight back.</li><li><b>Season office:</b> the prize board, the wealth tax and the payouts. On-chain you claim your prize here.</li><li><b>Savings:</b> park USDC from your wallet in the Morpho USDC vault on Monad. It earns what borrowers there pay, sits outside the game, and belongs to your Chog.</li></ul><p>Buy, Sell, Mortgage and Auction are also on every street's card. You can only buy where your Chog is standing.</p></section><section id="r-out"><h2>Cashing out</h2><p>Cash-outs are taxed 20%, down to 10% after loyal weeks. They wait 48 hours, are capped city-wide at 2% of all game cash per day, and reset Prestige to zero. After a Chog is sold, the new owner can't cash out for 72 hours.</p></section>
  <section id="r-board"><h2>Every square</h2><div class="tablewrap"><table><thead><tr><th>#</th><th>Square</th><th>District</th><th>What it does</th></tr></thead><tbody>${rows}</tbody></table></div></section>
  <section id="r-glossary"><h2>Glossary</h2><p><b>Appraisal:</b> everything inside a Chog. <b>Commons:</b> the shared treasury, funded by fees and taxes. <b>Nad Lounge:</b> the jackpot corner. <b>Sleeping Chog Dividend:</b> every Chog, even asleep, collects a share of Commons income; waking claims it. <b>Patron Stamp:</b> earned by using a real Monad app on its square, +1% claim weight forever.</p></section>
  </div></div>`;
}

// ---------- modals ----------
function modal(html) { $("#modal").innerHTML = `<button class="x" data-close aria-label="Close">×</button>` + html; $("#scrim").hidden = false; }
function closeSheet() { $("#scrim").hidden = true; $("#modal").innerHTML = ""; }
function openCard(title, text) { modal(`<div class="plainhead"><div class="eyebrow">${esc(title)}</div><h3 style="font-size:24px;margin-top:6px">${esc(text)}</h3></div><div class="body"><button class="btn primary" data-close>OK</button></div>`); window.Guide?.on("card"); }
function openTile(i, landed) {
  const s = SQ[i], c = G.me;
  if (U.deed?.i !== i) { U.deedTab = null; U.qty = null; }
  U.deed = { i, landed };
  if (s.t !== "prop") { modal(`<div class="plainhead"><div class="sqglyph">${GLYPH[s.t] || "★"}</div><h3 style="font-size:24px;margin-top:8px">${s.name}</h3></div><div class="body"><p class="muted">${squareText(s)}</p><button class="btn primary" data-close>OK</button></div>`); return window.Guide?.on("tile", { i, landed }); }
  const p = s, n = myBricks(c, p), l = level(p), here = c.pos === i, owners = Object.entries(p.h).sort((a, b) => b[1] - a[1]);
  const today = c.qday[i] === Math.floor(G.t / DAY), done = c.stamps.has(i), chainQuest = onChain() ? Chain.questHtml(p, here) : null;
  const tab = U.deedTab || (here ? "buy" : n ? "sell" : "buy");
  const rentNow = p.d === "util" ? `dice × ${20 * LEVEL_MULT[l]}` : fmt(rentOf(p));
  modal(`<div class="deedhead" style="background:${D[p.d].c}">${p.brand ? `<img src="${LOGOS[p.brand]}" alt="">` : ""}<div class="eyebrow">${D[p.d].n}</div><h3>${p.name}</h3>${p.i === hotIndex() ? `<span class="pill gold" style="margin-top:8px">Hot Street today · rent ×2</span>` : ""}</div>
  <div class="body">
    <div class="deedstats"><div><span>Rent now</span><b>${rentNow}</b></div><div><span>Level</span><b>${LEVEL_NAME[l]}</b></div><div><span>You own</span><b>${n ? Math.round(n / p.supply * 100) + "%" : "—"}</b></div></div>
    <div class="seg deedtabs" role="tablist">${["buy", "sell", "mortgage", "auction"].map(t => `<button data-deedtab="${t}" aria-pressed="${t === tab}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>
    <div class="deedpanel">${deedPanel(tab, p, n, here)}</div>
    ${owners.length ? `<div><div class="tiny" style="margin-bottom:6px">Owners</div><div class="ownerrow">${owners.slice(0, 7).map(([id, k]) => { const o = byId(+id); return o ? `<button class="ownerchip ${o === c ? "me" : ""}" data-profile="${o.id}"><i class="avatar" style="background-image:url(${o.img})"></i><span>${Math.round(k / p.supply * 100)}%</span></button>` : ""; }).join("")}</div></div>` : `<p class="tiny">Nobody owns this street yet.</p>`}
    ${p.q ? (chainQuest ?? `<div class="questbox"><div class="row between"><span class="small">${p.q[2]}</span></div>${here ? `<div><button class="btn sm primary" data-quest="${i}" ${today && done ? "disabled" : ""}>${p.q[1] === "stake" ? "Stake" : "Swap"} 20 MON · practice</button></div>` : `<span class="tiny">Land here to use ${p.dapp}. First time: a Patron Stamp.</span>`}</div>`) : ""}
    <details class="more"><summary>Rent by level</summary><table class="renttable">${LEVEL_NAME.map((nm, k) => `<tr class="${k === l ? "cur" : ""}"><td>${nm}</td><td>${p.d === "util" ? "dice × " + 20 * LEVEL_MULT[k] : fmt(p.base * LEVEL_MULT[k])}</td></tr>`).join("")}</table></details>
  </div>`);
  window.Guide?.on("tile", { i, landed });
}
function deedPanel(tab, p, n, here) {
  const c = G.me, q = v => Math.max(1, Math.min(v, U.qty ?? 1));
  const stepper = (max, label) => `<div class="stepper2"><button data-qty="-1" aria-label="Fewer">−</button><span class="num">${q(max)}</span><button data-qty="1" aria-label="More">+</button><span class="tiny">${label}</span></div>`;
  if (tab === "buy") {
    if (onChain()) return `<p class="small muted">On-chain, your buying plan buys Bricks when you land here.</p>`;
    if (!here) return `<p class="small muted">Land here to buy.</p>`;
    if (p.fair && appraisal(c) >= K.fairStartMax) return `<p class="small muted">Fair Start street: only Chogs worth under ${fmt(K.fairStartMax)} can buy here.</p>`;
    if (locked(c, p)) return `<p class="small muted">Lift the mortgage or auction on this street before buying more.</p>`;
    const max = maxBuyable(c, p, 15, c.cash); if (!max) return `<p class="small muted">Not enough cash, or you're at the 40% cap for this street.</p>`;
    const k = q(max), cost = buyCost(p, k) * (1 + K.buyFee);
    return `${stepper(max, `of ${max} you can buy`)}<button class="btn primary" data-buy="${p.i}">Buy ${k} Brick${k > 1 ? "s" : ""} · ${fmt(cost)}</button>`;
  }
  if (!n) return `<p class="small muted">You don't own Bricks on ${p.name}.</p>`;
  if (tab === "sell") {
    if (locked(c, p)) return `<p class="small muted">${c.mort?.[p.i] ? "Mortgaged. Repay it in the Bank to sell." : "On auction until the bidding ends."}</p>`;
    if (onChain()) return `<button class="btn" data-sell="${p.i}">Sell 1 Brick to the Bank · ${fmt(sellValue(p, 1) * (1 - K.sellSpread))}</button>`;
    const k = q(n); return `${stepper(n, `of ${n} you own`)}<button class="btn" data-sell="${p.i}">Sell ${k} to the Bank · ${fmt(sellValue(p, k) * (1 - K.sellSpread))}</button>`;
  }
  if (tab === "mortgage") {
    const m = c.mort?.[p.i];
    if (m) return `<p class="small muted">Loan ${fmt(m)}. Rent from this street goes to the Bank until you repay.</p><button class="btn" data-repay="${p.i}">Repay ${fmt(m * (1 + MORT_FEE))}</button>`;
    if (c.auc?.[p.i]) return `<p class="small muted">On auction until the bidding ends.</p>`;
    const offer = Math.min(loanOffer(c, p), loanRoom());
    return `<p class="small muted">Get ${fmt(offer)} now. This street's rent goes to the Bank until you repay ${fmt(offer * (1 + MORT_FEE))}.</p><button class="btn primary" data-mort="${p.i}" ${offer < 1 ? "disabled" : ""}>Mortgage · +${fmt(offer)}</button>`;
  }
  const live = G.auctions.find(a => a.seller === c.id && a.i === p.i);
  if (live) return `<p class="small muted">${live.n} Brick${live.n > 1 ? "s" : ""} on auction. Ends in ${dur(live.ends - G.t)}. Reserve ${fmt(live.reserve)}.</p>`;
  if (locked(c, p)) return `<p class="small muted">Mortgaged. Repay it in the Bank first.</p>`;
  if (auctionOn(p.i)) return `<p class="small muted">Someone else is auctioning Bricks on ${p.name}. One auction per street: try again when it ends.</p><button class="btn sm" data-room="bank" data-banktab-go="auctions">See it in the Auction house</button>`;
  const k = q(n), reserve = sellValue(p, k) * (1 - K.sellSpread);
  return `${stepper(n, `of ${n} you own`)}<p class="tiny">Other Chogs bid for 2 hours. The best bid at or above ${fmt(reserve)} (the bank price) wins. Until then the Bricks keep earning for you.</p><button class="btn gold" data-auction="${p.i}">Auction ${k} Brick${k > 1 ? "s" : ""}</button>`;
}
function openProfile(id) {
  const o = byId(id); if (!o) return;
  const me = o === G.me, g = seasonGain(o), rank = ranking().indexOf(o) + 1, streets = PROPS.filter(p => myBricks(o, p)).sort((a, b) => sellValue(b, myBricks(o, b)) - sellValue(a, myBricks(o, a)));
  modal(`<div class="profhead"><i class="avatar" style="background-image:url(${o.img})"></i><div style="min-width:0"><div class="row" style="gap:6px"><span class="pill purple">${o.tier}</span><span class="pill">${moodOf(o)}</span></div><h3>${me ? "You · " : ""}${esc(o.full || o.name)}</h3><div class="tiny">${esc(traitLine(o))}</div></div></div>
  <div class="body">
    <div class="deedstats four"><div><span>Net worth</span><b>${fmt(appraisal(o))}</b></div><div><span>This season</span><b class="${g > 0 ? "up" : g < 0 ? "down" : ""}">${g >= 0 ? "+" : "−"}${fmt(Math.abs(g))}</b></div><div><span>Rank</span><b>#${rank}</b></div><div><span>Streets</span><b>${streets.length}</b></div></div>
    <dl class="kv"><dt>Prestige</dt><dd>+${prestige(o)}%</dd><dt>Patron stamps</dt><dd>${o.stamps.size}</dd><dt>Guards</dt><dd>${o.guards}</dd><dt>Rolls this season</dt><dd>${o.rollsSeason}</dd></dl>
    ${streets.length ? `<div><div class="tiny" style="margin-bottom:6px">Biggest streets</div>${streets.slice(0, 3).map(p => streetLine(o, p)).join("")}</div>` : ""}
    ${me ? `<button class="btn primary" data-room="portfolio">Open your portfolio</button>` : `<div class="row">${onChain() ? "" : `<button class="btn primary" data-dm="${o.id}">Message</button>`}<button class="btn gold" data-hype="${o.id}">Hype · 300</button></div>`}
  </div>`);
}
// ---------- balance chip dropdown ----------
function renderMeMenu() {
  const c = G.me, dbt = debt(c);
  $("#meMenu").innerHTML = `<div class="row" style="gap:10px;margin-bottom:10px"><i class="avatar" style="width:40px;height:40px;background-image:url(${c.img})"></i><div><b>${esc(c.name)}</b><div class="tiny">#${ranking().indexOf(c) + 1} in the city</div></div></div>
    <dl class="kv"><dt>Account balance</dt><dd>${fmt(c.cash)}</dd><dt>Unclaimed rent</dt><dd>${fmt(c.unclaimed)}</dd><dt>Bricks</dt><dd>${fmt(brickValue(c))}</dd><dt>App positions</dt><dd>${fmt(positionsValue(c))}</dd>${dbt ? `<dt>Mortgages</dt><dd class="down">−${fmt(dbt)}</dd>` : ""}<dt><b>Net worth</b></dt><dd><b>${fmt(appraisal(c))}</b></dd></dl>
    <div class="row" style="margin-top:12px"><button class="btn sm primary" data-room="portfolio">Portfolio</button><button class="btn sm" data-profile="${c.id}">Your profile</button></div>`;
}
function toggleMeMenu(show) {
  const m = $("#meMenu"), open = show ?? m.hidden; if (open && !G.me) return;
  if (open) renderMeMenu(); m.hidden = !open; $("#meChip").setAttribute("aria-expanded", String(open));
}function openHeist() {
  const me = G.me, opts = G.chogs.filter(t => t !== me && t.unclaimed >= K.heistMinUnclaimed && G.t >= t.immuneUntil).sort((a, b) => b.unclaimed - a.unclaimed).slice(0, 6);
  modal(`<div class="deedhead" style="background:var(--red)"><div class="eyebrow">Heist</div><h3>Pick a target</h3></div><div class="body"><p class="small muted">Win: take 10% of their unclaimed rent. Lose: pay them $0.50 and go to Rug Jail. Cash and Bricks are never at risk.</p>
    ${opts.length ? opts.map(t => { const ch = clamp(K.heistBase + (isLaser(me) ? 5 : 0) + (isHeistHat(me) ? 5 : 0) - TIER_DEF[t.tier] - t.guards * 5 - (isVisor(t) ? 5 : 0), 10, 80); return `<button class="thread" data-heist="${t.id}"><i class="avatar" style="background-image:url(${t.img})"></i><span><span class="t">${esc(t.name)}</span><span class="s" style="display:block">${fmt(t.unclaimed)} unclaimed · ${t.guards} guards</span></span><span class="pill ${ch >= 50 ? "ok" : "warn"}">${ch}%</span></button>`; }).join("") : `<p class="empty">Nobody has $0.50+ unclaimed rent right now.</p>`}
    <button class="btn ghost" data-close>Walk away</button></div>`);
  window.Guide?.on("heistOpen");
}
function openThread(id) {
  if (onChain()) return Chain.dm(id);
  const o = byId(id), me = G.me; if (!o) return;
  G.inbox.forEach(m => { if (m.from === id && m.to === me.id) m.read = true; });
  const msgs = G.inbox.filter(m => (m.from === id && m.to === me.id) || (m.from === me.id && m.to === id));
  modal(`<div class="plainhead row"><i class="avatar" style="width:44px;height:44px;border-radius:50%;background-image:url(${o.img})"></i><div><h3>${esc(o.full || o.name)}</h3><span class="tiny">Messages go Chog to Chog</span></div></div>
  <div class="body"><div class="msgs" id="msgs">${msgs.map(m => `<div class="msg ${m.from === me.id ? "mine" : ""}">${esc(m.text)}<time>${ago(m.t)}</time></div>`).join("") || `<p class="empty">Say hi. Offer a deal on a street you both own.</p>`}</div>
  <textarea id="dmText" maxlength="280" placeholder="Write a message"></textarea><div class="row between"><span class="tiny">280 characters</span><button class="btn primary" id="dmSend">Send</button></div></div>`);
  const box = $("#msgs"); box.scrollTop = box.scrollHeight;
  $("#dmSend").onclick = () => { const t = $("#dmText").value.trim(); if (!t) return; if (onChain() && Chain.dm) return Chain.dm(id, t); sendDM(me, o, t); openThread(id); render(); window.Guide?.on("dm"); };
  render();
}

// ---------- practice actions (on-chain mode routes to Chain) ----------
async function rollMe() {
  if (onChain()) return Chain.roll();
  const c = G.me; if (!c || G.busy) return;
  if (c.bankrupt === G.seasonNo) { toast("Bankrupt: top up in your Portfolio to play again, or wait for next season."); return room("portfolio"); }
  closeSheet();
  if (c.rolls <= 0) { if (G.wallet.chog < K.extraRollChog) return toast(`No rolls left. An extra roll costs ${K.extraRollChog} $CHOG.`); G.wallet.chog -= K.extraRollChog; G.chogBurned += K.extraRollChog; c.rolls++; }
  G.busy = true; c.rolls--; c.rollsSeason++; c.lastRoll = G.t; c.plan = onChain() ? G.plan : "manual"; c.broke = false; render();
  const d1 = 1 + ri(6), d2 = 1 + ri(6);
  await showDice(d1, d2);
  if (c.jail > 0) {
    if (d1 === d2 || c.jailCard) { c.jail = 0; if (c.jailCard && d1 !== d2) c.jailCard = false; log("You walked out of Rug Jail.", "me"); }
    else { c.jail--; $("#lastev").textContent = c.jail ? `No doubles. ${c.jail} tries left in Rug Jail.` : "No doubles. Next roll you're free."; G.busy = false; render(); return window.Guide?.on("rolled", { jail: true }); }
  }
  c.doubles = d1 === d2 ? (c.doubles || 0) + 1 : 0;
  if (c.doubles === 3) { toJail(c); $("#lastev").textContent = "Three doubles in a row. Straight to Rug Jail."; G.busy = false; render(); return window.Guide?.on("rolled", { jail: true }); }
  for (let k = 0; k < d1 + d2; k++) { step(c, 1); renderPawns(); await sleep(120); }
  const r = land(c, d1 + d2);
  if (c.broke && c.cash <= 0 && freeBrickValue(c) <= 0) { c.bankrupt = G.seasonNo; act("bankrupt", "You couldn't pay rent and went bankrupt. Top up in your Portfolio to play again, or wait for next season"); }
  let msg = `Rolled ${d1} + ${d2}: ${SQ[c.pos].name}.`;
  if (r.rent) msg += ` Paid ${fmt(r.rent)} rent.`;
  if (r.bought) { msg += ` Your plan bought ${r.bought} Bricks.`; floatAt(c.pos, `+${r.bought} Bricks`); }
  if (c.doubles) { c.rolls++; msg += " Doubles: free roll."; }
  $("#lastev").textContent = msg; log(msg, "me");
  G.busy = false; render();
  window.Guide?.on("rolled", { r, pos: c.pos, sq: SQ[c.pos], jail: c.jail > 0 });
  if (r.card) openCard(r.deck, r.card); else if (SQ[c.pos].t === "prop") openTile(c.pos, true); else if (r.heist) openHeist(); else if (r.note) toast(esc(r.note.replace(c.name + " ", "You ")));
}
function doClaim() { if (onChain()) return Chain.claim(); const g = claim(G.me); toast(`+${fmt(g)} claimed into your Chog.`); render(); window.Guide?.on("claimed"); }
function doTopUp() { if (onChain()) return Chain.topUp(5000); const a = Math.min(5000, topUpRoom(G.me)); if (a <= 0) return toast(`You've topped up the ${fmt(K.topUpCap)} limit for this season.`); if (G.wallet.usdc < a) return toast("Practice wallet is empty."); G.wallet.usdc -= a; addTopUp(G.me, a); G.me.broke = false; if (G.me.bankrupt) { G.me.bankrupt = 0; toast("Topped up. You're back in the game."); } render(); }
function doTax(days) { if (onChain()) return Chain.tax(days); const r = prepayTax(G.me, days); if (r === -1) toast("Not enough cash in your Chog."); else { render(); window.Guide?.on("tax"); } }
function doGuard() { if (onChain()) return Chain.guard(); const c = G.me; if (G.wallet.chog < K.guardChog) return toast(`A guard costs ${K.guardChog} $CHOG.`); G.wallet.chog -= K.guardChog; G.chogBurned += K.guardChog; c.guards++; render(); }
function payBail() { if (onChain()) return Chain.bail(); const c = G.me; if (!c.jail) return; if (c.cash < K.bail) return toast("Not enough cash for bail."); payTo(c, K.bail / 2, "burn"); payTo(c, K.bail / 2, "lounge"); c.jail = 0; render(); }
function doCashOut(amt) {
  if (onChain()) return Chain.cashOut(amt);
  if (debt(G.me)) return toast("Pay off your mortgages in the Bank before cashing out.");
  const c = G.me; amt = Math.min(amt, c.cash, dailyCapLeft()); if (amt < 100) return toast("Nothing to cash out within today's city-wide cap.");
  const r = exitTax(c) / 100, tax = amt * r;
  c.cash -= amt; G.commons += tax * 0.5; burn(tax * 0.25); G.season += tax * 0.25; G.cashedToday += amt; c.lastCash = G.t;
  c.queue.push({ amt, net: amt - tax, at: G.t + K.queue, ready: false }); U.coAmt = 0;
  toast(`Cash-out queued. ${fmt(amt - tax)} arrives in 48 hours. Prestige reset to 0.`); render(); window.Guide?.on("cashout");
}
function doCollect() { if (onChain()) return Chain.claimCashOut(); const c = G.me; let tot = 0; c.queue = c.queue.filter(q => { if (q.ready) { tot += q.net; return false; } return true; }); G.wallet.usdc += tot; G.outflow += tot; toast(`${fmt(tot)} sent to your wallet.`); render(); }
function doQuest(i) {
  if (onChain()) return Chain.quest(i);
  const c = G.me, s = SQ[i], kind = s.q[1], day = Math.floor(G.t / DAY);
  if (G.wallet.mon < 20) return toast("Your practice wallet is out of MON.");
  const val = 20 * K.monUsd * (0.97 + rnd() * 0.04); // 20 MON in game units
  if (kind === "usdc") { if (val > topUpRoom(c)) return toast("That would pass this season's top-up limit."); G.wallet.mon -= 20; addTopUp(c, val); toast(`Swapped 20 MON → ${fmt(val)} of USDC on Uniswap, into your Chog's balance.`); }
  else { G.wallet.mon -= 20; c.pos_[s.dapp] = (c.pos_[s.dapp] || 0) + val; G.inflow += val; toast(kind === "chog" ? `Bought ${fmtN(val * K.chogPerUnit)} $CHOG on nad.fun. It's held by your Chog.` : `${s.dapp}: staked 20 MON. The position is held by your Chog.`); }
  const first = !c.stamps.has(i); c.stamps.add(i); (c.stampAt = c.stampAt || {})[i] = c.stampAt?.[i] ?? G.t;
  if (c.qday[i] !== day) { c.qday[i] = day; c.rolls++; }
  if (first) toast(`New Patron Stamp: ${s.dapp}. +1% claim weight and +1 free roll.`);
  openTile(i, true); render(); window.Guide?.on("quest", { i, first });
}

// ---------- events ----------
document.addEventListener("click", e => {
  const t = e.target;
  if (t === $("#scrim") || t.closest("[data-close]")) { closeSheet(); window.Guide?.on("sheetClosed"); return; }
  const g = t.closest("[data-go]"); if (g) { if (g.dataset.go === "rules") { if (G.me) { go("app"); room("rules"); } else { U.city = "practice"; startPractice(true); } return; } if (g.dataset.go === "landing" && G.me) return room("desk"); return go(g.dataset.go); }
  const cityB = t.closest("[data-city]"); if (cityB) return chooseCity(cityB.dataset.city);
  const pc = t.closest("[data-pickchog]"); if (pc) { U.pick = +pc.dataset.pickchog; return renderOnboard(); }
  if (t.closest("#meChip")) return toggleMeMenu();
  if (!t.closest("#meMenu")) toggleMeMenu(false);
  if (t.closest("[data-buyback]")) return Chain.buyback();
  const pf = t.closest("[data-profile]"); if (pf) return openProfile(+pf.dataset.profile);
  const r = t.closest("[data-room]"); if (r) { if (r.dataset.banktabGo) U.bankTab = r.dataset.banktabGo; closeSheet(); toggleMeMenu(false); return room(r.dataset.room); }
  const dt = t.closest("[data-deedtab]"); if (dt) { U.deedTab = dt.dataset.deedtab; U.qty = null; return openTile(U.deed.i, U.deed.landed); }
  const qb = t.closest("[data-qty]"); if (qb) { const cur = +$(".stepper2 .num").textContent; U.qty = Math.max(1, cur + +qb.dataset.qty); return openTile(U.deed.i, U.deed.landed); }
  const bb = t.closest("[data-buy]"); if (bb) { const p = SQ[+bb.dataset.buy], k = +$(".stepper2 .num").textContent, n = Math.min(k, maxBuyable(G.me, p, 15, G.me.cash)); if (n > 0) { buyBricks(G.me, p, n); toast(`Bought ${n} Brick${n > 1 ? "s" : ""} on ${p.name}.`); } U.qty = null; openTile(p.i, U.deed.landed); return render(); }
  const bt = t.closest("[data-banktab]"); if (bt) { U.bankTab = bt.dataset.banktab; return renderBank(); }
  if (t.closest("[data-fund]")) { const x = Math.round(+($("#fundAmt")?.value || 0) * 1000); if (!(x > 0)) return toast("Enter an amount."); if (onChain()) return Chain.fundBank(x); if (x > G.wallet.usdc) return toast("Not that much USDC in your wallet."); G.wallet.usdc -= x; G.commons += x; G.inflow += x; act("fund", `You added ${fmt(x)} to the Bank's reserves`, -x); toast(`Thanks. ${fmt(x)} added to the Commons.`); return render(); }
  const abid = t.closest("[data-aucbid]"); if (abid) { const a = auctionOn(+abid.dataset.aucbid); if (!a) return; const amt = Math.ceil(minBid(a)); if (onChain()) return Chain.bid(a.i, amt); toast(bidAuction(G.me, a, amt) ? `You bid ${fmt(amt)}. It's held in escrow until you win or get outbid.` : "That bid isn't possible right now."); return render(); }
  const ast = t.closest("[data-aucsettle]"); if (ast) return Chain.settleAuction(+ast.dataset.aucsettle);
  if (t.closest("[data-save]")) { const x = Math.round(+($("#saveAmt")?.value || 0) * 1000); if (!(x > 0)) return toast("Enter an amount."); if (onChain()) return Chain.save(x); const got = saveDeposit(G.me, x); toast(got ? `${fmt(got)} is now in savings, earning interest.` : "Not enough USDC in your wallet."); return render(); }
  if (t.closest("[data-unsave]")) { if (onChain()) return Chain.unsave(); const got = saveWithdraw(G.me); toast(`${fmt(got)} is back in your wallet.`); return render(); }
  const sact = t.closest("[data-season]"); if (sact) return Chain.seasonAct(sact.dataset.season);
  const mb = t.closest("[data-mort]"); if (mb) { if (onChain()) return Chain.mortgage(+mb.dataset.mort); const got = mortgage(G.me, SQ[+mb.dataset.mort]); toast(got ? `The Bank lent you ${fmt(got)}.` : "The Bank can't lend on that right now."); if (!$("#scrim").hidden) openTile(+mb.dataset.mort, U.deed?.landed); return render(); }
  const rb = t.closest("[data-repay]"); if (rb) { if (onChain()) return Chain.repay(+rb.dataset.repay); const r2 = repayMortgage(G.me, SQ[+rb.dataset.repay]); toast(r2 === -1 ? "Not enough cash to repay." : `Mortgage repaid (${fmt(r2)}).`); if (!$("#scrim").hidden) openTile(+rb.dataset.repay, U.deed?.landed); return render(); }
  const ab = t.closest("[data-auction]"); if (ab) { if (onChain()) return Chain.startAuction(+ab.dataset.auction, +$(".stepper2 .num").textContent); const p = SQ[+ab.dataset.auction], k = +$(".stepper2 .num").textContent, a = startAuction(G.me, p, k); toast(a ? `${a.n} Brick${a.n > 1 ? "s" : ""} on auction for 2 hours. Reserve ${fmt(a.reserve)}.` : "Can't auction those Bricks right now."); if (a) act("auction", `You put ${a.n} Brick${a.n > 1 ? "s" : ""} on ${p.name} up for auction`); openTile(p.i, U.deed.landed); return render(); }
  const tl = t.closest("[data-tile]"); if (tl && !tl.closest("#heroMap")) { if (tl.dataset.buytab !== undefined) { U.deedTab = "buy"; U.qty = null; return openTile(+tl.dataset.tile, true); } return openTile(+tl.dataset.tile, false); }
  const q = t.closest("[data-quest]"); if (q) return doQuest(+q.dataset.quest);
  const sl = t.closest("[data-sell]"); if (sl) { if (onChain()) return Chain.sell(+sl.dataset.sell); const p = SQ[+sl.dataset.sell], k = +($(".stepper2 .num")?.textContent || 1), got = sellBricks(G.me, p, k); if (got) toast(`Sold ${k} Brick${k > 1 ? "s" : ""} for ${fmt(got)}.`); U.qty = null; openTile(p.i, U.deed?.landed); return render(); }
  const h = t.closest("[data-heist]"); if (h) { if (onChain()) return Chain.heist(+h.dataset.heist); const res = heist(G.me, byId(+h.dataset.heist)); closeSheet(); toast(res.win ? `Heist worked: +${fmt(res.amt)}.` : `Caught. You paid ${fmt(res.amt)} and went to Rug Jail.`); return render(); }
  const dm = t.closest("[data-dm],[data-thread]"); if (dm) return openThread(+(dm.dataset.dm || dm.dataset.thread));
  const hy = t.closest("[data-hype]"); if (hy) { if (onChain()) return Chain.hype(+hy.dataset.hype, 300); if (hype(G.me, byId(+hy.dataset.hype), K.hypeChog)) { toast(`Hyped with ${K.hypeChog} $CHOG: ${K.hypeChog / 10} burned, ${K.hypeChog * 0.9} tipped to their owner.`); render(); window.Guide?.on("hyped"); } else toast(`Hype costs ${K.hypeChog} $CHOG.`); return; }
  const td = t.closest("[data-todo]"); if (td) { const a = td.dataset.todo; if (a === "claim") return doClaim(); return room(a); }
});
document.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (!$("#scrim").hidden) closeSheet(); toggleMeMenu(false); });
function chooseCity(city) {
  if (city === "mainnet") return toast("Mainnet City opens after testing. Try Practice or Testnet.");
  U.city = city; G.mode = city;
  if (city === "practice") return startPractice();
  go("onboard"); Chain.enter(city);
}
function startPractice(toRules) {
  U.city = "practice"; G.mode = "practice";
  if (!G.chogs.length) initWorld();
  if (toRules && !G.me) { U.pick = G.chogs[0].id; openPracticeAccount(20000); return room("rules"); }
  go("onboard");
}
function initWorld() {
  G.chogs = CHOG_ART.map(a => mkChog(a, true));
  G.sleep = SUPPLY * 2400; G.inflow = G.commons + G.lounge + G.sleep;
  G.chogs.forEach(c => { c.cash = K.startDeposit; G.inflow += K.startDeposit; c.woke = -2 * DAY; c.lastRoll = -2 * DAY; c.lastCash = -2 * DAY - ri(5) * DAY; c.taxUntil = DAY; c.guards = ri(3); });
  G.t = 0; G.seasonStartT = 0; advance(2 * DAY);
  G.chogs.forEach(c => c.seasonAppraisal = appraisal(c));
}
// live practice city: 1 real second = 10 game minutes; only re-render rooms that change on their own
setInterval(() => {
  if (G.mode !== "practice" || !G.me || G.busy || U.view !== "app") return;
  advance(10);
  if (!$("#scrim").hidden || document.activeElement?.matches("input,textarea")) return;
  // full re-render only when something you can see changed; otherwise just tick the clocks (keeps clicks and hovers steady)
  const c = G.me, sig = [U.room, c.rolls, Math.round(c.cash), Math.round(c.unclaimed), c.pos, c.jail, G.activity.length, G.inbox.length, G.seasonNo, G.bellEnd !== null, Math.round(appraisal(c) / 50)].join("|");
  if (sig !== U.sig) { U.sig = sig; if (["desk", "map", "leaders", "bank"].includes(U.room)) render(); return; }
  document.querySelectorAll("#room-desk .timer").forEach(t => t.textContent = dur(seasonEnd() - G.t));
  const eb = $("#room-desk .pagehead .eyebrow"); if (eb) eb.textContent = eb.textContent.replace(/Day \d+ · \d\d:\d\d/, clockStr(G.t));
}, 1000);

renderLanding();
