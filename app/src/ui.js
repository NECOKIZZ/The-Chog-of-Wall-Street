"use strict";
/* ============ The Chog of Wall Street: interface (landing, open an account, Desk, Map, Bank, Rules) ============
   Reads the engine state in G. In Testnet/Mainnet, chain.js fills G from the contracts and routes actions to transactions. */

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const onChain = () => !!window.Chain?.on();
const WIRED = { nadfun: { name: "nad.fun", what: "Buy $CHOG with MON, straight into your Chog's cash." }, fastlane: { name: "FastLane", what: "Stake MON into shMON. The shMON is held by your Chog." }, apriori: { name: "aPriori", what: "Stake MON into aprMON. Held by your Chog." }, kintsu: { name: "Kintsu", what: "Stake MON into sMON. Held by your Chog." }, uniswap: { name: "Uniswap", what: "Swap MON into USDC on Uniswap v3. Held by your Chog." } };

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
}

// ---------- landing ----------
function renderLanding() {
  $("#appCards").innerHTML = Object.entries(WIRED).map(([k, w]) => `<div class="card appc"><img src="${LOGOS[k]}" alt=""><div><h3>${w.name}</h3><p class="muted small">${w.what}</p><p class="tiny">${SQ.filter(s => s.brand === k).map(s => s.name).join(" · ")}</p></div></div>`).join("");
  const tick = ["CHOG #1462 bought 6 Bricks on Penny Stock Row", "Rent paid on Leverage Pit <b>+1,540</b>", "Nad Lounge jackpot <b>+2,310</b>", "Heist foiled on Lender's Court", "Prestige +1% · day 12", "Cash-out tax <b class=dn>-19%</b> paid to the stayers", "Closing Bell: last buyer wins 10% of the pot", "1 MON → 14.9 $CHOG on nad.fun"];
  $("#ticker").innerHTML = [...tick, ...tick].map(t => `<span>${t}</span>`).join("");
  const faq = [
    ["Do I have to wait for my turn?", "No. There are no turns. You get one roll every 30 minutes (store up to 8) and play whenever you like. Everyone shares one city."],
    ["When does the game start and end?", "The city never resets, so your Bricks and Prestige keep their value. Seasons last 7 days. A timer on your Desk counts down; in the last 24 hours the Closing Bell rings and the last Brick buyer wins 10% of the season pot. At the end of a season the richest Chogs share the pot, and the poorest active Chogs pay a small 5% wealth tax on their cash into it."],
    ["What if I go bankrupt?", "If you can't pay rent, your Bricks are sold to cover it. If you run out completely, your Chog sits out until next season, unless you top it up from the Bank."],
    ["What happens while I'm away?", "Your Bricks keep earning rent as long as Property Tax is paid (prepay up to 3 days, or turn on autopay). Rolls pile up to 8. Your Desk shows everything that happened while you were gone, plus messages from other Chogs."],
    ["Can someone who plays all day take over?", "Not easily. Rolls refill one every 30 minutes, extra rolls cost $CHOG and are capped per day, one Chog can own at most 40% of a street, and Property Tax grows with what you hold."],
    ["Why can't I just withdraw everything?", "You can, but it costs 10 to 20% (paid to the players who stay), waits 48 hours, and resets your Prestige. Bricks can't be withdrawn at all. Selling the whole Chog is usually the better exit."],
    ["Do I need a Chog NFT?", "Not for Practice City. Testnet gives you a free test Chog. Mainnet needs a real Chog Genesis NFT."],
  ];
  $("#faqList").innerHTML = faq.map(([q, a]) => `<details><summary>${q}</summary><p class="muted">${a}</p></details>`).join("");
  buildBoard($("#heroMap"), { preview: true });
}

// ---------- the board (used by the hero and the Map) ----------
function gridPos(i) { if (i <= 10) return [11, 11 - i]; if (i <= 20) return [11 - (i - 10), 1]; if (i <= 30) return [1, 1 + (i - 20)]; return [1 + (i - 30), 11]; }
function tileInner(s, i) {
  const side = i > 10 && i < 20 ? "l" : i > 30 ? "r" : "";
  if (["go", "jail", "lounge", "gojail"].includes(s.t)) return { cls: "corner", html: `<div class="tb"><div class="tn">${s.name}</div><div class="tp">${s.sub}</div></div>` };
  if (s.t === "prop") return { cls: side, html: `<div class="bd" style="background:${D[s.d].c}"></div><div class="tb">${s.brand ? `<img class="logo" src="${LOGOS[s.brand]}" alt="">` : ""}<div class="tn">${s.name}</div><div class="lvl"></div><div class="tp"></div></div>` };
  return { cls: "special " + side, html: `<div class="tb"><div class="tn">${s.name}</div>${s.sub ? `<div class="tp">${s.sub}</div>` : ""}</div>` };
}
function buildBoard(box, { preview } = {}) {
  box.innerHTML = `<div class="board">${SQ.map((s, i) => { const [r, c] = gridPos(i); const t = tileInner(s, i); return `<button class="tile ${t.cls}" data-tile="${i}" style="grid-row:${r};grid-column:${c}" aria-label="${esc(s.name)}" ${preview ? 'tabindex="-1"' : ""}>${t.html}</button>`; }).join("")}<div class="boardcenter"><div><b>Monad City</b><small id="${preview ? "" : "centerNote"}">${preview ? "40 squares · 6 real Monad apps" : ""}</small></div></div></div><div class="pawn" ${preview ? "" : 'id="pawn"'} hidden></div>`;
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
    el.querySelector(".lvl").innerHTML = Array.from({ length: 5 }, (_, k) => `<i class="${k < l ? "on" : ""}"></i>`).join("");
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
      <dl class="kv"><dt>Waiting for this Chog (Sleeping Dividend)</dt><dd>${fmt(each)}</dd><dt>Your deposit</dt><dd id="depV">20,000</dd><dt>Starting cash</dt><dd id="startV">${fmt(20000 + each)}</dd></dl>
      <input type="range" id="dep" min="10000" max="60000" step="5000" value="20000" aria-label="Deposit">
      <button class="btn primary lg" id="openAcct">Open account for ${c.name}</button>
      <p class="tiny">Play money. You can top up later from the Bank.</p></div></div>`;
  $("#dep").oninput = e => { $("#depV").textContent = fmt(+e.target.value); $("#startV").textContent = fmt(+e.target.value + each); };
  $("#openAcct").onclick = () => openPracticeAccount(+$("#dep").value);
}
function openPracticeAccount(dep) {
  const pick = byId(U.pick);
  PROPS.forEach(p => { const n = p.h[pick.id]; if (n) { const v = sellValue(p, n); p.supply -= n; p.reserve -= v; G.commons += v; delete p.h[pick.id]; } });
  G.commons += pick.cash + pick.unclaimed + pick.jar;
  const fresh = mkChog(CHOG_ART.find(a => a.id === pick.id), false);
  G.chogs[G.chogs.indexOf(pick)] = fresh; G.me = fresh;
  const div = G.sleep / SUPPLY; G.sleep -= div; G.wallet.chog -= dep; G.inflow += dep;
  Object.assign(fresh, { cash: dep + div, woke: G.t, lastCash: G.t, taxUntil: G.t + DAY, immuneUntil: G.t + DAY, seasonAppraisal: 0, plan: G.plan, autoTax: true });
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
  $("#meAvatar").style.backgroundImage = `url(${c.img})`; $("#meWorth").textContent = fmt(appraisal(c));
  if (U.room === "desk") renderDesk();
  if (U.room === "map") renderMap();
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
  if (c.bankrupt === G.seasonNo) out.push(["Bankrupt: top up to play again", "bank"]);
  if (c.unclaimed >= 1) out.push([`Claim ${fmt(c.unclaimed)} rent`, "claim"]);
  if (c.queue.some(q => q.ready)) out.push(["Cash-out ready to collect", "bank"]);
  if (brickValue(c) > 0 && !c.autoTax && c.taxUntil - G.t < 12 * HOUR) out.push([G.t > c.taxUntil ? "Property Tax unpaid: Bricks earn nothing" : `Property Tax runs out in ${dur(c.taxUntil - G.t)}`, "bank"]);
  if (c.jail) out.push(["You're in Rug Jail: roll doubles or pay bail", "map"]);
  if (c.rolls > 0 && c.bankrupt !== G.seasonNo) out.push([`${c.rolls} roll${c.rolls > 1 ? "s" : ""} ready`, "map"]);
  return out;
}
function threads() {
  const me = G.me.id, by = new Map();
  for (const m of G.inbox) { if (m.from !== me && m.to !== me) continue; const other = m.from === me ? m.to : m.from; by.set(other, m); }
  return [...by.entries()].sort((a, b) => b[1].t - a[1].t);
}
function ranking() { return [...G.chogs].sort((a, b) => appraisal(b) - appraisal(a)); }
function seasonGain(c) { return appraisal(c) - (c.seasonAppraisal || 0); }
function renderLeaders() {
  const bySeason = U.lb === "season";
  const r = bySeason ? [...G.chogs].sort((a, b) => seasonGain(b) - seasonGain(a)) : ranking();
  const n = r.length, bottomFrom = n - Math.floor(n / 4), me = r.indexOf(G.me), left = seasonEnd() - G.t;
  const val = x => bySeason ? seasonGain(x) : appraisal(x);
  const money = v => `<span class="num ${v > 0 ? "up" : v < 0 ? "down" : ""}">${v > 0 ? "+" : v < 0 ? "−" : ""}${fmt(Math.abs(v))}</span>`;
  const plinth = (x, k) => x ? `<div class="plinth p${k + 1}"><i class="avatar" style="background-image:url(${x.img})"></i><b>${x === G.me ? "You" : esc(x.name)}</b><span class="small">${bySeason ? money(val(x)) : `<span class="num">${fmt(val(x))}</span>`}</span><div class="base">${k + 1}</div></div>` : "<div></div>";
  const row = (x, i) => `<div class="lbrow ${x === G.me ? "me" : ""} ${i >= bottomFrom ? "inbottom" : ""}"><span class="num"><b>#${i + 1}</b></span><i class="avatar" style="background-image:url(${x.img})"></i><span class="nm">${x === G.me ? "You" : esc(x.name)}</span><span class="num">${fmt(appraisal(x))}</span><span class="chg">${money(seasonGain(x))}</span></div>`;
  const rows = [];
  r.forEach((x, i) => {
    if (i === 0) rows.push(`<div class="lbzone top"><span>Top 10 · share 40% of the season pot</span><span>${fmt(G.season)} in the pot</span></div>`);
    if (i === 10 && bottomFrom > 10) rows.push(`<div class="lbzone"><span>Middle</span><span></span></div>`);
    if (i === bottomFrom && n >= 4) rows.push(`<div class="lbzone bottom"><span>Bottom quarter · pays 5% of cash at season end</span><span>if active</span></div>`);
    rows.push(row(x, i));
  });
  $("#room-leaders").innerHTML = `
  <div class="pagehead"><div><div class="eyebrow">Season ${G.seasonNo} · ends in ${dur(left)}</div><h1>Leaders</h1></div>
    <div class="lbtabs" role="group" aria-label="Rank by"><button data-lb="season" aria-pressed="${bySeason}">This season</button><button data-lb="rich" aria-pressed="${!bySeason}">Richest</button></div></div>
  <p class="muted" style="margin:-8px 0 20px;max-width:64ch">${bySeason ? "Ranked by how much each Chog grew this season. This is the board that pays prizes." : "Ranked by total net worth: cash, Bricks, unclaimed rent and app positions inside the Chog."} You're <b>#${me + 1}</b> of ${n}.</p>
  <div class="cols"><div class="card"><div class="podium">${plinth(r[1], 1)}${plinth(r[0], 0)}${plinth(r[2], 2)}</div>
      <div class="lbrow" style="background:none;font-size:11.5px;font-weight:800;color:var(--ink-3);letter-spacing:.06em;text-transform:uppercase"><span>Rank</span><span></span><span>Chog</span><span>Net worth</span><span class="chg">This season</span></div>
      <div class="lbtable">${rows.join("")}</div></div>
    <div class="stack"><div class="card stack"><h3>How the season pays</h3><dl class="kv"><dt>Top 10 by growth</dt><dd>40%</dd><dt>Every Chog with 20+ rolls</dt><dd>30%</dd><dt>Best defenders (heists stopped)</dt><dd>15%</dd><dt>Closing Bell (last Brick buyer)</dt><dd>10%</dd><dt>#1 of the season</dt><dd>5%</dd></dl>
      <p class="tiny">Before the payout, the bottom quarter of active Chogs pays 5% of its cash into the pot. Bricks are never taxed.</p></div>
      <div class="card tint stack"><h3>Your season</h3><dl class="kv"><dt>Rank this season</dt><dd>#${[...G.chogs].sort((a, b) => seasonGain(b) - seasonGain(a)).indexOf(G.me) + 1}</dd><dt>Rank by net worth</dt><dd>#${ranking().indexOf(G.me) + 1}</dd><dt>Growth this season</dt><dd>${money(seasonGain(G.me))}</dd><dt>Rolls this season</dt><dd>${G.me.rollsSeason}</dd></dl></div></div></div>`;
  document.querySelectorAll("[data-lb]").forEach(b => b.onclick = () => { U.lb = b.dataset.lb; renderLeaders(); });
}function renderDesk() {
  const c = G.me, pr = prestige(c), th = threads(), unread = G.inbox.filter(m => m.to === c.id && !m.read).length;
  const left = seasonEnd() - G.t, bell = G.bellEnd !== null, rank = ranking().indexOf(c) + 1, hot = SQ[hotIndex()];
  $("#room-desk").innerHTML = `
  <div class="pagehead"><div><div class="eyebrow">${G.mode === "practice" ? "Practice City" : Chain.net()?.label || ""} · Season ${G.seasonNo} · ${clockStr(G.t)}</div><h1>Your desk, ${esc(c.name)}</h1></div>
    ${G.mode === "practice" ? `<div class="row"><span class="tiny">Practice clock</span><button class="btn sm" id="ff2">+2 hours</button><button class="btn sm" id="ffd">+1 day</button></div>` : ""}</div>
  <div class="cols">
    <div class="card" id="deskChog">
      <div class="deskhero"><i class="avatar" style="background-image:url(${c.img})"></i><div class="stack" style="gap:6px">
        <div class="row" style="gap:6px"><span class="pill purple">${c.tier}</span><span class="pill">${c.mood}</span>${c.jail ? '<span class="pill bad">In Rug Jail</span>' : ""}${c.bankrupt === G.seasonNo ? '<span class="pill bad">Bankrupt</span>' : ""}</div>
        <div class="eyebrow">What this Chog is worth</div><div class="big" id="deskWorth">${fmt(appraisal(c))} <span class="small muted">$CHOG</span></div>
        <div class="tiny">Prestige +${pr}% · ${c.stamps.size} stamps · <button class="linkbtn" data-room="leaders">#${rank} of ${G.chogs.length} in the city</button></div></div></div>
      <div class="stats"><div class="stat"><span>Cash</span><b>${fmt(c.cash)}</b></div><div class="stat"><span>Unclaimed rent</span><b>${fmt(c.unclaimed)}</b></div><div class="stat"><span>Bricks</span><b>${fmt(brickValue(c))}</b></div><div class="stat"><span>This season</span><b class="${seasonGain(c) > 0 ? "up" : seasonGain(c) < 0 ? "down" : ""}">${seasonGain(c) >= 0 ? "+" : "−"}${fmt(Math.abs(seasonGain(c)))}</b></div></div>
    </div>
    <div class="card move stack" id="deskMove">
      <div class="row between"><h3>Your move</h3><span class="tiny">1 roll every 30 min</span></div>
      <div class="pips" aria-label="${c.rolls} rolls ready">${Array.from({ length: K.rollCap + (c.tier !== "Common" ? 1 : 0) }, (_, k) => `<i class="${k < c.rolls ? "on" : ""}"></i>`).join("")}</div>
      <button class="btn gold lg" id="deskRoll" ${c.bankrupt === G.seasonNo ? "disabled" : ""}>${c.rolls ? `Roll now · ${c.rolls} ready` : "Roll · extra roll 100 $CHOG"}</button>
      <div class="row between"><span class="tiny">Season ${bell ? "ends (Closing Bell) in" : "ends in"}</span><span class="timer" style="color:${bell ? "var(--gold)" : "inherit"}">${dur(left)}</span></div>
    </div>
  </div>
  <div class="cols" style="margin-top:18px">
    <div class="card"><div class="row between"><h3>While you were away</h3>${G.activity.some(a => a.t > G.lastSeen) ? `<button class="link" id="markRead">Mark as read</button>` : ""}</div>${activityHtml(10)}</div>
    <div class="stack">
      <div class="card" id="deskTodo"><h3>To do</h3><div class="todo">${todos().map(([t, a]) => `<button data-todo="${a}"><span>${t}</span><span aria-hidden="true">→</span></button>`).join("") || `<p class="empty">All clear.</p>`}</div></div>
      <div class="card" id="deskInbox"><div class="row between"><h3>Messages ${unread ? `<span class="pill purple">${unread} new</span>` : ""}</h3></div>
        ${th.length ? th.slice(0, 5).map(([id, m]) => { const o = byId(id); if (!o) return ""; const un = G.inbox.some(x => x.from === id && x.to === c.id && !x.read); return `<button class="thread" data-thread="${id}"><i class="avatar" style="background-image:url(${o.img})"></i><span style="min-width:0"><span class="t">${esc(o.name)}</span><span class="s" style="display:block">${m.from === c.id ? "You: " : ""}${esc(m.text)}</span></span>${un ? '<i class="unread"></i>' : ""}</button>`; }).join("") : `<p class="empty">No messages yet. Open any street on the Map to message its owners.</p>`}</div>
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
      <div class="stage"><div class="stagebar"><div><div class="eyebrow">Monad City</div><h2 style="font-size:clamp(1.5rem,3vw,2rem)">Map</h2></div>
          <button class="viewswitch" id="viewSwitch" role="switch" aria-checked="${U.angled}" aria-label="3D view"><span data-v="flat">Flat</span><span class="vs"><i></i></span><span data-v="3d">3D</span></button></div>
        <div class="mapbox ${U.angled ? "angled" : ""}" id="mapBox"></div>
        <div class="legend"><span><i style="background:var(--purple)"></i>You are here</span><span><i style="background:var(--gold);border-radius:50%"></i>Your streets</span><span><i style="background:var(--red)"></i>Hot Street (rent ×2)</span><span>Tap any square for its card</span></div></div>
      <div class="rail">
        <div class="card hudme" id="hudMe"></div>
        <div class="card dock stack" id="rollCard"><div class="dice"><div class="die" id="d1"></div><div class="die" id="d2"></div></div>
          <button class="rollbtn" id="roll">ROLL</button><button class="btn danger" id="bail" hidden>Pay 500 bail</button>
          <div class="row between"><span class="tiny">Rolls ready</span><span class="pips" id="mapPips"></span></div>
          <div><div class="tiny" style="margin-bottom:6px">Buying plan: what your Chog buys where it lands</div><div class="seg" id="plans" role="group" aria-label="Buying plan"><button data-plan="safe">Safe</button><button data-plan="balanced">Balanced</button><button data-plan="degen">Degen</button></div><p class="tiny" id="planNote" style="margin-top:6px"></p></div>
          <p class="result" id="lastev">Press ROLL. Your Chog moves, and your plan buys Bricks where it lands.</p></div>
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
  $("#hudMe").innerHTML = `<i class="avatar" style="background-image:url(${c.img})"></i><div style="min-width:0"><div class="row between"><b>${esc(c.name)}</b><span class="tiny">#${ranking().indexOf(c) + 1} in the city</span></div><div class="row between" style="margin-top:4px"><span class="tiny">Cash</span><b class="num">${fmt(c.cash)}</b></div><div class="row between"><span class="tiny">Worth</span><b class="num">${fmt(appraisal(c))}</b></div></div>`;
  $("#plans").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.plan === G.plan)));
  $("#planNote").textContent = { safe: "Up to 3 Bricks, only on cheap streets. Keeps half your cash.", balanced: "Up to 6 Bricks anywhere. Keeps a quarter of your cash.", degen: "Up to 15 Bricks. Keeps nothing back." }[G.plan];
  $("#mapPips").innerHTML = Array.from({ length: K.rollCap + (c.tier !== "Common" ? 1 : 0) }, (_, k) => `<i class="${k < c.rolls ? "on" : ""}" style="width:9px;height:14px"></i>`).join("");
  $("#roll").textContent = c.jail ? "ROLL FOR DOUBLES" : c.rolls ? "ROLL" : "ROLL · 100";
  $("#roll").disabled = G.busy || c.bankrupt === G.seasonNo; $("#bail").hidden = !c.jail;
  $("#hereCard").innerHTML = `<div class="eyebrow">You are on</div><h3>${s.name}</h3><p class="small muted">${s.t === "prop" ? `${D[s.d].n} · rent ${s.d === "util" ? "dice × " + 20 * LEVEL_MULT[level(s)] : fmt(rentOf(s))}` : squareText(s)}</p><div><button class="btn sm" data-tile="${c.pos}">Open its card</button></div>`;
  requestAnimationFrame(renderPawns);
}
function paintSwitch() {
  const sw = $("#viewSwitch"); if (!sw) return; sw.setAttribute("aria-checked", String(U.angled));
  sw.querySelector('[data-v="flat"]').className = U.angled ? "" : "on"; sw.querySelector('[data-v="3d"]').className = U.angled ? "on" : "";
}function squareText(s) {
  return { go: "Pass it to collect 1% of your Bricks' value (max 500) from the Commons.", chest: "Draw a Commons Chest card: payouts, moves and a get-out-of-jail card.", chance: "Draw a Market News card: payouts, fees, moves.", tax: s.name === "Gas Tax" ? "Pay 5% of your cash (max 1,000) into the Nad Lounge pot." : "Pay 750 into the Nad Lounge pot.", jail: "Just visiting, unless you were sent here. To get out: roll doubles (3 tries), pay 500, or use a card.", lounge: `Land here to win 25% of the Nad Lounge pot (now ${fmt(G.lounge)}).`, gojail: "Go straight to Rug Jail without passing GENESIS.", heist: "Pick a Chog and try to rob 10% of its unclaimed rent." }[s.t] || "";
}
function renderBank() {
  const c = G.me, tr = exitTax(c), capLeft = dailyCapLeft(), maxOut = Math.floor(Math.min(c.cash, capLeft)), pr = prestige(c);
  const amt = Math.min(+(U.coAmt ?? maxOut), maxOut), tax = amt * tr / 100, paid = G.t <= c.taxUntil;
  const mine = PROPS.filter(p => myBricks(c, p));
  const strip = (brickValue(c) * 0.95 + c.cash + c.unclaimed) * (1 - tr / 100);
  $("#room-bank").innerHTML = `
  <div class="pagehead"><div><div class="eyebrow">Your Chog's account</div><h1>Bank</h1></div></div>
  <div class="cols">
    <div class="stack">
      <div class="card stack" id="bankSheet"><div class="eyebrow">Balance sheet · lives inside the NFT</div><div class="big">${fmt(appraisal(c))} <span class="small muted">$CHOG</span></div>
        <dl class="kv"><dt>Cash</dt><dd>${fmt(c.cash)}</dd><dt>Unclaimed rent</dt><dd>${fmt(c.unclaimed)}</dd><dt>Bricks (sell value)</dt><dd>${fmt(brickValue(c))}</dd><dt>Dapp positions</dt><dd>${fmt(positionsValue(c))}</dd><dt>Hype jar</dt><dd>${fmt(c.jar)}</dd></dl>
        <div class="row"><button class="btn primary" id="claimBtn" ${c.unclaimed < 1 ? "disabled" : ""}>Claim ${fmt(c.unclaimed)} rent</button><button class="btn" id="topup">Top up 5,000</button></div>
        <p class="tiny">Claim bonus: ×${claimMult(c).toFixed(2)} (Prestige +${pr}%, stamps +${stampPct(c)}%, tier +${TIER_BONUS[c.tier]}%). The bonus is paid by the Commons, never minted.</p></div>
      <div class="card stack" id="bankTax"><div class="row between"><h3>Property Tax</h3><span class="pill ${paid ? "ok" : "bad"}">${paid ? `Paid ${dur(c.taxUntil - G.t)} ahead` : "Unpaid"}</span></div>
        <p class="small muted">0.5% of your Bricks' value per day (${fmt(brickValue(c) * K.propTaxDay)} today). If it's unpaid, your Bricks earn nothing, but you never lose them.</p>
        <div class="row"><button class="btn sm" data-tax="1">Prepay 1 day</button><button class="btn sm" data-tax="3">Prepay 3 days</button>${onChain() ? "" : `<label class="row small" for="autoTax"><input type="checkbox" id="autoTax" ${c.autoTax ? "checked" : ""}> Autopay</label>`}</div></div>
      <div class="card stack" id="bankStreets"><h3>Your streets</h3>${mine.length ? mine.map(p => { const n = myBricks(c, p); return `<button class="todo-like thread" data-tile="${p.i}" style="grid-template-columns:12px minmax(0,1fr) auto"><i style="width:12px;height:30px;border-radius:3px;background:${D[p.d].c}"></i><span><span class="t">${p.name}</span><span class="s" style="display:block">${n} Bricks · ${Math.round(n / p.supply * 100)}% · ${LEVEL_NAME[level(p)]}</span></span><span class="num small">${fmt(sellValue(p, n) * 0.95)}</span></button>`; }).join("") : `<p class="empty">No Bricks yet. Roll on the Map and your plan buys them.</p>`}</div>
      <div class="card stack" id="bankGuards"><div class="row between"><h3>Guards</h3><span class="num">${c.guards} / 4</span></div><p class="small muted">Each guard costs 500 and cuts Heist odds against you by 5%. Claiming rent often also protects you, because robbers can only take unclaimed rent.</p><button class="btn sm" id="guard" ${c.guards >= 4 ? "disabled" : ""}>Hire a guard (500)</button></div>
      ${onChain() ? Chain.positionsHtml() : ""}
    </div>
    <div class="stack">
      <div class="card stack" id="bankOut"><h3>Cash out to your wallet</h3><p class="small muted">Spending inside the game is free. Leaving costs money and resets Prestige.</p>
        <label class="small" for="coAmt">Amount: <b class="num" id="coV">${fmt(amt)}</b> <span class="tiny">(max today ${fmt(maxOut)})</span></label>
        <input type="range" id="coAmt" min="0" max="${maxOut}" step="10" value="${Math.floor(amt)}">
        <dl class="kv"><dt>Exit tax (${tr}%)</dt><dd id="coT">−${fmt(tax)}</dd><dt>Prestige lost</dt><dd style="color:var(--red)">+${pr}% → 0%</dd><dt>Wait</dt><dd>48 hours</dd><dt><b>You receive</b></dt><dd><b id="coN">${fmt(amt - tax)}</b></dd></dl>
        <button class="btn danger" id="coGo" ${amt < 100 ? "disabled" : ""}>Request cash-out</button>
        <p class="tiny">Half the tax goes to the players who stay, a quarter is burned, a quarter goes to the season pot.</p></div>
      <div class="card tint stack" id="bankSell"><h3>Or sell the whole Chog</h3><p class="small muted">Bricks can only leave by selling the NFT. A buyer gets everything inside.</p>
        <dl class="kv"><dt>Strip it and cash out</dt><dd>${fmt(strip)}</dd><dt>Sell the Chog (Appraisal)</dt><dd><b>${fmt(appraisal(c))}</b></dd></dl></div>
      ${c.queue.length ? `<div class="card stack"><h3>Cash-out queue</h3>${c.queue.map(q => `<div class="row between"><span class="num">${fmt(q.net)}</span><span class="tiny">${q.ready ? "ready" : "ready in " + dur(q.at - G.t)}</span></div>`).join("")}${c.queue.some(q => q.ready) ? `<button class="btn green" id="coClaim">Collect to wallet</button>` : ""}</div>` : ""}
      <div class="card stack"><h3>${onChain() ? "Your wallet" : "Practice wallet"}</h3>${onChain() ? Chain.walletHtml() + Chain.ledgerHtml() : `<dl class="kv"><dt>$CHOG</dt><dd>${fmt(G.wallet.chog)}</dd><dt>MON</dt><dd>${(+G.wallet.mon).toFixed(1)}</dd></dl>`}</div>
    </div>
  </div>`;
  $("#claimBtn").onclick = doClaim; $("#topup").onclick = doTopUp; $("#guard").onclick = doGuard;
  document.querySelectorAll("[data-tax]").forEach(b => b.onclick = () => doTax(+b.dataset.tax));
  const at = $("#autoTax"); if (at) at.onchange = e => { c.autoTax = e.target.checked; render(); window.Guide?.on("tax"); };
  const sl = $("#coAmt"); sl.oninput = () => { window.Guide?.on("cashslide"); U.coAmt = +sl.value; const t = U.coAmt * tr / 100; $("#coV").textContent = fmt(U.coAmt); $("#coT").textContent = "−" + fmt(t); $("#coN").textContent = fmt(U.coAmt - t); $("#coGo").disabled = U.coAmt < 100; };
  $("#coGo").onclick = () => doCashOut(+sl.value);
  const cc = $("#coClaim"); if (cc) cc.onclick = doCollect;
}
function renderRules() {
  const host = $("#room-rules"); host.dataset.built = 1;
  const rows = SQ.map((s, i) => `<tr><td class="num">${i}</td><td>${s.name}</td><td>${s.t === "prop" ? (s.brand ? `${D[s.d].n} · <b>${WIRED[s.brand].name}</b>` : D[s.d].n) : "Special"}</td><td>${s.t === "prop" ? (s.q ? s.q[2] : `Rent ${s.d === "util" ? "dice × 20 × level" : fmt(s.base) + " × level"}`) : squareText(s)}</td></tr>`).join("");
  host.innerHTML = `<div class="pagehead"><div><div class="eyebrow">Docs</div><h1>Rules</h1></div><div class="row"><button class="btn primary sm" data-help="tour">Replay the tour</button><button class="btn sm" data-help="reset">Show tips again</button></div></div>
  <div class="docs"><nav><a href="#r-quick">Quick start</a><a href="#r-bricks">Bricks and rent</a><a href="#r-value">Your Chog's value</a><a href="#r-time">Seasons and the timer</a><a href="#r-away">Away and always-on</a><a href="#r-cards">Cards, jail, heists</a><a href="#r-out">Cashing out</a><a href="#r-board">Every square</a><a href="#r-glossary">Glossary</a></nav>
  <div>
  <section id="r-quick"><h2>Quick start</h2><ol><li>Open an account: deposit $CHOG into your Chog.</li><li>On the Map, press ROLL. Your Chog moves and your buying plan buys Bricks where it lands.</li><li>Other Chogs land on your streets and pay you rent. Claim it in the Bank.</li><li>Keep Property Tax paid so your Bricks keep earning. Check your Desk for what happened while you were away.</li></ol></section>
  <section id="r-bricks"><h2>Bricks and rent</h2><p>A Brick is a share of one street. Every Brick bought raises the next price. Rent grows with how much money sits in the street: empty lot ×1, cottage ×2, shop ×4, tower ×7, skyscraper ×11, neon landmark ×16. 90% of each rent goes to the Brick holders, 10% to the Commons. One Chog can hold at most 40% of a street. The two Launch District streets are reserved for Chogs worth less than 50,000.</p></section>
  <section id="r-value"><h2>Your Chog's value</h2><p>Cash, Bricks, unclaimed rent and dapp positions all live inside the NFT. Bricks can't be withdrawn or sent to another Chog. Sell the Chog and the buyer gets everything. Prestige grows 1% a day while you don't cash out (up to 50%) and boosts your rent claims.</p></section>
  <section id="r-time"><h2>Seasons and the timer</h2><p>The city never resets. Seasons last 7 days and the countdown is on your Desk. In the last 24 hours the Closing Bell rings: every Brick buy adds a minute, and the last buyer when it hits zero wins 10% of the season pot. Then the pot is shared: 40% to the 10 richest Chogs, 30% to every active Chog, 15% to the best defenders, 5% to the #1 Chog. Before that, the bottom quarter of active Chogs pay 5% of their cash into the pot. If you go bankrupt (no cash and no Bricks to sell), you sit out until next season, unless you top up.</p></section>
  <section id="r-away"><h2>Away and always-on players</h2><p><b>Away:</b> rolls pile up to 8, Property Tax can be prepaid for 3 days (or autopaid), your Bricks keep earning, and your Desk shows what happened. <b>Always-on:</b> rolls refill only every 30 minutes, extra rolls cost 100 $CHOG, one Chog can't own more than 40% of a street, and Property Tax grows with your holdings.</p></section>
  <section id="r-cards"><h2>Cards, jail, heists</h2><p>Market News (3 squares) and Commons Chest (2 squares) draw a card: a payout from the Commons, a fee into the Nad Lounge, a move, or a free roll. Got Rugged sends you to Rug Jail: roll doubles, pay 500, or use a card. On HEIST you can try to rob 10% of another Chog's unclaimed rent. Fail and you pay them 500 and go to jail.</p></section>
  <section id="r-out"><h2>Cashing out</h2><p>Cash-outs are taxed 20%, down to 10% after loyal weeks. They wait 48 hours, are capped city-wide at 2% of all game cash per day, and reset Prestige to zero. After a Chog is sold, the new owner can't cash out for 72 hours.</p></section>
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
  if (s.t !== "prop") return modal(`<div class="plainhead"><div class="eyebrow">Square ${i}</div><h3 style="font-size:24px;margin-top:6px">${s.name}</h3></div><div class="body"><p class="muted">${squareText(s)}</p><button class="btn primary" data-close>OK</button></div>`);
  const p = s, n = myBricks(c, p), l = level(p), owners = Object.entries(p.h).sort((a, b) => b[1] - a[1]);
  const here = c.pos === i, today = c.qday[i] === Math.floor(G.t / DAY), done = c.stamps.has(i);
  const chainQuest = onChain() ? Chain.questHtml(p, here) : null;
  modal(`<div class="deedhead" style="background:${D[p.d].c}">${p.brand ? `<img src="${LOGOS[p.brand]}" alt="">` : ""}<div class="eyebrow">Title deed · ${D[p.d].n}</div><h3>${p.name}</h3>${p.i === hotIndex() ? `<span class="pill warn" style="margin-top:6px">Hot Street today: rent ×2</span>` : ""}</div>
  <div class="body">
    <table class="renttable">${LEVEL_NAME.map((nm, k) => `<tr class="${k === l ? "cur" : ""}"><td>${nm}${k === l ? " · now" : ""}</td><td>${p.d === "util" ? "dice × " + 20 * LEVEL_MULT[k] : fmt(p.base * LEVEL_MULT[k])}</td></tr>`).join("")}</table>
    <dl class="kv"><dt>Brick price now</dt><dd>${fmt(price(p))}</dd><dt>Bricks issued</dt><dd>${fmt(p.supply)}</dd><dt>You own</dt><dd>${n} ${n ? `(${Math.round(n / p.supply * 100)}%)` : ""}</dd></dl>
    <div><div class="eyebrow" style="margin-bottom:4px">Owners</div>${owners.length ? owners.slice(0, 6).map(([id, k]) => { const o = byId(+id); if (!o) return ""; const isMe = o === c; return `<div class="owner"><i class="avatar" style="background-image:url(${o.img})"></i><span><b>${isMe ? "You" : esc(o.name)}</b> <span class="tiny">${Math.round(k / p.supply * 100)}%</span></span>${isMe ? "" : `<span class="row"><button class="btn sm" data-dm="${o.id}">Message</button><button class="btn sm gold" data-hype="${o.id}">Hype</button></span>`}</div>`; }).join("") : `<p class="empty">Nobody owns this street yet. Land here with a buying plan to open it.</p>`}</div>
    ${p.q ? (chainQuest ?? `<div class="questbox"><div class="row between"><b>${p.dapp}</b><span class="pill ok">Real Monad app</span></div><p class="small">${p.q[2]}.</p><p class="tiny">${done ? "Patron Stamp collected." : "First time: a Patron Stamp (+1% claim weight)."} ${today ? "Today's free roll used." : "Once a day: +1 free roll."}</p>${here ? `<button class="btn primary sm" data-quest="${i}" ${today && done ? "disabled" : ""}>${p.q[1] === "swap" ? "Swap 50 MON (practice)" : "Use 20 MON (practice)"}</button>` : `<p class="tiny">Land here to do this.</p>`}</div>`) : ""}
    ${n ? `<button class="btn sm ghost" data-sell="${i}">Sell 1 Brick (+${fmt(sellValue(p, 1) * 0.95)})</button>` : ""}
    <button class="btn primary" data-close>${landed ? "Keep playing" : "Close"}</button>
  </div>`);
  window.Guide?.on("tile", { i, landed });
}
function openHeist() {
  const me = G.me, opts = G.chogs.filter(t => t !== me && t.unclaimed >= K.heistMinUnclaimed && G.t >= t.immuneUntil).sort((a, b) => b.unclaimed - a.unclaimed).slice(0, 6);
  modal(`<div class="deedhead" style="background:var(--red)"><div class="eyebrow">Heist</div><h3>Pick a target</h3></div><div class="body"><p class="small muted">Win: take 10% of their unclaimed rent. Lose: pay them 500 and go to Rug Jail. Cash and Bricks are never at risk.</p>
    ${opts.length ? opts.map(t => { const ch = clamp(K.heistBase + (isLaser(me) ? 5 : 0) + (isHeistHat(me) ? 5 : 0) - TIER_DEF[t.tier] - t.guards * 5 - (isVisor(t) ? 5 : 0), 10, 80); return `<button class="thread" data-heist="${t.id}"><i class="avatar" style="background-image:url(${t.img})"></i><span><span class="t">${esc(t.name)}</span><span class="s" style="display:block">${fmt(t.unclaimed)} unclaimed · ${t.guards} guards</span></span><span class="pill ${ch >= 50 ? "ok" : "warn"}">${ch}%</span></button>`; }).join("") : `<p class="empty">Nobody has 500+ unclaimed rent right now.</p>`}
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
  if (c.bankrupt === G.seasonNo) { toast("Bankrupt: top up in the Bank to play again, or wait for next season."); return room("bank"); }
  closeSheet();
  if (c.rolls <= 0) { if (c.cash < K.extraRoll) return toast("No rolls left and not enough cash for an extra roll."); payTo(c, K.extraRoll / 2, "burn"); payTo(c, K.extraRoll / 2, "lounge"); c.rolls++; }
  G.busy = true; c.rolls--; c.rollsSeason++; c.plan = G.plan; c.broke = false; render();
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
  if (c.broke && c.cash <= 0 && brickValue(c) <= 0) { c.bankrupt = G.seasonNo; act("bankrupt", "You couldn't pay rent and went bankrupt. Top up in the Bank to play again, or wait for next season"); }
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
function doTopUp() { if (onChain()) return Chain.topUp(5000); if (G.wallet.chog < 5000) return toast("Practice wallet is empty."); G.wallet.chog -= 5000; G.me.cash += 5000; G.inflow += 5000; G.me.broke = false; if (G.me.bankrupt) { G.me.bankrupt = 0; toast("Topped up. You're back in the game."); } render(); }
function doTax(days) { if (onChain()) return Chain.tax(days); const r = prepayTax(G.me, days); if (r === -1) toast("Not enough cash in your Chog."); else { render(); window.Guide?.on("tax"); } }
function doGuard() { if (onChain()) return Chain.guard(); const c = G.me; if (c.cash < K.guardCost) return toast("Not enough cash."); payTo(c, 250, "burn"); payTo(c, 250, "commons"); c.guards++; render(); }
function payBail() { if (onChain()) return Chain.bail(); const c = G.me; if (!c.jail) return; if (c.cash < K.bail) return toast("Not enough cash for bail."); payTo(c, K.bail / 2, "burn"); payTo(c, K.bail / 2, "lounge"); c.jail = 0; render(); }
function doCashOut(amt) {
  if (onChain()) return Chain.cashOut(amt);
  const c = G.me; amt = Math.min(amt, c.cash, dailyCapLeft()); if (amt < 100) return toast("Nothing to cash out within today's city-wide cap.");
  const r = exitTax(c) / 100, tax = amt * r;
  c.cash -= amt; G.commons += tax * 0.5; burn(tax * 0.25); G.season += tax * 0.25; G.cashedToday += amt; c.lastCash = G.t;
  c.queue.push({ amt, net: amt - tax, at: G.t + K.queue, ready: false }); U.coAmt = 0;
  toast(`Cash-out queued. ${fmt(amt - tax)} arrives in 48 hours. Prestige reset to 0.`); render(); window.Guide?.on("cashout");
}
function doCollect() { if (onChain()) return Chain.claimCashOut(); const c = G.me; let tot = 0; c.queue = c.queue.filter(q => { if (q.ready) { tot += q.net; return false; } return true; }); G.wallet.chog += tot; G.outflow += tot; toast(`${fmt(tot)} $CHOG sent to your wallet.`); render(); }
function doQuest(i) {
  if (onChain()) return Chain.quest(i);
  const c = G.me, s = SQ[i], kind = s.q[1], day = Math.floor(G.t / DAY);
  if (kind === "swap") { if (G.wallet.mon < 50) return toast("Your practice wallet is out of MON."); G.wallet.mon -= 50; const got = 50 * K.monToChog * (0.97 + rnd() * 0.04); c.cash += got; G.inflow += got; toast(`Swapped 50 MON → ${fmt(got)} $CHOG on nad.fun, into your Chog.`); }
  else { if (G.wallet.mon < 20) return toast("Your practice wallet is out of MON."); G.wallet.mon -= 20; c.pos_[s.dapp] = (c.pos_[s.dapp] || 0) + 20 * K.monToChog; G.inflow += 20 * K.monToChog; toast(`${s.dapp}: done. The position is held by your Chog.`); }
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
  const r = t.closest("[data-room]"); if (r) return room(r.dataset.room);
  const tl = t.closest("[data-tile]"); if (tl && !tl.closest("#heroMap")) return openTile(+tl.dataset.tile, false);
  const q = t.closest("[data-quest]"); if (q) return doQuest(+q.dataset.quest);
  const sl = t.closest("[data-sell]"); if (sl) { if (onChain()) return Chain.sell(+sl.dataset.sell); sellBricks(G.me, SQ[+sl.dataset.sell], 1); openTile(+sl.dataset.sell, false); return render(); }
  const h = t.closest("[data-heist]"); if (h) { if (onChain()) return Chain.heist(+h.dataset.heist); const res = heist(G.me, byId(+h.dataset.heist)); closeSheet(); toast(res.win ? `Heist worked: +${fmt(res.amt)}.` : `Caught. You paid ${fmt(res.amt)} and went to Rug Jail.`); return render(); }
  const dm = t.closest("[data-dm],[data-thread]"); if (dm) return openThread(+(dm.dataset.dm || dm.dataset.thread));
  const hy = t.closest("[data-hype]"); if (hy) { if (onChain()) return Chain.hype(+hy.dataset.hype, 300); if (hype(G.me, byId(+hy.dataset.hype), 300)) { toast("Hyped with 300 $CHOG (30 burned)."); render(); window.Guide?.on("hyped"); } else toast("Not enough cash."); return; }
  const td = t.closest("[data-todo]"); if (td) { const a = td.dataset.todo; if (a === "claim") return doClaim(); return room(a); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#scrim").hidden) closeSheet(); });
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
  G.chogs.forEach(c => { const dep = 12000 + ri(30000); c.cash = dep; G.inflow += dep; c.woke = -2 * DAY; c.lastCash = -2 * DAY - ri(5) * DAY; c.taxUntil = DAY; c.guards = ri(3); });
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
  if (sig !== U.sig) { U.sig = sig; if (U.room === "desk" || U.room === "map" || U.room === "leaders") render(); return; }
  document.querySelectorAll("#room-desk .timer").forEach(t => t.textContent = dur(seasonEnd() - G.t));
  const eb = $("#room-desk .pagehead .eyebrow"); if (eb) eb.textContent = eb.textContent.replace(/Day \d+ · \d\d:\d\d/, clockStr(G.t));
}, 1000);

renderLanding();
