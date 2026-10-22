"use strict";
/* ============ The Chog of Wall Street, Practice City: rules engine + UI (play money) ============ */
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
  monToChog: 2500, // practice rate only
};
const LEVEL_X = [0, 10, 40, 120, 300, 700];      // reserve ÷ base price thresholds
const LEVEL_MULT = [1, 2, 4, 7, 11, 16];
const LEVEL_NAME = ["Empty lot", "Cottage", "Shop", "Tower", "Skyscraper", "Neon landmark"];
const TIER_BONUS = { Common: 0, Uncommon: 3, Rare: 6, Epic: 8, Legendary: 10 };
const TIER_DEF = { Common: 0, Uncommon: 5, Rare: 10, Epic: 15, Legendary: 20 };

const D = {
  brown: { c: "var(--d-brown)", n: "Launchpads", p0: 40, rent: 60 },
  lblue: { c: "var(--d-lblue)", n: "NFTs & names", p0: 60, rent: 90 },
  pink: { c: "var(--d-pink)", n: "Payments", p0: 90, rent: 130 },
  orange: { c: "var(--d-orange)", n: "Prediction", p0: 120, rent: 170 },
  red: { c: "var(--d-red)", n: "Perps", p0: 160, rent: 220 },
  yellow: { c: "var(--d-yellow)", n: "Yield", p0: 200, rent: 270 },
  green: { c: "var(--d-green)", n: "Lending", p0: 250, rent: 330 },
  dblue: { c: "var(--d-dblue)", n: "DEX blue chips", p0: 320, rent: 450 },
  station: { c: "var(--d-station)", n: "LST station", p0: 180, rent: 200 },
  util: { c: "var(--d-util)", n: "Oracle", p0: 150, rent: 0 },
};
const ECO = "https://www.monad.xyz/ecosystem";
// q: [tier, kind, text]   kind: swap (MON→$CHOG into the Chog), stake (MON→LST), deposit (USDC→vault), visit (proof-of-visit receipt)
const SQ = [
  { t: "go", name: "GENESIS", sub: "Collect 1% of your Bricks" },
  { t: "prop", d: "brown", name: "nad.fun Lane", dapp: "nad.fun", url: "https://nad.fun", q: ["A", "swap", "Buy any nad.fun token with 0.5 MON from your Chog"], fair: true },
  { t: "chest", name: "Commons Chest" },
  { t: "prop", d: "brown", name: "Chog Alley", dapp: "$CHOG pool", url: "https://nad.fun", q: ["A", "swap", "Swap 1 MON → $CHOG straight into your Chog"], fair: true },
  { t: "tax", name: "Gas Tax", sub: "5% of cash" },
  { t: "prop", d: "station", name: "FastLane Station", dapp: "FastLane shMON", url: "https://www.fastlane.xyz", q: ["A", "stake", "Stake 0.5 MON → shMON in your Chog's vault"] },
  { t: "prop", d: "lblue", name: "OpenSea Ave", dapp: "OpenSea", url: "https://opensea.io", q: ["B", "visit", "Buy or list any Monad NFT"] },
  { t: "chance", name: "Entropy" },
  { t: "prop", d: "lblue", name: "Magic Eden Way", dapp: "Magic Eden", url: "https://magiceden.io", q: ["B", "visit", "Buy or list any Monad NFT"] },
  { t: "prop", d: "lblue", name: "Nad Names St", dapp: "Nad Name Service", url: ECO, q: ["B", "visit", "Register a .nad name for your Chog's vault"] },
  { t: "jail", name: "RUG JAIL", sub: "Just visiting" },
  { t: "prop", d: "pink", name: "Rain St", dapp: "Rain", url: ECO, q: ["A", "deposit", "Hold 5 USDC in your Chog's vault"] },
  { t: "prop", d: "util", name: "Pyth Entropy Works", dapp: "Pyth", url: "https://pyth.network", q: ["B", "visit", "Pyth powers the dice. Read a price feed on Monad"] },
  { t: "prop", d: "pink", name: "MetaMask Ct", dapp: "MetaMask", url: "https://metamask.io", q: ["B", "visit", "Bridge or onramp to Monad"] },
  { t: "prop", d: "pink", name: "Portal Pl", dapp: "Portal", url: ECO, q: ["B", "visit", "Make a payment through Portal"] },
  { t: "prop", d: "station", name: "Magma Station", dapp: "Magma gMON", url: ECO, q: ["A", "stake", "Stake 0.5 MON → gMON in your Chog's vault"] },
  { t: "prop", d: "orange", name: "Kalshi Row", dapp: "Kalshi", url: "https://kalshi.com", q: ["B", "visit", "Deposit on Monad"] },
  { t: "chest", name: "Commons Chest" },
  { t: "prop", d: "orange", name: "Polymarket Sq", dapp: "Polymarket", url: "https://polymarket.com", q: ["B", "visit", "Deposit on Monad"] },
  { t: "prop", d: "orange", name: "Kizzy Ct", dapp: "Kizzy", url: ECO, q: ["B", "visit", "Make a prediction"] },
  { t: "lounge", name: "NAD LOUNGE", sub: "Win 25% of the pot" },
  { t: "prop", d: "red", name: "Perpl Pit", dapp: "Perpl", url: ECO, q: ["B", "visit", "Open and close a $5 position"] },
  { t: "chance", name: "Entropy" },
  { t: "prop", d: "red", name: "Obsidian Ave", dapp: "Obsidian", url: ECO, q: ["B", "visit", "Open and close a position"] },
  { t: "prop", d: "red", name: "Narwhal Wharf", dapp: "Narwhal", url: ECO, q: ["B", "visit", "Open and close a position"] },
  { t: "prop", d: "station", name: "aPriori Station", dapp: "aPriori aprMON", url: ECO, q: ["A", "stake", "Stake 0.5 MON → aprMON in your Chog's vault"] },
  { t: "prop", d: "yellow", name: "Pendle Gardens", dapp: "Pendle", url: "https://app.pendle.finance", q: ["B", "visit", "Buy any PT on Monad"] },
  { t: "prop", d: "yellow", name: "Maple Grove", dapp: "Maple syrupUSDC", url: "https://maple.finance", q: ["A", "deposit", "Deposit 5 USDC (ERC-4626 vault)"] },
  { t: "prop", d: "util", name: "Chainlink Data Works", dapp: "Chainlink", url: "https://chain.link", q: ["B", "visit", "Read a Chainlink feed on Monad"] },
  { t: "prop", d: "yellow", name: "Ethena Heights", dapp: "Ethena sUSDe", url: "https://ethena.fi", q: ["A", "deposit", "Stake USDe → sUSDe (ERC-4626)"] },
  { t: "gojail", name: "GOT RUGGED", sub: "Go to Rug Jail" },
  { t: "prop", d: "green", name: "Curvance Rd", dapp: "Curvance", url: "https://curvance.com", q: ["B", "visit", "Supply 5 USDC or 0.5 MON"] },
  { t: "prop", d: "green", name: "Euler Ct", dapp: "Euler", url: "https://www.euler.finance", q: ["A", "deposit", "Supply to an Euler vault (ERC-4626)"] },
  { t: "heist", name: "HEIST", sub: "Rob unclaimed rent" },
  { t: "prop", d: "green", name: "Neverland Park", dapp: "Neverland", url: ECO, q: ["B", "visit", "Supply to Neverland"] },
  { t: "prop", d: "station", name: "Kintsu Station", dapp: "Kintsu sMON", url: ECO, q: ["A", "stake", "Stake 0.5 MON → sMON in your Chog's vault"] },
  { t: "chance", name: "Entropy" },
  { t: "prop", d: "dblue", name: "Uniswap Boardwalk", dapp: "Uniswap", url: "https://app.uniswap.org", q: ["A", "swap", "Swap 1 MON → $CHOG on Uniswap, into your Chog"] },
  { t: "tax", name: "MEV Tax", sub: "Pay 750" },
  { t: "prop", d: "dblue", name: "Kuru Tower", dapp: "Kuru", url: "https://www.kuru.io", q: ["A", "swap", "Swap 1 MON → $CHOG on Kuru, into your Chog"] },
];
SQ.forEach((s, i) => { s.i = i; if (s.t === "prop") { s.p0 = D[s.d].p0; s.base = D[s.d].rent; s.supply = 0; s.reserve = 0; s.h = {}; } });
const PROPS = SQ.filter(s => s.t === "prop");

const ENTROPY = [
  ["Advance to Kuru Tower.", c => moveTo(c, 39, true)],
  ["Front-run by MEV. Pay 300 to the Nad Lounge.", c => payTo(c, 300, "lounge")],
  ["Pyth rolled lucky. +1 free roll.", c => { c.rolls++; }],
  ["Liquidated on Perpl. Pay 5% of cash (max 800) to the Nad Lounge.", c => payTo(c, Math.min(800, c.cash * 0.05), "lounge")],
  ["Morpho vault payday. Collect 300 from the Commons.", c => fromCommons(c, 300)],
  ["Rugged. Go straight to Rug Jail.", c => toJail(c)],
  ["Clober order filled. Advance to the next Station.", c => { const st = [5, 15, 25, 35].find(x => x > c.pos) ?? 5; moveTo(c, st, true); }],
  ["Airdrop season. Collect 200 from the Commons.", c => fromCommons(c, 200)],
];
const CHEST = [
  ["Prosperity. Collect 1% of the Commons (max 1,000).", c => fromCommons(c, Math.min(1000, G.commons * 0.01))],
  ["Advance to GENESIS.", c => moveTo(c, 0, true)],
  ["Get out of Rug Jail free. Keep this card.", c => { c.jailCard = true; }],
  ["Atlantis LP fees. Collect 150 from the Commons.", c => fromCommons(c, 150)],
  ["Vet bill for your Chog's horns. Pay 100 to the Nad Lounge.", c => payTo(c, 100, "lounge")],
  ["Your Chog went viral. +1 free roll.", c => { c.rolls++; }],
];

// ---------- world state ----------
const G = {
  t: 0, commons: 60000, lounge: 4000, season: 0, sleep: 0, burned: 0, inflow: 0, outflow: 0,
  seasonNo: 1, seasonStartT: 0, bellEnd: null, lastBuyer: null, golden: null, cashedToday: 0, cashDay: 0,
  me: null, chogs: [], feed: [], plan: "balanced", busy: false, speed: 1, tab: "chog", sheet: null,
  wallet: { chog: 100000, mon: 40, usdc: 50 },
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
    out.note = `${c.name} drew ${s.t === "chance" ? "Entropy" : "Commons Chest"}: ${card[0]}`; out.card = card[0];
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
  if (to === G.me) log(`${from.name} hyped you with ${fmt(amt)} $CHOG. Claims ×${to.hypeMult.toFixed(2)} for 4h.`, "me");
  else if (!isBot) log(`You hyped ${to.name} with ${fmt(amt)} $CHOG (${fmt(b)} burned).`, "me");
  return true;
}
function heist(r, t) {
  let chance = K.heistBase + (isLaser(r) ? 5 : 0) + (isHeistHat(r) ? 5 : 0) - TIER_DEF[t.tier] - t.guards * 5 - (isVisor(t) ? 5 : 0);
  chance = clamp(chance, 10, 80);
  const win = rnd() * 100 < chance;
  if (win) { const s = t.unclaimed * K.heistSteal; t.unclaimed -= s; r.cash += s; log(`HEIST: ${r.name} robbed ${fmt(s)} of ${t.name}'s unclaimed rent (${chance}% odds).`, t === G.me || r === G.me ? "bad" : ""); return { win, chance, amt: s }; }
  const f = Math.min(K.heistFine, r.cash); r.cash -= f; t.cash += f; t.warden += 20; toJail(r);
  log(`HEIST FAILED: ${t.name}'s guards caught ${r.name}. Fine ${fmt(f)} paid to ${t.name}.`, t === G.me || r === G.me ? "me" : "");
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
    G.chogs.forEach(c => { c.queue.forEach(q => { if (!q.ready && G.t >= q.at) { q.ready = true; if (c === G.me) log(`Cash-out of ${fmt(q.net)} is ready to claim.`, "me"); } }); });
    const end = G.seasonStartT + K.seasonLen;
    if (!inBell() && G.t >= end - DAY) { G.bellEnd = end; log("The CLOSING BELL is ringing. Every Brick buy adds 1 minute. Last buyer when it hits zero wins 10% of the season pot.", "me"); }
    if (inBell() && G.t >= G.bellEnd) endSeason();
  }
  G.tick = 0;
}
function endSeason() {
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
  if (G.me) toast(`Season ${G.seasonNo - 1} is over. ${gold === G.me ? "You are the Golden Chog!" : gold.name + " is the Golden Chog."}`);
}

// ---------- my actions ----------
async function rollMe() {
  const c = G.me; if (!c || G.busy) return;
  closeSheet();
  if (c.rolls <= 0) {
    if (c.cash < K.extraRoll) return toast("No rolls left and not enough cash for an extra roll.");
    payTo(c, K.extraRoll * 0.5, "burn"); payTo(c, K.extraRoll * 0.5, "lounge"); c.rolls++;
    log(`Bought an extra roll for ${K.extraRoll} $CHOG (half burned, half to the Nad Lounge).`, "me");
  }
  G.busy = true; c.rolls--; c.rollsSeason++; c.plan = G.plan; c.broke = false;
  const d1 = 1 + ri(6), d2 = 1 + ri(6);
  await showDice(d1, d2);
  if (c.jail > 0) {
    if (d1 === d2 || c.jailCard) { c.jail = 0; if (c.jailCard && d1 !== d2) c.jailCard = false; log("You walked out of Rug Jail.", "me"); }
    else { c.jail--; log(c.jail ? `No doubles. ${c.jail} tries left in Rug Jail.` : "No doubles. You serve your time: next roll you're free.", "me"); if (!c.jail) c.jail = 0; G.busy = false; render(); return window.Guide?.on("rolled", { jail: true }); }
  }
  c.doubles = d1 === d2 ? (c.doubles || 0) + 1 : 0;
  if (c.doubles === 3) { toJail(c); log("Three doubles in a row. Straight to Rug Jail.", "bad"); G.busy = false; render(); return window.Guide?.on("rolled", { jail: true }); }
  await hop(c, d1 + d2);
  const r = land(c, d1 + d2);
  flashTile(c.pos);
  let msg = `Rolled ${d1}+${d2} → ${SQ[c.pos].name}.`;
  if (r.rent) msg += ` Paid ${fmt(r.rent)} rent.`;
  if (r.bought) { msg += ` Your ${G.plan} plan bought ${r.bought} Bricks.`; floatAt(c.pos, `+${r.bought} BRICKS`); }
  if (r.note && !r.rent) msg += ` ${r.note.replace(c.name + " ", "You ")}.`;
  if (c.doubles) { c.rolls++; msg += " Doubles: free roll!"; }
  log(msg, "me"); $("#lastev").textContent = msg;
  G.busy = false; render();
  if (r.card) openCard(/Entropy/.test(r.note) ? "Entropy card" : "Commons Chest", r.card);
  else if (SQ[c.pos].t === "prop") openTile(c.pos, true);
  else if (r.heist) openHeist();
  window.Guide?.on("rolled", { r, pos: c.pos, sq: SQ[c.pos], jail: c.jail > 0 });
}

function doQuest(i) {
  const c = G.me, s = SQ[i], [tier, kind] = s.q; const day = Math.floor(G.t / DAY);
  if (kind === "swap") {
    if (G.wallet.mon < 1) return toast("Your practice wallet is out of MON.");
    G.wallet.mon -= 1; const got = K.monToChog * (0.97 + rnd() * 0.04); c.cash += got; G.inflow += got;
    log(`Quest at ${s.name}: swapped 1 MON → ${fmt(got)} $CHOG on ${s.dapp}, straight into your Chog.`, "me");
  } else if (kind === "stake") {
    if (G.wallet.mon < 0.5) return toast("Your practice wallet is out of MON.");
    G.wallet.mon -= 0.5; c.pos_[s.dapp] = (c.pos_[s.dapp] || 0) + 0.5 * K.monToChog;
    log(`Quest at ${s.name}: staked 0.5 MON → ${s.dapp.split(" ")[1]} inside your Chog's vault (locked 7 days).`, "me");
  } else if (kind === "deposit") {
    if (G.wallet.usdc < 5) return toast("Your practice wallet is out of USDC.");
    G.wallet.usdc -= 5; c.pos_[s.dapp] = (c.pos_[s.dapp] || 0) + 5 * 862; // ≈ $5 in $CHOG at $0.00116
    log(`Quest at ${s.name}: deposited 5 USDC into ${s.dapp} from your Chog's vault.`, "me");
  } else {
    log(`Quest at ${s.name}: proof-of-visit receipt for ${s.dapp} accepted (signed voucher, simulated).`, "me");
  }
  const first = !c.stamps.has(i); c.stamps.add(i); (c.stampAt = c.stampAt || {})[i] = c.stampAt?.[i] ?? G.t;
  if (c.qday[i] !== day) { c.qday[i] = day; c.rolls++; }
  toast(first ? `New Patron Stamp: ${s.dapp}. +1% claim weight and +1 free roll.` : `Quest done again today: +1 free roll.`);
  openTile(i, true); render(); window.Guide?.on("quest", { i, first });
}

function openHeist() {
  const opts = G.chogs.filter(t => t !== G.me && t.unclaimed >= K.heistMinUnclaimed && G.t >= t.immuneUntil).sort((a, b) => b.unclaimed - a.unclaimed).slice(0, 6);
  const me = G.me;
  sheet(`<div class="band" style="background:var(--bad)"></div><h3>HEIST</h3>
  <p class="sub">Pick a Chog. On success you take 10% of its <b>unclaimed</b> rent. On failure you pay a 500 fine to it and go to Rug Jail. Cash and Bricks are never at risk.</p>
  <div class="targets">${opts.length ? opts.map(t => { const ch = clamp(K.heistBase + (isLaser(me) ? 5 : 0) + (isHeistHat(me) ? 5 : 0) - TIER_DEF[t.tier] - t.guards * 5 - (isVisor(t) ? 5 : 0), 10, 80);
    return `<button data-heist="${t.id}"><i style="background-image:url(${t.img})"></i><span><b>${t.name}</b><br><small>${t.tier} · ${t.guards} guards · ${fmt(t.unclaimed)} unclaimed</small></span><span class="num">${ch}%</span></button>`; }).join("") : `<p class="sub">Nobody has 500+ unclaimed rent right now. The heist crew goes home.</p>`}</div>
  <button class="btn ghost" style="color:var(--ink);border-color:var(--ink)" data-close>Walk away</button>`);
  window.Guide?.on("heistOpen");
}
function openCard(title, text) {
  sheet(`<div class="band" style="background:var(--chog)"></div><h3>${title}</h3><p style="margin:0;font-size:16px">${text}</p><p class="sub">Card draws use the roll's random seed (Pyth Entropy epoch on mainnet).</p><button class="btn gold" data-close>OK</button>`);
  window.Guide?.on("card");
}

function openTile(i, landed) {
  const s = SQ[i], c = G.me;
  if (s.t !== "prop") {
    const desc = { go: "Every time you pass, collect 1% of your Bricks' value (max 500) from the Commons surplus. Own nothing, earn nothing.", chest: "Commons Chest: Magie's Prosperity cards, paid from the Commons.", chance: "Entropy cards (Pyth Entropy on mainnet).", tax: s.name === "Gas Tax" ? "Pay 5% of cash (max 1,000) into the Nad Lounge pot." : "Pay 750 into the Nad Lounge pot.", jail: "Rug Jail: roll doubles (3 tries), pay 500 bail, or use a card. Inmate and Prisoner Chogs need one try fewer.", lounge: `Land here to win 25% of the Nad Lounge pot (now ${fmt(G.lounge)}).`, gojail: "Go straight to Rug Jail without passing GENESIS.", heist: "Pick a Chog and rob 10% of its unclaimed rent. Guards, tier and visor eyes defend it." }[s.t];
    return sheet(`<div class="band" style="background:var(--gold)"></div><h3>${s.name}</h3><p style="margin:0">${desc}</p><button class="btn gold" data-close>Close</button>`);
  }
  const p = s, n = myBricks(c, p), lvl = level(p), hot = p.i === hotIndex();
  const holders = Object.entries(p.h).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, k]) => { const h = byId(+id); return `<span><i style="background-image:url(${h.img})"></i>${h === c ? "You" : h.name} · ${Math.round(k / p.supply * 100)}%</span>`; }).join("");
  const [tier, kind, text] = p.q; const done = c.stamps.has(i); const today = c.qday[i] === Math.floor(G.t / DAY);
  const here = c.pos === i;
  const action = kind === "swap" ? "Swap 1 MON (practice)" : kind === "stake" ? "Stake 0.5 MON (practice)" : kind === "deposit" ? "Deposit 5 USDC (practice)" : "Submit receipt (practice)";
  sheet(`<div class="band" style="background:${D[p.d].c}"></div>
  <h3>${p.name}${hot ? ' <span class="pill warn">Hot ×2 today</span>' : ""}</h3>
  <p class="sub">${D[p.d].n} · ${LEVEL_NAME[lvl]}${p.fair ? " · Fair Start street (Chogs under 50k only)" : ""}</p>
  <dl class="kv">
    <dt>Rent when someone lands</dt><dd>${p.d === "util" ? "dice × " + 20 * LEVEL_MULT[lvl] : fmt(rentOf(p)) + (hot ? " ×2" : "")}</dd>
    <dt>Brick price now</dt><dd>${fmt(price(p))}</dd>
    <dt>Bricks issued</dt><dd>${fmt(p.supply)}</dd>
    <dt>Street reserve</dt><dd>${fmt(p.reserve)}</dd>
    <dt>Your Bricks</dt><dd>${n} ${n ? `(${Math.round(n / p.supply * 100)}%)` : ""}</dd>
  </dl>
  ${holders ? `<div><div class="sub" style="margin-bottom:4px">Owned by these Chogs</div><div class="holders">${holders}</div></div>` : `<p class="sub">No Bricks yet. The first Chog to land here with a buying plan opens the street.</p>`}
  <div class="quest">
    <div class="row sp"><b>Dapp quest · ${p.dapp}</b><span class="pill ${tier === "A" ? "ok" : "tier"}">${tier === "A" ? "On-chain, from your Chog" : "Proof-of-visit"}</span></div>
    <div>${text}.</div>
    <div class="sub">${done ? "Patron Stamp collected." : "First time: a permanent Patron Stamp (+1% claim weight)."} ${today ? "Today's free roll used." : "Once a day: +1 free roll."}</div>
    <div class="row">
      ${here ? `<button class="btn purple sm" data-quest="${i}" ${today && done ? "disabled" : ""}>${action}</button>` : `<span class="sub">Land here to do this quest.</span>`}
      <a class="btn sm" href="${p.url}" target="_blank" rel="noopener">Open ${p.dapp} ↗</a>
    </div>
  </div>
  ${n ? `<div class="row"><button class="btn sm" data-sell="${i}" data-n="1">Sell 1 Brick (+${fmt(sellValue(p, 1) * 0.95)})</button><span class="sub">5% spread goes to the Commons. Cash stays in your Chog.</span></div>` : ""}
  <button class="btn gold" data-close>${landed ? "Keep playing" : "Close"}</button>`);
  window.Guide?.on("tile", { i, landed });
}

function requestCashOut(amt) {
  const c = G.me; amt = Math.min(amt, c.cash, dailyCapLeft()); if (amt < 100) return toast("Nothing to cash out within today's city-wide cap.");
  const r = exitTax(c) / 100, tax = amt * r;
  c.cash -= amt; G.commons += tax * 0.5; burn(tax * 0.25); G.season += tax * 0.25; G.cashedToday += amt;
  const lost = prestige(c); c.lastCash = G.t;
  c.queue.push({ amt, net: amt - tax, at: G.t + K.queue, ready: false });
  window.Guide?.on("cashout");
  log(`You requested a cash-out of ${fmt(amt)}. Exit tax ${fmt(tax)} (${Math.round(r * 100)}%). Prestige +${lost}% reset to 0. Ready in 48h.`, "bad");
  toast(`Cash-out queued. ${fmt(amt - tax)} arrives in your wallet in 48 hours.`); render();
}
function claimCashOuts() {
  const c = G.me; let tot = 0; c.queue = c.queue.filter(q => { if (q.ready) { tot += q.net; return false; } return true; });
  if (tot) { G.wallet.chog += tot; G.outflow += tot; log(`${fmt(tot)} $CHOG arrived in your practice wallet.`, "me"); }
  render();
}

// ---------- UI ----------
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function drawDie(el, v) { el.innerHTML = Array.from({ length: 9 }, (_, k) => `<b class="${PIPS[v].includes(k) ? "v" : ""}"></b>`).join(""); }
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
async function showDice(a, b) {
  const d1 = $("#d1"), d2 = $("#d2");
  for (let k = 0; k < 5; k++) { drawDie(d1, 1 + ri(6)); drawDie(d2, 1 + ri(6)); await sleep(70); }
  d1.classList.remove("roll"); d2.classList.remove("roll"); void d1.offsetWidth; d1.classList.add("roll"); d2.classList.add("roll");
  drawDie(d1, a); drawDie(d2, b); await sleep(450);
}
async function hop(c, n) { for (let k = 0; k < n; k++) { step(c, 1); renderPawns(); await sleep(110); } }

function gridPos(i) {
  if (i <= 10) return [11, 11 - i];
  if (i <= 20) return [11 - (i - 10), 1];
  if (i <= 30) return [1, 1 + (i - 20)];
  return [1 + (i - 30), 11];
}
function buildBoard() {
  const b = $("#board");
  SQ.forEach((s, i) => {
    const el = document.createElement("button"); el.className = "tile"; el.id = "t" + i; el.type = "button";
    const [r, col] = gridPos(i); el.style.gridRow = r; el.style.gridColumn = col;
    el.setAttribute("aria-label", s.name);
    const side = i > 10 && i < 20 ? "side-l" : i > 30 ? "side-r" : "";
    if (["go", "jail", "lounge", "gojail"].includes(s.t)) { el.classList.add("corner"); el.innerHTML = `<div class="cn">${s.name}</div><div class="cs">${s.sub}</div><div class="pawns"></div>`; }
    else if (s.t === "prop") { if (side) el.classList.add(side); el.innerHTML = `<div class="band" style="background:${D[s.d].c}"></div><div class="body"><div class="tn">${s.name}</div><div class="lv"></div><div class="tp"></div></div><div class="pawns"></div>`; }
    else { el.classList.add("special"); if (side) el.classList.add(side); el.innerHTML = `<div class="body"><div class="tn">${s.name}</div><div class="tp">${s.sub || ""}</div></div><div class="pawns"></div>`; }
    el.addEventListener("click", () => openTile(i, false));
    b.appendChild(el);
  });
}
function renderTiles() {
  const hot = hotIndex();
  PROPS.forEach(p => {
    const el = $("#t" + p.i); const l = level(p);
    el.classList.toggle("hot", p.i === hot);
    $(".lv", el).innerHTML = Array.from({ length: 5 }, (_, k) => `<i class="${k < l ? "on" : ""}"></i>`).join("");
    $(".tp", el).textContent = p.d === "util" ? `dice×${20 * LEVEL_MULT[l]}` : `rent ${fmt(rentOf(p))}`;
    let m = $(".mine", el); if (G.me && myBricks(G.me, p)) { if (!m) { m = document.createElement("span"); m.className = "mine"; m.title = "You own Bricks here"; el.appendChild(m); } } else if (m) m.remove();
  });
}
function renderPawns() {
  document.querySelectorAll(".pawns").forEach(p => p.innerHTML = "");
  G.chogs.forEach(c => { const host = $(`#t${c.pos} .pawns`); if (!host) return; const d = document.createElement("i"); d.className = "pawn" + (c === G.me ? " me" : ""); d.style.backgroundImage = `url(${c.img})`; d.title = c.name; c === G.me ? host.prepend(d) : host.appendChild(d); });
}
function floatAt(i, text, bad) {
  if (reduce) return; const t = $("#t" + i), b = $("#board"); if (!t) return;
  const r = t.getBoundingClientRect(), br = b.getBoundingClientRect();
  const f = document.createElement("div"); f.className = "float" + (bad ? " bad" : ""); f.textContent = text;
  f.style.left = (r.left - br.left + r.width / 2 - 30) + "px"; f.style.top = (r.top - br.top) + "px";
  b.appendChild(f); setTimeout(() => f.remove(), 1500);
}
function flashTile(i) { const t = $("#t" + i); t.classList.remove("landed"); void t.offsetWidth; t.classList.add("landed"); }

function sheet(html) {
  closeSheet(); const s = document.createElement("div"); s.className = "sheet"; s.setAttribute("role", "dialog");
  s.innerHTML = `<button class="x" data-close aria-label="Close">×</button>` + html; $("#board").appendChild(s); G.sheet = s;
}
function closeSheet() { if (G.sheet) { G.sheet.remove(); G.sheet = null; } }

function log(text, cls = "") { G.feed.unshift({ t: G.t, text, cls }); G.feed.length = Math.min(G.feed.length, 80); }
function clockStr(t) { const d = Math.floor(t / DAY), m = t % DAY; return `Day ${d - Math.floor(G.seasonStartT / DAY) + 1} · ${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }
let toastT; function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200); }

function render() {
  $("#when").textContent = `Season ${G.seasonNo} · ${clockStr(G.t)} UTC`;
  $("#pCommons").textContent = fmt(G.commons); $("#pLounge").textContent = fmt(G.lounge); $("#pSeason").textContent = fmt(G.season); $("#pBurn").textContent = fmt(G.burned);
  $("#hotline").textContent = `Hot Street today: ${SQ[hotIndex()].name} (rent ×2)`;
  const bell = $("#bell"); if (inBell()) { const left = Math.max(0, G.bellEnd - G.t); bell.hidden = false; bell.textContent = `CLOSING BELL ${Math.floor(left / 60)}h ${String(left % 60).padStart(2, "0")}m · last buyer: ${G.lastBuyer ? G.lastBuyer.name : "—"}`; } else bell.hidden = true;
  const gold = G.golden || [...G.chogs].sort((a, b) => appraisal(b) - appraisal(a))[0];
  if (gold) { $("#statueImg").style.backgroundImage = `url(${gold.img})`; $("#statueName").textContent = (G.golden ? "Golden Chog: " : "Leading: ") + gold.name; }
  const c = G.me;
  if (c) {
    const cap = K.rollCap + (c.tier !== "Common" ? 1 : 0);
    $("#energy").innerHTML = `<span>Rolls</span>${Array.from({ length: cap }, (_, k) => `<i class="${k < c.rolls ? "on" : ""}"></i>`).join("")}<span class="num">${c.rolls ? "" : "· extra roll 100"}</span>`;
    $("#roll").textContent = c.jail ? "ROLL FOR DOUBLES" : c.rolls ? "ROLL" : "ROLL (100)";
    $("#roll").disabled = G.busy;
  }
  document.querySelectorAll(".plans button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.plan === G.plan)));
  $("#minifeed").innerHTML = G.feed.slice(0, 3).map(f => `<div class="${f.cls}">${f.text}</div>`).join("");
  renderTiles(); renderPawns(); renderPane();
  if (c) $("#bail").hidden = !c.jail;
  window.Guide?.on("render");
}

var renderPane = function () {
  const c = G.me, pane = $("#pane"); if (!c) { pane.innerHTML = `<p class="sub">Wake a Chog to begin.</p>`; return; }
  c.mood = moodOf(c);
  const ap = appraisal(c), bv = brickValue(c), pr = prestige(c);
  if (G.tab === "chog") {
    pane.innerHTML = `
    <div class="card paper">
      <div class="deed">
        <div class="art" style="background-image:url(${c.img})"><span class="mood">${c.mood}</span></div>
        <div style="min-width:0">
          <div class="nm">${c.full}</div>
          <div class="row" style="margin-top:4px"><span class="pill tier">${c.tier}</span>${c.jail ? '<span class="pill no">In Rug Jail</span>' : ""}${G.t < c.immuneUntil ? '<span class="pill ok">Heist-immune</span>' : ""}</div>
          <div class="sub" style="margin-top:4px">${traitLine(c) || "1/1 legendary"}</div>
        </div>
      </div>
      <div><div class="sub">Appraisal: what this NFT carries</div><div class="big">${fmt(ap)} <small style="font-size:13px">$CHOG</small></div></div>
      <dl class="kv">
        <dt>Cash in the Chog</dt><dd>${fmt(c.cash)}</dd>
        <dt>Bricks (sell value)</dt><dd>${fmt(bv)}</dd>
        <dt>Unclaimed rent</dt><dd>${fmt(c.unclaimed)}</dd>
        <dt>Dapp positions in vault</dt><dd>${fmt(positionsValue(c))}</dd>
        <dt>Hype jar</dt><dd>${fmt(c.jar)}</dd>
      </dl>
    </div>
    <div class="card">
      <div class="row sp"><div class="h">Prestige +${pr}%</div><span class="sub">+1% a day without cashing out, max 50%</span></div>
      <div class="bar"><i style="width:${pr / K.prestigeCap * 100}%"></i></div>
      <dl class="kv">
        <dt>Claim weight</dt><dd>×${claimMult(c).toFixed(2)}</dd>
        <dt>· Prestige / stamps / tier</dt><dd>+${pr}% / +${stampPct(c)}% / +${TIER_BONUS[c.tier]}%</dd>
        <dt>· Hype boost</dt><dd>${hypeActive(c) > 1 ? "×" + hypeActive(c).toFixed(2) + " (from jar)" : "none"}</dd>
      </dl>
      <div class="row"><button class="btn gold" id="claimBtn" ${c.unclaimed < 1 ? "disabled" : ""}>Claim ${fmt(c.unclaimed)} rent into the Chog</button></div>
      <div class="note">Bonuses above ×1 are paid from the Commons surplus, never minted.</div>
    </div>
    <div class="card">
      <div class="row sp"><div class="h">Patron Stamps ${c.stamps.size}/28</div><span class="sub">One per Monad dapp</span></div>
      <div class="stamps">${PROPS.map(p => `<i class="${c.stamps.has(p.i) ? "got" : ""}" style="${c.stamps.has(p.i) ? "background:" + D[p.d].c : ""}" title="${p.dapp}">${p.dapp.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase()}</i>`).join("")}</div>
    </div>
    <div class="card">
      <div class="h">Practice wallet (outside the Chog)</div>
      <dl class="kv"><dt>$CHOG</dt><dd>${fmt(G.wallet.chog)}</dd><dt>MON</dt><dd>${G.wallet.mon.toFixed(1)}</dd><dt>USDC</dt><dd>${fmt(G.wallet.usdc)}</dd></dl>
      <div class="row"><button class="btn sm" id="topup">Top up 5,000 $CHOG into the Chog</button></div>
    </div>`;
    $("#claimBtn").onclick = () => { const g = claim(c); log(`Claimed ${fmt(g)} into your Chog's cash.`, "me"); toast(`+${fmt(g)} claimed. It stays in the Chog.`); render(); window.Guide?.on("claimed"); };
    $("#topup").onclick = () => { if (G.wallet.chog < 5000) return toast("Practice wallet is empty."); G.wallet.chog -= 5000; c.cash += 5000; G.inflow += 5000; c.broke = false; render(); };
  }
  if (G.tab === "land") {
    const mine = PROPS.filter(p => myBricks(c, p));
    const taxDay = bv * K.propTaxDay; const paid = G.t <= c.taxUntil; const left = Math.max(0, c.taxUntil - G.t);
    pane.innerHTML = `
    <div class="card">
      <div class="row sp"><div class="h">Property Tax</div><span class="pill ${paid ? "ok" : "no"}">${paid ? "Paid " + Math.floor(left / 60) + "h ahead" : "Unpaid: Bricks earn nothing"}</span></div>
      <div class="sub">0.5% of your Bricks' value per day, into the Commons. Prepay up to 3 days. Unpaid Bricks are never lost, but their rent goes to the Commons.</div>
      <dl class="kv"><dt>Tax per day</dt><dd>${fmt(taxDay)}</dd></dl>
      <div class="row"><button class="btn sm" data-tax="1">Prepay 1 day</button><button class="btn sm" data-tax="3">Prepay to 3 days</button></div>
      <label class="row sub" for="autoTax"><input type="checkbox" id="autoTax" ${c.autoTax ? "checked" : ""}> Autopay from the Chog's cash (Autopilot)</label>
    </div>
    <div class="card">
      <div class="row sp"><div class="h">Your streets</div><span class="sub">${mine.length} of 28</span></div>
      ${mine.length ? `<div class="list">${mine.map(p => { const n = myBricks(c, p); return `<button class="li" data-open="${p.i}" style="text-align:left;color:inherit"><span class="sw" style="background:${D[p.d].c}"></span><span style="min-width:0"><div class="t">${p.name}</div><div class="s">${n} Bricks · ${Math.round(n / p.supply * 100)}% · ${LEVEL_NAME[level(p)]}</div></span><span class="num">${fmt(sellValue(p, n) * 0.95)}</span></button>`; }).join("")}</div>`
        : `<p class="sub">No Bricks yet. Roll: your ${G.plan} plan buys Bricks where you land. Tap any street to see who owns it.</p>`}
      <div class="note">Bricks can't be withdrawn or sent to another Chog. Sell them back to the street (5% spread), or sell the whole Chog.</div>
    </div>
    <div class="card">
      <div class="h">Guards</div>
      <div class="sub">Each guard costs 500 (half burned, half to the Commons) and lowers Heist odds against you by 5%. Max 4.</div>
      <div class="row sp"><span class="num">${c.guards} / 4 guards · ${c.warden} Warden pts</span><button class="btn sm" id="guard" ${c.guards >= 4 ? "disabled" : ""}>Hire a guard</button></div>
    </div>`;
    pane.querySelectorAll("[data-tax]").forEach(b => b.onclick = () => { const r = prepayTax(c, +b.dataset.tax); if (r === -1) toast("Not enough cash in the Chog."); else { log(`Prepaid ${fmt(r)} Property Tax.`, "me"); render(); window.Guide?.on("tax"); } });
    $("#autoTax").onchange = e => { c.autoTax = e.target.checked; render(); window.Guide?.on("tax"); };
    pane.querySelectorAll("[data-open]").forEach(b => b.onclick = () => openTile(+b.dataset.open, false));
    $("#guard").onclick = () => { if (c.cash < K.guardCost) return toast("Not enough cash."); payTo(c, 250, "burn"); payTo(c, 250, "commons"); c.guards++; render(); };
  }
  if (G.tab === "vault") {
    const tr = exitTax(c), capLeft = dailyCapLeft();
    const maxOut = Math.floor(Math.min(c.cash, capLeft));
    const amt = Math.min(+(G.coAmt ?? maxOut), maxOut);
    const tax = amt * tr / 100;
    const allOutSell = (brickValue(c) + c.cash + c.unclaimed);
    const allOutNet = allOutSell * (1 - tr / 100);
    const ready = c.queue.filter(q => q.ready), waiting = c.queue.filter(q => !q.ready);
    pane.innerHTML = `
    <div class="card paper">
      <div class="h" style="color:var(--ink)">Cash out to your wallet</div>
      <div class="sub">Reinvesting inside the Chog is free. Leaving costs money and resets Prestige.</div>
      <label class="sub" for="coAmt">Amount: <b class="num" id="coV">${fmt(amt)}</b> · max today ${fmt(maxOut)} of ${fmt(c.cash)} cash${maxOut < c.cash ? " (city-wide cap: 2% of all game cash per day)" : ""}</label>
      <input type="range" id="coAmt" min="0" max="${maxOut}" step="10" value="${Math.floor(amt)}">
      <dl class="kv">
        <dt>Exit tax (${tr}%, −1% per loyal week, floor 10%)</dt><dd id="coT">−${fmt(tax)}</dd>
        <dt>· 50% to the Commons (the players who stay)</dt><dd id="coC">${fmt(tax / 2)}</dd>
        <dt>· 25% burned · 25% to the season pot</dt><dd id="coB">${fmt(tax / 4)} · ${fmt(tax / 4)}</dd>
        <dt>Prestige lost</dt><dd style="color:var(--bad)">+${pr}% → 0%</dd>
        <dt>Waiting time</dt><dd>48 hours, frozen</dd>
        <dt>City-wide cap left today</dt><dd>${fmt(capLeft)}</dd>
        <dt><b>You receive</b></dt><dd><b id="coN">${fmt(amt - tax)}</b></dd>
      </dl>
      <button class="btn danger" id="coGo" ${amt < 100 ? "disabled" : ""}>Request cash-out</button>
    </div>
    <div class="card">
      <div class="h">Or sell the whole Chog</div>
      <div class="sub">A buyer gets the cash, the Bricks, the stamps and the Prestige. Bricks can only leave this way.</div>
      <div class="compare">
        <div class="opt"><span>Strip it: sell Bricks, cash out everything</span><b class="num">${fmt(allOutNet * 0.95)}</b><small>−5% spread, −${tr}% tax, Prestige to 0, 48h wait. The NFT is left empty.</small></div>
        <div class="opt best"><span>List the Chog at its Appraisal</span><b class="num">${fmt(ap)}</b><small>+ Prestige ${pr}% and ${c.stamps.size} stamps that boost future rent. Marketplace royalties go to the Chog team.</small></div>
      </div>
    </div>
    ${c.queue.length ? `<div class="card"><div class="h">Cash-out queue</div>
      ${waiting.map(q => `<div class="row sp"><span class="num">${fmt(q.net)}</span><span class="sub">ready in ${Math.ceil((q.at - G.t) / 60)}h</span></div>`).join("")}
      ${ready.length ? `<button class="btn gold" id="coClaim">Claim ${fmt(ready.reduce((a, q) => a + q.net, 0))} to wallet</button>` : ""}</div>` : ""}
    <div class="note">Also: no Chog-to-Chog transfers, and after a Chog is sold the new owner can't cash out for 72 hours. Its Prestige and Bricks carry over.</div>`;
    const sl = $("#coAmt"); sl.oninput = () => {
      G.coAmt = +sl.value; const a = G.coAmt, t = a * tr / 100;
      $("#coV").textContent = fmt(a); $("#coT").textContent = "−" + fmt(t); $("#coC").textContent = fmt(t / 2);
      $("#coB").textContent = `${fmt(t / 4)} · ${fmt(t / 4)}`; $("#coN").textContent = fmt(a - t); $("#coGo").disabled = a < 100;
    };
    $("#coGo").onclick = () => { requestCashOut(+sl.value); G.coAmt = 0; };
    const cl = $("#coClaim"); if (cl) cl.onclick = claimCashOuts;
  }
  if (G.tab === "city") {
    const ranked = [...G.chogs].sort((a, b) => appraisal(b) - appraisal(a));
    const held = G.chogs.reduce((a, c) => a + c.cash + c.unclaimed + c.jar + c.queue.reduce((s, q) => s + q.net, 0), 0) + PROPS.reduce((a, p) => a + p.reserve, 0) + G.commons + G.lounge + G.season + G.sleep;
    pane.innerHTML = `
    <div class="card">
      <div class="row sp"><div class="h">Leaderboard</div><span class="sub">by Appraisal</span></div>
      <div>${ranked.map((x, i) => `<div class="lb ${x === c ? "me" : ""}"><span class="num">${i + 1}</span><i class="av" style="background-image:url(${x.img})"></i><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x === c ? "You · " : ""}${x.name} <small class="sub">${moodOf(x)}</small></span><span class="num">${fmt(appraisal(x))}</span></div>`).join("")}</div>
      ${ranked.filter(x => x !== c).slice(0, 1).map(x => `<button class="btn sm" id="hypeTop">Hype ${x.name} with 300 $CHOG</button>`).join("")}
    </div>
    <div class="card">
      <div class="h">Sleeping Chog Dividend</div>
      <div class="sub">10% of every $CHOG entering the Commons is shared by all 1,969 Chogs, awake or not. A sleeping Chog claims it by waking up.</div>
      <dl class="kv"><dt>Waiting on every sleeping Chog</dt><dd>${fmt(G.sleep / SUPPLY)}</dd><dt>Pool total</dt><dd>${fmt(G.sleep)}</dd></dl>
    </div>
    <div class="card">
      <div class="h">Zero-sum check</div>
      <div class="sub">The game never mints. Everything held equals what came in, minus what left and what burned.</div>
      <dl class="kv"><dt>Came in (deposits, quests, top-ups)</dt><dd>${fmt(G.inflow)}</dd><dt>Left (cash-outs paid)</dt><dd>${fmt(G.outflow)}</dd><dt>Burned</dt><dd>${fmt(G.burned)}</dd><dt>Held in the city now</dt><dd>${fmt(held)}</dd>
      <dt>Difference</dt><dd>${Math.abs(G.inflow - G.outflow - G.burned - held) < 5 ? '<span class="pill ok">balanced</span>' : fmt(G.inflow - G.outflow - G.burned - held)}</dd></dl>
    </div>
    <div class="card"><div class="h">City feed</div><div class="feed">${G.feed.map(f => `<div class="${f.cls}"><time>${clockStr(f.t)}</time>${f.text}</div>`).join("")}</div></div>`;
    const h = $("#hypeTop"); if (h) h.onclick = () => { const t = ranked.find(x => x !== c); if (hype(c, t, 300)) { render(); window.Guide?.on("hyped"); } else toast("Not enough cash."); };
  }
  if (G.tab !== "city") {
    const f = document.createElement("div"); f.className = "card"; f.innerHTML = `<div class="h">Latest</div><div class="feed" style="max-height:150px">${G.feed.slice(0, 12).map(f => `<div class="${f.cls}"><time>${clockStr(f.t)}</time>${f.text}</div>`).join("")}</div>`; pane.appendChild(f);
  }
}

// ---------- boot ----------
function initWorld() {
  const art = CHOG_ART.slice();
  G.chogs = art.map(a => mkChog(a, true));
  // seed the city: pretend the house funded the first players so streets have owners (all tracked as inflow)
  // pretend history: 8 weeks of a busier city already fed the Sleeping Chog Dividend (tracked as inflow so the ledger stays exact)
  G.sleep = SUPPLY * 2400;
  G.inflow = G.commons + G.lounge + G.sleep;
  G.chogs.forEach(c => { const dep = 12000 + ri(30000); c.cash = dep; G.inflow += dep; c.woke = -2 * DAY; c.lastCash = -2 * DAY - ri(5) * DAY; c.taxUntil = DAY; c.guards = ri(3); });
  G.t = 0; G.seasonStartT = 0;
  advance(2 * DAY);
  G.chogs.forEach(c => c.seasonAppraisal = appraisal(c));
}
function wakeScreen() {
  let pick = G.chogs.find(c => c.id === 1) || G.chogs[0];
  const grid = $("#pick"), each = G.sleep / SUPPLY;
  grid.innerHTML = G.chogs.map(c => `<button data-id="${c.id}" aria-pressed="${c === pick}"><span class="im" style="background-image:url(${c.img})"></span><b>${c.full}</b><small>${c.tier}</small></button>`).join("");
  const upd = () => {
    const dep = +$("#wDep").value; $("#wDepV").textContent = fmt(dep);
    $("#wDiv").textContent = fmt(each); $("#wStart").textContent = fmt(dep + each); $("#wWallet").textContent = fmt(G.wallet.chog - dep);
    grid.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.id === pick.id)));
    $("#wGo").textContent = `Wake ${pick.full}`;
  };
  grid.onclick = e => { const b = e.target.closest("button"); if (!b) return; pick = byId(+b.dataset.id); upd(); };
  $("#wDep").oninput = upd; upd();
  $("#wGo").onclick = () => {
    const dep = +$("#wDep").value;
    // the chosen Chog was "sleeping": hand its bot state to the player fresh
    PROPS.forEach(p => { const n = p.h[pick.id]; if (n) { const v = sellValue(p, n); p.supply -= n; p.reserve -= v; G.commons += v; delete p.h[pick.id]; } });
    const fresh = mkChog(CHOG_ART.find(a => a.id === pick.id), false);
    const idx = G.chogs.indexOf(pick);
    // keep the books balanced: the removed bot's holdings return to the Commons
    G.commons += pick.cash + pick.unclaimed + pick.jar + Object.values(pick.pos_).reduce((a, b) => a + b, 0);
    G.chogs[idx] = fresh; G.me = fresh;
    const div = G.sleep / SUPPLY; G.sleep -= div;
    G.wallet.chog -= dep; G.inflow += dep;
    fresh.cash = dep + div; fresh.woke = G.t; fresh.lastCash = G.t; fresh.taxUntil = G.t + DAY; fresh.immuneUntil = G.t + DAY; fresh.seasonAppraisal = appraisal(fresh); fresh.plan = G.plan; fresh.autoTax = true;
    log(`You woke ${fresh.full}: deposited ${fmt(dep)} and claimed ${fmt(div)} Sleeping Chog Dividend. Heist-immune for 24h.`, "me");
    $("#wake").hidden = true; $("#lastev").textContent = "Press ROLL. Your plan buys Bricks where you land.";
    render(); window.Guide?.on("woke");
  };
}

document.addEventListener("click", e => {
  if (e.target.closest("[data-close]")) { closeSheet(); window.Guide?.on("sheetClosed"); return; }
  const q = e.target.closest("[data-quest]"); if (q) return doQuest(+q.dataset.quest);
  const s = e.target.closest("[data-sell]"); if (s) { const p = SQ[+s.dataset.sell]; const got = sellBricks(G.me, p, +s.dataset.n); log(`Sold a Brick on ${p.name} for ${fmt(got)} (stays in your Chog).`, "me"); openTile(p.i, false); render(); return; }
  const h = e.target.closest("[data-heist]"); if (h) { const t = byId(+h.dataset.heist); const r = heist(G.me, t); closeSheet(); toast(r.win ? `Heist worked: +${fmt(r.amt)} from ${t.name}.` : `Caught! You paid ${fmt(r.amt)} to ${t.name} and went to Rug Jail.`); render(); return; }
});
document.querySelectorAll(".plans button").forEach(b => b.onclick = () => { G.plan = b.dataset.plan; if (G.me) G.me.plan = G.plan; render(); window.Guide?.on("plan", G.plan); });
function setTab(t) { G.tab = t; document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", String(x.dataset.tab === t))); renderPane(); }
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => { setTab(b.dataset.tab); window.Guide?.on("tab", b.dataset.tab); });
$("#bail").onclick = () => { const c = G.me; if (!c || !c.jail) return; if (c.cash < K.bail) return toast("Not enough cash for bail."); payTo(c, K.bail / 2, "burn"); payTo(c, K.bail / 2, "lounge"); c.jail = 0; log("You paid 500 bail (half burned, half to the Nad Lounge).", "me"); render(); window.Guide?.on("bail"); };
$("#roll").onclick = rollMe;
$("#ff1").onclick = () => { advance(2 * HOUR); render(); window.Guide?.on("ff"); };
$("#ffd").onclick = () => { advance(DAY); render(); window.Guide?.on("ff"); };
const SPEEDS = [0, 1, 4]; $("#speed").onclick = () => { G.speed = SPEEDS[(SPEEDS.indexOf(G.speed) + 1) % 3]; $("#speed").textContent = G.speed ? `Speed: ${G.speed}×` : "Paused"; };
document.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && document.activeElement === document.body && G.me) { e.preventDefault(); rollMe(); } });

buildBoard(); drawDie($("#d1"), 6); drawDie($("#d2"), 6);
initWorld(); wakeScreen(); render();
// live city: 1 real second = 10 game minutes at 1× (bots keep playing)
let lastPane = 0;
function renderLive() {
  const pane = $("#pane"), now = Date.now();
  const touching = pane.contains(document.activeElement) || pane.matches(":hover") || G.tab === "vault";
  if (!touching && now - lastPane > 2500) { lastPane = now; render(); return; }
  const keep = renderPane; renderPane = () => {}; render(); renderPane = keep;
}
setInterval(() => { if (!G.me || !G.speed || G.busy) return; advance(10 * G.speed); renderLive(); }, 1000);
