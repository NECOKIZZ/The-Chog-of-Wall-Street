"use strict";
/* ============ The Chog of Wall Street: rules engine (shared by Practice and the on-chain UI) ============ */
const $ = (s, r = document) => r.querySelector(s);
const fmt = n => Math.round(n).toLocaleString("en-US");
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const DAY = 1440, HOUR = 60;
const SUPPLY = 1969;

// ---------- economy constants (mirror docs/PLAN.md) ----------
const K = {
  minDeposit: 10000, rollEvery: 30, rollCap: 8, extraRoll: 100,
  buyFee: 0.03, buyBurn: 0.01, sellSpread: 0.05, rentHolders: 0.9,
  propTaxDay: 0.005, taxPrepayMax: 3 * DAY, capShare: 0.4, capFree: 10,
  fairStartMax: 50000, goPct: 0.01, goCap: 500, loungeWin: 0.25,
  bail: 500, gasTaxPct: 0.05, gasTaxCap: 1000, mevTax: 750,
  heistBase: 55, heistSteal: 0.10, heistFine: 500, heistMinUnclaimed: 500, guardCost: 500,
  exitBase: 20, exitFloor: 10, queue: 2 * DAY, dailyCapPct: 0.02, prestigeDay: 1, prestigeCap: 50,
  hypeStep: 0.10, hypeMax: 1.5, hypeDur: 4 * HOUR, hypeBurn: 0.10,
  inflowCommons: 0.8, inflowSleep: 0.1, inflowSeason: 0.1, seasonLen: 7 * DAY,
  monToChog: 15, // ≈ mainnet rate (1 MON ≈ 14.9 $CHOG via nad.fun, Oct 2026)
};
const LEVEL_X = [0, 10, 40, 120, 300, 700];      // reserve ÷ base price thresholds
const LEVEL_MULT = [1, 2, 4, 7, 11, 16];
const LEVEL_NAME = ["Empty lot", "Cottage", "Shop", "Tower", "Skyscraper", "Neon landmark"];
const TIER_BONUS = { Common: 0, Uncommon: 3, Rare: 6, Epic: 8, Legendary: 10 };
const TIER_DEF = { Common: 0, Uncommon: 5, Rare: 10, Epic: 15, Legendary: 20 };

const D = {
  brown: { c: "var(--d-brown)", n: "Launch District", p0: 40, rent: 60 },
  lblue: { c: "var(--d-lblue)", n: "Penny Stocks", p0: 60, rent: 90 },
  pink: { c: "var(--d-pink)", n: "Payments Row", p0: 90, rent: 130 },
  orange: { c: "var(--d-orange)", n: "Prediction Quarter", p0: 120, rent: 170 },
  red: { c: "var(--d-red)", n: "Leverage District", p0: 160, rent: 220 },
  yellow: { c: "var(--d-yellow)", n: "Yield Gardens", p0: 200, rent: 270 },
  green: { c: "var(--d-green)", n: "Lending Quarter", p0: 250, rent: 330 },
  dblue: { c: "var(--d-dblue)", n: "Blue Chips", p0: 320, rent: 450 },
  station: { c: "var(--d-station)", n: "Station", p0: 180, rent: 200 },
  util: { c: "var(--d-util)", n: "Utility", p0: 150, rent: 0 },
};
// q: [tier, kind, text]   kind: swap (MON→$CHOG into the Chog), stake (MON→LST), deposit (USDC→vault), visit (proof-of-visit receipt)
const SQ = [
  { t: "go", name: "GENESIS", sub: "Collect 1% of your Bricks" },
  { t: "prop", d: "brown", name: "nad.fun Lane", dapp: "nad.fun", brand: "nadfun", q: ["A", "swap", "Buy $CHOG on nad.fun, straight into your Chog"], fair: true },
  { t: "chest", name: "Commons Chest" },
  { t: "prop", d: "brown", name: "Chog Alley", dapp: "nad.fun", brand: "nadfun", q: ["A", "swap", "Buy $CHOG on nad.fun, straight into your Chog"], fair: true },
  { t: "tax", name: "Gas Tax", sub: "5% of cash" },
  { t: "prop", d: "station", name: "FastLane Station", dapp: "FastLane shMON", brand: "fastlane", q: ["A", "stake", "Stake MON → shMON, held by your Chog"] },
  { t: "prop", d: "lblue", name: "Penny Stock Row" },
  { t: "chance", name: "Market News" },
  { t: "prop", d: "lblue", name: "Bagholder Way" },
  { t: "prop", d: "lblue", name: "Paper Hands Place" },
  { t: "jail", name: "RUG JAIL", sub: "Just visiting" },
  { t: "prop", d: "pink", name: "Payday Lane" },
  { t: "prop", d: "util", name: "Ticker Tape Works" },
  { t: "prop", d: "pink", name: "Coupon Court" },
  { t: "prop", d: "pink", name: "Margin Call Place" },
  { t: "prop", d: "station", name: "Grand Central Chog" },
  { t: "prop", d: "orange", name: "Long Shot Row" },
  { t: "chest", name: "Commons Chest" },
  { t: "prop", d: "orange", name: "Odds Square" },
  { t: "prop", d: "orange", name: "Prophecy Court" },
  { t: "lounge", name: "NAD LOUNGE", sub: "Win 25% of the pot" },
  { t: "prop", d: "red", name: "Leverage Pit" },
  { t: "chance", name: "Market News" },
  { t: "prop", d: "red", name: "Short Squeeze Ave" },
  { t: "prop", d: "red", name: "Liquidation Wharf" },
  { t: "prop", d: "station", name: "aPriori Station", dapp: "aPriori aprMON", brand: "apriori", q: ["A", "stake", "Stake MON → aprMON, held by your Chog"] },
  { t: "prop", d: "yellow", name: "Yield Gardens" },
  { t: "prop", d: "yellow", name: "Dividend Grove" },
  { t: "prop", d: "util", name: "Wire Room Works" },
  { t: "prop", d: "yellow", name: "Compound Heights" },
  { t: "gojail", name: "GOT RUGGED", sub: "Go to Rug Jail" },
  { t: "prop", d: "green", name: "Collateral Road" },
  { t: "prop", d: "green", name: "Lender's Court" },
  { t: "heist", name: "HEIST", sub: "Rob unclaimed rent" },
  { t: "prop", d: "green", name: "Interest Park" },
  { t: "prop", d: "station", name: "Kintsu Station", dapp: "Kintsu sMON", brand: "kintsu", q: ["A", "stake", "Stake MON → sMON, held by your Chog"] },
  { t: "chance", name: "Market News" },
  { t: "prop", d: "dblue", name: "Uniswap Boardwalk", dapp: "Uniswap", brand: "uniswap", q: ["A", "usdc", "Swap MON → USDC on Uniswap, held by your Chog"] },
  { t: "tax", name: "MEV Tax", sub: "Pay 750" },
  { t: "prop", d: "dblue", name: "Chog Exchange Tower" },
];
SQ.forEach((s, i) => { s.i = i; if (s.t === "prop") { s.p0 = D[s.d].p0; s.base = D[s.d].rent; s.supply = 0; s.reserve = 0; s.h = {}; } });
const PROPS = SQ.filter(s => s.t === "prop");

const ENTROPY = [ // "Market News" squares (Chance)
  ["Bull run. Advance to Chog Exchange Tower.", c => moveTo(c, 39, true)],
  ["Front-run by a bot. Pay 300 to the Nad Lounge.", c => payTo(c, 300, "lounge")],
  ["Lucky streak. +1 free roll.", c => { c.rolls++; }],
  ["Margin called. Pay 5% of cash (max 800) to the Nad Lounge.", c => payTo(c, Math.min(800, c.cash * 0.05), "lounge")],
  ["Vault payday. Collect 300 from the Commons.", c => fromCommons(c, 300)],
  ["Rugged. Go straight to Rug Jail.", c => toJail(c)],
  ["Order filled. Advance to the next Station.", c => { const st = [5, 15, 25, 35].find(x => x > c.pos) ?? 5; moveTo(c, st, true); }],
  ["Airdrop season. Collect 200 from the Commons.", c => fromCommons(c, 200)],
];
const CHEST = [ // Commons Chest (community cards)
  ["Prosperity. Collect 1% of the Commons (max 1,000).", c => fromCommons(c, Math.min(1000, G.commons * 0.01))],
  ["Advance to GENESIS.", c => moveTo(c, 0, true)],
  ["Get out of Rug Jail free. Keep this card.", c => { c.jailCard = true; }],
  ["LP fees. Collect 150 from the Commons.", c => fromCommons(c, 150)],
  ["Vet bill for your Chog's horns. Pay 100 to the Nad Lounge.", c => payTo(c, 100, "lounge")],
  ["Your Chog went viral. +1 free roll.", c => { c.rolls++; }],
];

// ---------- world state ----------
const G = {
  t: 0, commons: 60000, lounge: 4000, season: 0, sleep: 0, burned: 0, inflow: 0, outflow: 0,
  seasonNo: 1, seasonStartT: 0, bellEnd: null, lastBuyer: null, golden: null, cashedToday: 0, cashDay: 0,
  me: null, chogs: [], feed: [], plan: "balanced", busy: false, speed: 1, tab: "chog", sheet: null,
  wallet: { chog: 100000, mon: 1000, usdc: 50 }, mode: "practice",
  activity: [], inbox: [], lastSeen: 0, page: "desk",
};
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const ri = n => Math.floor(rnd() * n);

function mkChog(a, bot) {
  return {
    id: a.id, name: a.name.replace(/^CHOG /, ""), full: a.name, img: a.img, tier: a.tier, eyes: a.eyes, head: a.head, body: a.body, mouth: a.mouth,
    bot, pos: 0, cash: 0, rolls: K.rollCap, rollAcc: 0, plan: ["safe", "balanced", "degen"][ri(3)], unclaimed: 0, taxUntil: 0,
    lastCash: 0, woke: 0, stamps: new Set(), qday: {}, pos_: {}, jar: 0, hypeMult: 1, hypeUntil: 0, guards: 0, jail: 0, jailCard: false,
    rollsSeason: 0, warden: 0, seasonAppraisal: 0, queue: [], immuneUntil: 0, act: 0.25 + rnd() * 0.6, mood: "Chill", lastIncome: 0, prevIncome: 0, income: 0,
  };
}
const traitLine = c => [c.eyes, c.head, c.body, c.mouth].filter(Boolean).join(" · ");
const isLaser = c => /laser/i.test(c.eyes || "");
const isHeistHat = c => /robber|mafia/i.test(c.head || "");
const isVisor = c => /visor|vr|glass/i.test(c.eyes || "");
const isInmate = c => /inmate|prisoner/i.test(c.body || "");

// ---------- your Desk: things that happened to YOUR Chog ----------
function act(type, text, amt = 0) { G.activity.unshift({ t: G.t, type, text, amt }); if (G.activity.length > 300) G.activity.length = 300; }
let dmSeq = 1;
function sendDM(from, to, text) {
  const m = { id: dmSeq++, from: from.id, to: to.id, t: G.t, text: String(text).slice(0, 280), read: from === G.me };
  G.inbox.push(m);
  if (to === G.me && from.bot) act("dm", `${from.name} sent you a message`);
  if (from === G.me && to.bot) to.pendingReply = { at: G.t + 30 + ri(150), text: m.text };
  return m;
}
const BOT_LINES = {
  rentPaid: ["{sq} is daylight robbery. Sell me 3 Bricks there?", "Paid you rent on {sq} again. Respect.", "Your {sq} Bricks are printing. I'll buy your Chog if you ever get bored."],
  neighbour: ["We both hold {sq}. Don't dump on me.", "Neighbours on {sq}. Want to split the Hot Street days?"],
  caught: ["Your guards are no joke. Truce?", "Fine paid. I'll be back."],
  hello: ["gm from the Lending Quarter.", "Anyone else farming the Nad Lounge pot?", "Prestige is at 30% here. Not cashing out ever."],
  reply: ["Ha. We'll see who owns the board by Friday.", "Deal, if the price is right.", "Noted. See you on GENESIS.", "No way. Holding forever."],
};
const line = (k, sq) => BOT_LINES[k][ri(BOT_LINES[k].length)].replace("{sq}", sq || "the board");

// ---------- money plumbing (zero-sum: every move is between buckets) ----------
function toCommons(x) { if (x <= 0) return; G.commons += x * K.inflowCommons; G.sleep += x * K.inflowSleep; G.season += x * K.inflowSeason; }
function burn(x) { G.burned += x; }
function payTo(c, amt, where) {
  amt = Math.min(amt, c.cash); if (amt <= 0) return 0; c.cash -= amt;
  if (where === "lounge") G.lounge += amt; else if (where === "commons") toCommons(amt); else if (where === "burn") burn(amt);
  return amt;
}
function fromCommons(c, amt) { const a = Math.max(0, Math.min(amt, G.commons)); G.commons -= a; c.cash += a; return a; }

// ---------- Bricks ----------
const level = p => { const x = p.reserve / p.p0; let l = 0; LEVEL_X.forEach((th, i) => { if (x >= th) l = i; }); return l; };
const price = p => p.p0 * (1 + p.supply / 100);
const buyCost = (p, n) => p.p0 * (n + (p.supply * n + n * (n - 1) / 2) / 100);
const sellValue = (p, n) => p.p0 * (n + ((p.supply - n) * n + n * (n - 1) / 2) / 100);
const myBricks = (c, p) => p.h[c.id] || 0;
function brickValue(c) { let v = 0; PROPS.forEach(p => { const n = myBricks(c, p); if (n) v += sellValue(p, n) * (1 - K.sellSpread); }); return v; }
function capFor(c, p, n) { const after = p.supply + n; return Math.max(K.capFree, Math.floor(after * K.capShare)) - myBricks(c, p); }
function maxBuyable(c, p, wantMax, budget) {
  let n = Math.min(wantMax, capFor(c, p, wantMax));
  while (n > 0 && buyCost(p, n) * (1 + K.buyFee) > budget) n--;
  return Math.max(0, n);
}
function buyBricks(c, p, n) {
  if (n <= 0) return 0;
  const cost = buyCost(p, n), fee = cost * K.buyFee;
  c.cash -= cost + fee; p.reserve += cost; p.supply += n; p.h[c.id] = myBricks(c, p) + n;
  burn(cost * K.buyBurn); toCommons(fee - cost * K.buyBurn);
  if (c.taxUntil < G.t) c.taxUntil = G.t + DAY; // new holders start with 1 day of tax covered by the buy fee
  if (inBell()) { G.bellEnd = Math.min(G.bellEnd + 1, G.seasonStartT + K.seasonLen + DAY); G.lastBuyer = c; }
  return cost + fee;
}
function sellBricks(c, p, n) {
  n = Math.min(n, myBricks(c, p)); if (n <= 0) return 0;
  const v = sellValue(p, n), spread = v * K.sellSpread;
  p.reserve -= v; p.supply -= n; p.h[c.id] -= n; if (!p.h[c.id]) delete p.h[c.id];
  c.cash += v - spread; toCommons(spread); return v - spread;
}
function rentOf(p, dice) {
  const l = level(p);
  if (p.d === "util") return (dice || 7) * 20 * LEVEL_MULT[l];
  return p.base * LEVEL_MULT[l];
}
const hotIndex = () => { const day = Math.floor(G.t / DAY); return PROPS[(day * 7 + 3) % PROPS.length].i; };

function payRent(c, p, dice) {
  if (p.supply === 0) return 0;
  let rent = rentOf(p, dice);
  let paid = Math.min(rent, c.cash);
  if (paid < rent) { // auto-sell own Bricks (cheapest first) to cover rent
    const mine = PROPS.filter(q => myBricks(c, q)).sort((a, b) => a.p0 - b.p0);
    for (const q of mine) { while (c.cash < rent && myBricks(c, q)) sellBricks(c, q, 1); }
    paid = Math.min(rent, c.cash);
  }
  c.cash -= paid;
  const holdersPart = paid * K.rentHolders; toCommons(paid - holdersPart);
  const hot = p.i === hotIndex();
  for (const [id, n] of Object.entries(p.h)) {
    const h = byId(+id); let share = holdersPart * n / p.supply;
    if (hot) { const extra = Math.min(share, G.commons); G.commons -= extra; share += extra; }
    if (G.t <= h.taxUntil) { h.unclaimed += share; h.income += share; } else toCommons(share); // unpaid Property Tax: rent goes to the Commons
    if (h === G.me && c !== G.me && share > 0) {
      if (G.t <= h.taxUntil) act("rent", `${c.name} landed on ${p.name} and paid you rent`, share);
      else act("taxlost", `${c.name} landed on ${p.name}, but your Property Tax was unpaid. ${fmt(share)} went to the Commons`, -share);
      if (c.bot && rnd() < 0.03) sendDM(c, G.me, line("rentPaid", p.name));
    }
  }
  if (paid < rent) { c.broke = true; toJail(c); }
  return paid;
}

// ---------- Chog state ----------
const byId = id => G.chogs.find(c => c.id === id);
const prestige = c => clamp(Math.floor((G.t - Math.max(c.lastCash, c.woke)) / DAY) * K.prestigeDay, 0, K.prestigeCap);
const stampPct = c => Math.min(28, c.stamps.size) + districtBonus(c);
function districtBonus(c) {
  let b = 0; const ds = {}; PROPS.forEach(p => { (ds[p.d] = ds[p.d] || []).push(p); });
  for (const d in ds) if (ds[d].every(p => c.stamps.has(p.i)) && ds[d].every(p => (G.t - (c.stampAt?.[p.i] ?? G.t)) >= 7 * DAY)) b += 5;
  return b;
}
const claimMult = c => 1 + (prestige(c) + stampPct(c) + TIER_BONUS[c.tier]) / 100;
const hypeActive = c => G.t < c.hypeUntil ? c.hypeMult : 1;
const positionsValue = c => Object.values(c.pos_).reduce((a, b) => a + b, 0);
const appraisal = c => c.cash + c.unclaimed + brickValue(c) + positionsValue(c) + c.jar;
function exitTax(c) { const weeks = Math.floor((G.t - Math.max(c.lastCash, c.woke)) / (7 * DAY)); return clamp(K.exitBase - weeks, K.exitFloor, K.exitBase); }
function totalCash() { return G.chogs.reduce((a, c) => a + c.cash, 0); }
function dailyCapLeft() { const d = Math.floor(G.t / DAY); if (d !== G.cashDay) { G.cashDay = d; G.cashedToday = 0; } return Math.max(0, totalCash() * K.dailyCapPct - G.cashedToday); }
function moodOf(c) {
  if (c.broke) return "Broke";
  if (G.t > c.taxUntil && brickValue(c) > 0) return "Tired";
  const rank = [...G.chogs].sort((a, b) => appraisal(b) - appraisal(a)).indexOf(c);
  if (rank === 0) return "Tycoon";
  if (G.t < c.hypeUntil) return "Flexing";
  if (c.prevIncome && (c.lastIncome > c.prevIncome * 2 || c.lastIncome * 2 < c.prevIncome)) return "Chaotic";
  if (c.lastIncome >= c.prevIncome && c.lastIncome > 0) return "Smug";
  return "Chill";
}

function claim(c) {
  const base = c.unclaimed; if (base <= 0) return 0;
  const want = base * (claimMult(c) - 1);
  const bonus = Math.max(0, Math.min(want, G.commons * 0.1)); // bonuses only from Commons surplus
  G.commons -= bonus;
  let hype = 0;
  if (hypeActive(c) > 1) { hype = Math.min(base * (hypeActive(c) - 1), c.jar); c.jar -= hype; }
  c.unclaimed = 0; c.cash += base + bonus + hype;
  c.prevIncome = c.lastIncome; c.lastIncome = base;
  return base + bonus + hype;
}
function prepayTax(c, days) {
  const bv = brickValue(c); if (bv <= 0) { c.taxUntil = Math.max(c.taxUntil, G.t + days * DAY); return 0; }
  const start = Math.max(c.taxUntil, G.t), end = Math.min(start + days * DAY, G.t + K.taxPrepayMax);
  const dd = (end - start) / DAY; if (dd <= 0) return 0;
  const cost = bv * K.propTaxDay * dd; if (cost > c.cash) return -1;
  c.cash -= cost; toCommons(cost); c.taxUntil = end; return cost;
}

// ---------- movement & landing ----------
function toJail(c) { c.pos = 10; c.jail = 3; c.doubles = 0; }
function passGo(c) {
  const amt = Math.min(K.goCap, brickValue(c) * K.goPct);
  const got = fromCommons(c, amt);
  if (c === G.me) log(`Passed GENESIS: +${fmt(got)} (1% of your Bricks).`, "me");
}
function moveTo(c, target, collect) { if (collect && target < c.pos) passGo(c); c.pos = target; land(c, 0, true); }

function land(c, dice, viaCard) {
  const s = SQ[c.pos]; const me = c === G.me; const out = { s, rent: 0, bought: 0, note: "" };
  if (s.t === "prop") {
    const p = s;
    const othersOwn = p.supply - myBricks(c, p) > 0;
    if (p.supply > 0) {
      out.rent = payRent(c, p, dice);
      if (out.rent > 0 && othersOwn) {
        out.note = `${c.name} paid ${fmt(out.rent)} rent on ${p.name}`;
        if (me) floatAt(p.i, `-${fmt(out.rent)}`, true);
        if (G.me && !me && myBricks(G.me, p)) floatAt(p.i, `RENT +${fmt(out.rent * K.rentHolders * myBricks(G.me, p) / p.supply)}`);
      }
    }
    if (!c.broke) { // roll plan buys Bricks (committed before the dice)
      const plan = { safe: { max: 3, keep: 0.5, lvl: 1 }, balanced: { max: 6, keep: 0.25, lvl: 9 }, degen: { max: 15, keep: 0, lvl: 9 } }[c.plan];
      const fairOk = !p.fair || appraisal(c) < K.fairStartMax;
      if (fairOk && level(p) <= plan.lvl) {
        const budget = c.cash * (1 - plan.keep);
        const n = maxBuyable(c, p, plan.max, budget);
        if (n > 0) { buyBricks(c, p, n); out.bought = n; }
      } else if (!fairOk && me) out.note += (out.note ? ". " : "") + "Fair Start street: only Chogs under 50k can buy here";
    }
  } else if (s.t === "go" && !viaCard) { /* passing handled in move */ }
  else if (s.t === "tax") { const a = s.name === "MEV Tax" ? K.mevTax : Math.min(K.gasTaxCap, c.cash * K.gasTaxPct); out.note = `${c.name} paid ${fmt(payTo(c, a, "lounge"))} ${s.name}`; }
  else if (s.t === "lounge") { const w = G.lounge * K.loungeWin; G.lounge -= w; c.cash += w; out.note = `${c.name} won ${fmt(w)} at the NAD LOUNGE`; if (me) floatAt(20, `+${fmt(w)}`); }
  else if (s.t === "gojail") { toJail(c); out.note = `${c.name} GOT RUGGED and went to Rug Jail`; }
  else if (s.t === "chance" || s.t === "chest") {
    const deck = s.t === "chance" ? ENTROPY : CHEST; const card = deck[ri(deck.length)];
    out.note = `${c.name} drew ${s.t === "chance" ? "Market News" : "Commons Chest"}: ${card[0]}`; out.card = card[0]; out.deck = s.t === "chance" ? "Market News" : "Commons Chest";
    if (!viaCard) card[1](c);
  } else if (s.t === "heist") { out.heist = true; }
  return out;
}

function step(c, n) { for (let k = 0; k < n; k++) { c.pos = (c.pos + 1) % 40; if (c.pos === 0) passGo(c); } }

function refill(c) {
  const cap = K.rollCap + (c.tier !== "Common" ? 1 : 0);
  c.rollAcc += G.tick || 0;
  while (c.rollAcc >= K.rollEvery) { c.rollAcc -= K.rollEvery; if (c.rolls < cap) c.rolls++; }
}

// ---------- bots ----------
function botTurn(c) {
  if (c.rolls <= 0) return;
  c.rolls--; c.rollsSeason++;
  if (c.cash < 800) { const top = 6000 + ri(8000); c.cash += top; G.inflow += top; c.broke = false; }
  const d1 = 1 + ri(6), d2 = 1 + ri(6);
  if (c.jail > 0) { if (d1 === d2 || c.jail === 1 || c.jailCard) { c.jail = 0; c.jailCard = false; } else { c.jail--; return; } }
  step(c, d1 + d2);
  const r = land(c, d1 + d2);
  if (r.note && (r.rent > 300 || /LOUNGE|RUGGED|won/.test(r.note))) log(r.note);
  if (r.heist) botHeist(c);
  if (c.unclaimed > 600) claim(c);
  if (c.taxUntil < G.t + DAY) prepayTax(c, 2);
  if (rnd() < 0.05) { const t = G.chogs[ri(G.chogs.length)]; if (t !== c) hype(c, t, 150 + ri(250), true); }
  if (rnd() < 0.01 && c.cash > 8000) botCashOut(c);
}
function botHeist(c) {
  const opts = G.chogs.filter(t => t !== c && t.unclaimed >= K.heistMinUnclaimed && G.t >= t.immuneUntil);
  if (!opts.length) return; const t = opts[ri(opts.length)]; heist(c, t);
}
function botCashOut(c) {
  const amt = Math.min(c.cash * 0.3, dailyCapLeft()); if (amt < 500) return;
  const taxR = exitTax(c) / 100, tax = amt * taxR; c.cash -= amt;
  G.commons += tax * 0.5; burn(tax * 0.25); G.season += tax * 0.25; G.cashedToday += amt; G.outflow += amt - tax; c.lastCash = G.t;
  log(`${c.name} cashed out ${fmt(amt)}: paid ${fmt(tax)} exit tax, Prestige reset to 0.`, "bad");
}
function hype(from, to, amt, isBot) {
  amt = Math.min(amt, from.cash); if (amt < 50) return false;
  if (from === to) return false;
  from.cash -= amt; const b = amt * K.hypeBurn; burn(b); to.jar += amt - b;
  to.hypeMult = Math.min(K.hypeMax, (G.t < to.hypeUntil ? to.hypeMult : 1) + K.hypeStep); to.hypeUntil = G.t + K.hypeDur;
  if (to === G.me) { log(`${from.name} hyped you with ${fmt(amt)} $CHOG. Claims ×${to.hypeMult.toFixed(2)} for 4h.`, "me"); act("hype", `${from.name} hyped you. Your claims are boosted ×${to.hypeMult.toFixed(2)} for 4 hours`, amt - b); }
  else if (!isBot) log(`You hyped ${to.name} with ${fmt(amt)} $CHOG (${fmt(b)} burned).`, "me");
  return true;
}
function heist(r, t) {
  let chance = K.heistBase + (isLaser(r) ? 5 : 0) + (isHeistHat(r) ? 5 : 0) - TIER_DEF[t.tier] - t.guards * 5 - (isVisor(t) ? 5 : 0);
  chance = clamp(chance, 10, 80);
  const win = rnd() * 100 < chance;
  if (win) { const s = t.unclaimed * K.heistSteal; t.unclaimed -= s; r.cash += s; log(`HEIST: ${r.name} robbed ${fmt(s)} of ${t.name}'s unclaimed rent (${chance}% odds).`, t === G.me || r === G.me ? "bad" : ""); if (t === G.me) act("heist", `${r.name} robbed your unclaimed rent. Claim often, or hire guards`, -s); return { win, chance, amt: s }; }
  const f = Math.min(K.heistFine, r.cash); r.cash -= f; t.cash += f; t.warden += 20; toJail(r);
  log(`HEIST FAILED: ${t.name}'s guards caught ${r.name}. Fine ${fmt(f)} paid to ${t.name}.`, t === G.me || r === G.me ? "me" : "");
  if (t === G.me) { act("guard", `${r.name} tried to rob you. Your guards caught them and you got their fine`, f); if (r.bot && rnd() < 0.5) sendDM(r, G.me, line("caught")); }
  return { win, chance, amt: f };
}

// ---------- time ----------
function inBell() { return G.bellEnd !== null; }
function advance(mins) {
  for (let m = 0; m < mins; m += 10) {
    G.t += 10; G.tick = 10;
    G.chogs.forEach(refill);
    if (G.me && G.me.autoTax && G.me.taxUntil < G.t + 6 * HOUR) prepayTax(G.me, 1);
    G.chogs.forEach(c => { if (c.bot && rnd() < c.act * 0.22) botTurn(c); });
    G.chogs.forEach(c => { c.queue.forEach(q => { if (!q.ready && G.t >= q.at) { q.ready = true; if (c === G.me) { log(`Cash-out of ${fmt(q.net)} is ready to claim.`, "me"); act("cashout", "Your cash-out is ready. Claim it in the Bank", q.net); } } }); });
    G.chogs.forEach(c => { if (c.bot && c.pendingReply && G.t >= c.pendingReply.at) { c.pendingReply = null; sendDM(c, G.me, line("reply")); } });
    if (G.me && rnd() < 0.004) { const b = G.chogs.filter(x => x.bot)[ri(G.chogs.length - 1)]; if (b) { const shared = PROPS.find(p => myBricks(G.me, p) && myBricks(b, p)); sendDM(b, G.me, shared ? line("neighbour", shared.name) : line("hello")); } }
    const end = G.seasonStartT + K.seasonLen;
    if (!inBell() && G.t >= end - DAY) { G.bellEnd = end; log("The CLOSING BELL is ringing. Every Brick buy adds 1 minute. Last buyer when it hits zero wins 10% of the season pot.", "me"); act("bell", "The Closing Bell started: the season ends within 24 hours. The last Brick buyer wins 10% of the season pot"); }
    if (inBell() && G.t >= G.bellEnd) endSeason();
  }
  G.tick = 0;
}
// Season-end wealth tax: the bottom quarter of active Chogs (5+ rolls, awake 3+ days) pays 5% of its cash into the pot, which then pays the top.
function wealthTax() {
  const eligible = G.chogs.filter(c => c.rollsSeason >= 5 && G.t - c.woke >= 3 * DAY && !c.bankrupt);
  const ranked = [...eligible].sort((a, b) => appraisal(a) - appraisal(b));
  const bottom = ranked.slice(0, Math.floor(eligible.length / 4));
  let total = 0;
  bottom.forEach(c => { const x = c.cash * 0.05; c.cash -= x; G.season += x; total += x; if (c === G.me) act("wealthtax", `Season ended with you in the bottom quarter. You paid 5% of your cash to the season pot`, -x); });
  if (total) log(`Wealth tax: the bottom ${bottom.length} Chogs paid ${fmt(total)} into the season pot.`);
  return bottom;
}
function endSeason() {
  wealthTax();
  const pot = G.season; const ranked = [...G.chogs].sort((a, b) => (appraisal(b) - b.seasonAppraisal) - (appraisal(a) - a.seasonAppraisal));
  const top = ranked.slice(0, 10); const tw = top.reduce((a, _, i) => a + (10 - i), 0);
  top.forEach((c, i) => { c.cash += pot * 0.4 * (10 - i) / tw; });
  const active = G.chogs.filter(c => c.rollsSeason >= 20); active.forEach(c => { c.cash += pot * 0.3 / Math.max(1, active.length); });
  const wardens = [...G.chogs].sort((a, b) => b.warden - a.warden).slice(0, 3).filter(c => c.warden > 0);
  wardens.forEach(c => { c.cash += pot * 0.15 / wardens.length; }); if (!wardens.length) G.commons += pot * 0.15;
  if (G.lastBuyer) G.lastBuyer.cash += pot * 0.1; else G.commons += pot * 0.1;
  ranked[0].cash += pot * 0.05;
  if (!active.length) G.commons += pot * 0.3;
  const gold = ranked[0]; G.golden = gold;
  log(`SEASON ${G.seasonNo} ENDED. ${gold.name} is the Golden Chog. Closing Bell winner: ${G.lastBuyer ? G.lastBuyer.name : "nobody"}. ${fmt(pot)} paid out.`, "me");
  G.season = 0; G.seasonNo++; G.seasonStartT = G.t; G.bellEnd = null; G.lastBuyer = null;
  G.chogs.forEach(c => { c.seasonAppraisal = appraisal(c); c.rollsSeason = 0; c.warden = 0; });
  if (G.me) { const rank = ranked.indexOf(G.me) + 1; act("season", `Season ${G.seasonNo - 1} ended. You finished #${rank} of ${ranked.length}${G.lastBuyer === G.me ? ", and you won the Closing Bell" : ""}`); toast(`Season ${G.seasonNo - 1} is over. You finished #${rank}.`); }
}

