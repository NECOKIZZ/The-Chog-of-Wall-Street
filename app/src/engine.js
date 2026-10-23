"use strict";
/* ============ The Chog of Wall Street: rules engine (shared by Practice and the on-chain UI) ============ */
const $ = (s, r = document) => r.querySelector(s);
// Money is counted in game units of $0.001 (the contract holds USDC). fmt shows dollars; fmtN shows plain counts ($CHOG, Bricks).
const fmt = n => { const v = Math.round(n) / 1000; return (v < 0 ? "−" : "") + "$" + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const fmtN = n => Math.round(n).toLocaleString("en-US");
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const DAY = 1440, HOUR = 60;
const SUPPLY = 1969;

// ---------- economy constants (mirror docs/PLAN.md) ----------
const K = {
  startDeposit: 20000, topUpCap: 20000, idle: 2 * DAY, rollEvery: 30, rollCap: 8, extraRollChog: 100, guardChog: 500, hypeChog: 300,
  buyFee: 0.03, buyBurn: 0.01, sellSpread: 0.05, rentHolders: 0.9,
  propTaxDay: 0.005, taxPrepayMax: 3 * DAY, capShare: 0.4, capFree: 10,
  fairStartMax: 50000, goPct: 0.01, goCap: 500, loungeWin: 0.25,
  bail: 500, gasTaxPct: 0.05, gasTaxCap: 1000, mevTax: 750,
  heistBase: 55, heistSteal: 0.10, heistFine: 500, heistMinUnclaimed: 500,
  exitBase: 20, exitFloor: 10, queue: 2 * DAY, dailyCapPct: 0.02, prestigeDay: 1, prestigeCap: 50,
  hypeStep: 0.10, hypeMax: 1.5, hypeDur: 4 * HOUR, hypeBurn: 0.10,
  inflowCommons: 0.8, inflowSleep: 0.1, inflowSeason: 0.1, seasonLen: 7 * DAY,
  monUsd: 20, chogPerUnit: 0.75, // ≈ mainnet prices, Oct 2026: 1 MON ≈ $0.02, $1 ≈ 750 $CHOG
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
// q: [tier, kind, text]   kind: chog (MON→$CHOG held by the Chog), stake (MON→LST held by the Chog), usdc (MON→USDC into the Chog's cash)
const SQ = [
  { t: "go", name: "GENESIS", sub: "Collect 1% of your Bricks" },
  { t: "prop", d: "brown", name: "nad.fun Lane", dapp: "nad.fun", brand: "nadfun", q: ["A", "chog", "Buy $CHOG on nad.fun, held by your Chog"], fair: true },
  { t: "chest", name: "Commons Chest" },
  { t: "prop", d: "brown", name: "Chog Alley", dapp: "nad.fun", brand: "nadfun", q: ["A", "chog", "Buy $CHOG on nad.fun, held by your Chog"], fair: true },
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
  { t: "prop", d: "dblue", name: "Uniswap Boardwalk", dapp: "Uniswap", brand: "uniswap", q: ["A", "usdc", "Swap MON → USDC on Uniswap, straight into your Chog's balance"] },
  { t: "tax", name: "MEV Tax", sub: "Pay $0.75" },
  { t: "prop", d: "dblue", name: "Chog Exchange Tower" },
];
SQ.forEach((s, i) => { s.i = i; if (s.t === "prop") { s.p0 = D[s.d].p0; s.base = D[s.d].rent; s.supply = 0; s.reserve = 0; s.h = {}; } });
const PROPS = SQ.filter(s => s.t === "prop");

const ENTROPY = [ // "Market News" squares (Chance)
  ["Bull run. Advance to Chog Exchange Tower.", c => moveTo(c, 39, true)],
  ["Front-run by a bot. Pay $0.30 to the Nad Lounge.", c => payTo(c, 300, "lounge")],
  ["Lucky streak. +1 free roll.", c => { c.rolls++; }],
  ["Margin called. Pay 5% of cash (max $0.80) to the Nad Lounge.", c => payTo(c, Math.min(800, c.cash * 0.05), "lounge")],
  ["Vault payday. Collect $0.30 from the Commons.", c => fromCommons(c, 300)],
  ["Rugged. Go straight to Rug Jail.", c => toJail(c)],
  ["Order filled. Advance to the next Station.", c => { const st = [5, 15, 25, 35].find(x => x > c.pos) ?? 5; moveTo(c, st, true); }],
  ["Airdrop season. Collect $0.20 from the Commons.", c => fromCommons(c, 200)],
];
const CHEST = [ // Commons Chest (community cards)
  ["Prosperity. Collect 1% of the Commons (max $1.00).", c => fromCommons(c, Math.min(1000, G.commons * 0.01))],
  ["Advance to GENESIS.", c => moveTo(c, 0, true)],
  ["Get out of Rug Jail free. Keep this card.", c => { c.jailCard = true; }],
  ["LP fees. Collect $0.15 from the Commons.", c => fromCommons(c, 150)],
  ["Vet bill for your Chog's horns. Pay $0.10 to the Nad Lounge.", c => payTo(c, 100, "lounge")],
  ["Your Chog went viral. +1 free roll.", c => { c.rolls++; }],
];

// ---------- world state ----------
const G = {
  t: 0, commons: 60000, lounge: 4000, season: 0, sleep: 0, burned: 0, inflow: 0, outflow: 0,
  seasonNo: 1, seasonStartT: 0, bellEnd: null, lastBuyer: null, golden: null, cashedToday: 0, cashDay: 0,
  me: null, chogs: [], feed: [], plan: "balanced", busy: false, speed: 1, tab: "chog", sheet: null,
  wallet: { usdc: 100000, chog: 50000, mon: 1000 }, mode: "practice", buyback: 0, chogBurned: 0,
  activity: [], inbox: [], lastSeen: 0, page: "desk", auctions: [], escrow: 0, vault: { idx: 1, apy: 0.062 }, seasons: [],
};
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const ri = n => Math.floor(rnd() * n);

function mkChog(a, bot) {
  return {
    id: a.id, name: a.name.replace(/^CHOG /, ""), full: a.name, img: a.img, tier: a.tier, eyes: a.eyes, head: a.head, body: a.body, mouth: a.mouth,
    bot, pos: 0, cash: 0, rolls: K.rollCap, rollAcc: 0, plan: ["safe", "balanced", "degen"][ri(3)], unclaimed: 0, taxUntil: 0,
    lastCash: 0, woke: 0, stamps: new Set(), qday: {}, pos_: {}, jar: 0, hypeMult: 1, hypeUntil: 0, guards: 0, jail: 0, jailCard: false,
    rollsSeason: 0, warden: 0, seasonAppraisal: 0, queue: [], mort: {}, auc: {}, lastRoll: 0, topSeason: 0, topped: 0, immuneUntil: 0, act: 0.25 + rnd() * 0.6, mood: "Chill", lastIncome: 0, prevIncome: 0, income: 0,
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
// Fees that used to be burned now fill the buyback pot; the Bank spends it on $CHOG and burns that.
function burn(x) { G.buyback += x; }
function runBuyback() { if (G.buyback < 1) return; G.burned += G.buyback; G.chogBurned += G.buyback * K.chogPerUnit; G.buyback = 0; }
// The 48-hour rule: a Chog that hasn't rolled in 48 hours earns nothing until it rolls again.
const earningUntil = c => Math.min(c.taxUntil, (c.lastRoll || 0) + K.idle);
const idle = c => G.t > (c.lastRoll || 0) + K.idle;
// Everyone opens with the same $20; top-ups (and USDC from app squares) are capped at $20 per Chog per season.
function topUpRoom(c) { if (c.topSeason !== G.seasonNo) { c.topSeason = G.seasonNo; c.topped = 0; } return Math.max(0, K.topUpCap - c.topped); }
function addTopUp(c, x) { topUpRoom(c); c.topped += x; c.cash += x; G.inflow += x; }
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
  if (locked(c, p)) return 0;
  n = Math.min(n, myBricks(c, p)); if (n <= 0) return 0;
  const v = sellValue(p, n), spread = v * K.sellSpread;
  p.reserve -= v; p.supply -= n; p.h[c.id] -= n; if (!p.h[c.id]) delete p.h[c.id];
  c.cash += v - spread; toCommons(spread); return v - spread;
}
// ---------- the Bank: mortgages and auctions ----------
// A mortgage is a loan from the Commons against one street: half its Bricks' sell value. While mortgaged, that street's rent
// share goes to the Commons, its Bricks can't be sold, and you can't cash out. Repaying costs the loan + 10% (the 10% is a fee).
const MORT_LTV = 0.5, MORT_FEE = 0.1, AUC_LEN = 2 * HOUR, AUC_SNIPE = 10;
const locked = (c, p) => !!(c.mort?.[p.i] || c.auc?.[p.i]);
const debt = c => c.loanTotal != null ? c.loanTotal : Object.values(c.mort || {}).reduce((a, b) => a + b, 0); // on-chain: loanOf
const freeBrickValue = c => PROPS.reduce((v, p) => v + (myBricks(c, p) && !locked(c, p) ? sellValue(p, myBricks(c, p)) * (1 - K.sellSpread) : 0), 0);
const loanOffer = (c, p) => myBricks(c, p) ? sellValue(p, myBricks(c, p)) * (1 - K.sellSpread) * MORT_LTV : 0;
const loanRoom = () => Math.max(0, G.commons / 2); // one loan can take at most half of what the Bank holds
function mortgage(c, p) {
  if (locked(c, p) || !myBricks(c, p)) return 0;
  const loan = Math.min(loanOffer(c, p), loanRoom(), G.commons); if (loan < 1) return 0;
  G.commons -= loan; c.cash += loan; c.mort[p.i] = loan;
  if (c === G.me) act("mortgage", `You mortgaged ${p.name} and got ${fmt(loan)} from the Bank`, loan);
  return loan;
}
function repayMortgage(c, p) {
  const loan = c.mort?.[p.i]; if (!loan) return 0;
  const cost = loan * (1 + MORT_FEE); if (c.cash < cost) return -1;
  c.cash -= cost; G.commons += loan; toCommons(loan * MORT_FEE); delete c.mort[p.i];
  if (c === G.me) act("repay", `You paid off the mortgage on ${p.name}`, -cost);
  return cost;
}
// An auction offers some of your Bricks on one street for 2 hours (one auction per street). The bank price (what selling
// would pay) is the reserve. Bids come out of the bidder's cash and wait in escrow; an outbid bidder gets theirs back at once.
// A bid in the last 10 minutes adds 10 minutes. At the end the Bricks go to the best bid and the money to the seller.
let aucSeq = 1;
const auctionOn = i => G.auctions.find(a => a.i === i);
function startAuction(c, p, n) {
  n = Math.min(n, myBricks(c, p)); if (n <= 0 || locked(c, p) || auctionOn(p.i)) return null;
  const a = { id: aucSeq++, seller: c.id, i: p.i, n, reserve: sellValue(p, n) * (1 - K.sellSpread), ends: G.t + AUC_LEN, bid: 0, bidder: null };
  c.auc[p.i] = true; G.auctions.push(a); return a;
}
const minBid = a => Math.max(a.reserve, a.bid * 1.01 + 1);
function bidAuction(c, a, amt) {
  const p = SQ[a.i];
  if (!a || c.id === a.seller || G.t >= a.ends || amt < minBid(a) || c.cash < amt || capFor(c, p, a.n) < a.n) return false;
  c.cash -= amt; G.escrow += amt;
  if (a.bidder) { const prev = byId(a.bidder); G.escrow -= a.bid; prev.cash += a.bid; if (prev === G.me && c !== G.me) act("auction", `${c.name} outbid you on ${p.name}. Your ${fmt(a.bid)} is back in your cash`, a.bid); }
  a.bid = amt; a.bidder = c.id;
  if (a.ends - G.t < AUC_SNIPE) a.ends += AUC_SNIPE;
  if (a.seller === G.me?.id && c !== G.me) act("auction", `${c.name} bid ${fmt(amt)} for your Bricks on ${p.name}`);
  return true;
}
function settleAuction(a) {
  const c = byId(a.seller), p = SQ[a.i]; delete c.auc[a.i];
  const b = a.bidder ? byId(a.bidder) : null;
  if (!b || myBricks(c, p) < a.n) {
    if (b) { G.escrow -= a.bid; b.cash += a.bid; }
    if (c === G.me) act("auction", `Your auction on ${p.name} ended with no bid at the bank price. Your Bricks stay with you`);
    return null;
  }
  p.h[c.id] -= a.n; if (!p.h[c.id]) delete p.h[c.id]; p.h[b.id] = myBricks(b, p) + a.n;
  G.escrow -= a.bid; c.cash += a.bid;
  if (b.taxUntil < G.t) b.taxUntil = G.t + DAY;
  const what = `${a.n} Brick${a.n > 1 ? "s" : ""} on ${p.name}`;
  if (c === G.me) { act("auction", `${b.name} won your ${what} for ${fmt(a.bid)}`, a.bid); log(`Auction: ${b.name} bought your ${what} for ${fmt(a.bid)}.`, "me"); }
  if (b === G.me) { act("auction", `You won ${what} at auction for ${fmt(a.bid)}`, -a.bid); log(`Auction: you won ${what} for ${fmt(a.bid)}.`, "me"); }
  return b;
}
// Bots bid on open auctions now and then, and sometimes put a few of their own Bricks up.
function botAuctions() {
  for (const a of G.auctions) {
    if (G.t >= a.ends || rnd() > 0.12) continue;
    const p = SQ[a.i], b = G.chogs[ri(G.chogs.length)];
    if (!b.bot || b.id === a.seller || b.id === a.bidder) continue;
    const amt = Math.round(minBid(a) * (1 + rnd() * 0.08));
    if (amt <= a.reserve * 1.35 && b.cash >= amt * 1.5) bidAuction(b, a, amt);
  }
  if (rnd() < 0.02) {
    const c = G.chogs[ri(G.chogs.length)]; if (!c.bot) return;
    const p = PROPS.filter(p => myBricks(c, p) >= 2 && !locked(c, p) && !auctionOn(p.i))[0];
    if (p) startAuction(c, p, 1 + ri(Math.min(3, myBricks(c, p))));
  }
}

// ---------- the Bank's savings desk (Morpho USDC vault on mainnet) ----------
// Savings sit outside the game: USDC from your wallet goes into a lending vault, held against your Chog, and earns the
// vault's interest. It isn't game money, so it never touches the zero-sum ledger. In Practice the vault pays a steady rate.
const saved = c => (c.save?.shares || 0) * G.vault.idx;
function saveDeposit(c, amt) {
  amt = Math.min(amt, G.wallet.usdc); if (amt < 1) return 0;
  G.wallet.usdc -= amt; c.save = c.save || { shares: 0, principal: 0 };
  c.save.shares += amt / G.vault.idx; c.save.principal += amt; return amt;
}
function saveWithdraw(c) {
  const v = saved(c); if (v < 1) return 0;
  G.wallet.usdc += v; c.save = { shares: 0, principal: 0 }; return v;
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
    const mine = PROPS.filter(q => myBricks(c, q) && !locked(c, q)).sort((a, b) => a.p0 - b.p0);
    for (const q of mine) { while (c.cash < rent && myBricks(c, q)) sellBricks(c, q, 1); }
    paid = Math.min(rent, c.cash);
  }
  c.cash -= paid;
  const holdersPart = paid * K.rentHolders; toCommons(paid - holdersPart);
  const hot = p.i === hotIndex();
  for (const [id, n] of Object.entries(p.h)) {
    const h = byId(+id); let share = holdersPart * n / p.supply;
    if (hot) { const extra = Math.min(share, G.commons); G.commons -= extra; share += extra; }
    if (h.mort?.[p.i]) { G.commons += share; continue; } // mortgaged: the Bank keeps this street's rent
    if (idle(h)) { toCommons(share); if (h === G.me && c !== G.me && share > 0) act("idle", `${c.name} landed on ${p.name}, but you haven't rolled in 48 hours. ${fmt(share)} went to the Commons`, -share); continue; }
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
const appraisal = c => c.cash + c.unclaimed + brickValue(c) + positionsValue(c) + c.jar - debt(c);
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
  let hype = 0; // hype boost, also from the Commons surplus, within the same 10% limit
  if (hypeActive(c) > 1) { hype = Math.max(0, Math.min(base * (hypeActive(c) - 1), G.commons * 0.1 - bonus, G.commons)); G.commons -= hype; }
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
      if (fairOk && level(p) <= plan.lvl && !locked(c, p)) {
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
  c.rolls--; c.rollsSeason++; c.lastRoll = G.t;
  if (c.cash < 800) { const top = Math.min(5000, topUpRoom(c)); if (top > 0) { addTopUp(c, top); c.broke = false; } }
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
// Hype is paid in $CHOG (never USDC): 10% burned, 90% tipped to the target's owner. The target's rent claims get
// ×1.1 for 4 hours (max ×1.5), with the extra paid from the Commons surplus. Bots hype with their own $CHOG.
function hype(from, to, amt, isBot) {
  if (from === to || amt < 10) return false;
  if (from === G.me) { if (G.wallet.chog < amt) return false; G.wallet.chog -= amt; }
  const b = amt * K.hypeBurn; G.chogBurned += b;
  if (to === G.me) G.wallet.chog += amt - b;
  to.hypeMult = Math.min(K.hypeMax, (G.t < to.hypeUntil ? to.hypeMult : 1) + K.hypeStep); to.hypeUntil = G.t + K.hypeDur;
  if (to === G.me) { log(`${from.name} hyped you with ${fmtN(amt)} $CHOG. Claims ×${to.hypeMult.toFixed(2)} for 4h.`, "me"); act("hype", `${from.name} hyped you: ${fmtN(amt - b)} $CHOG tipped to you, and your claims are boosted ×${to.hypeMult.toFixed(2)} for 4 hours`); }
  else if (!isBot) log(`You hyped ${to.name} with ${fmtN(amt)} $CHOG (${fmtN(b)} burned).`, "me");
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
    botAuctions();
    G.auctions = G.auctions.filter(a => { if (G.t < a.ends) return true; settleAuction(a); return false; });
    G.vault.idx *= 1 + G.vault.apy * 10 / (365 * DAY);
    G.chogs.forEach(c => { if (c.bot && c.pendingReply && G.t >= c.pendingReply.at) { c.pendingReply = null; sendDM(c, G.me, line("reply")); } });
    if (G.me && rnd() < 0.004) { const b = G.chogs.filter(x => x.bot)[ri(G.chogs.length - 1)]; if (b) { const shared = PROPS.find(p => myBricks(G.me, p) && myBricks(b, p)); sendDM(b, G.me, shared ? line("neighbour", shared.name) : line("hello")); } }
    const end = G.seasonStartT + K.seasonLen;
    if (!inBell() && G.t >= end - DAY) { G.bellEnd = end; log("The CLOSING BELL is ringing. Every Brick buy adds 1 minute. Last buyer when it hits zero wins 10% of the season pot.", "me"); act("bell", "The Closing Bell started: the season ends within 24 hours. The last Brick buyer wins 10% of the season pot"); }
    if (inBell() && G.t >= G.bellEnd) endSeason();
  }
  G.tick = 0;
  runBuyback();
}
// Season end, as on-chain: the Closing Bell winner takes 10% of the pot. Then the bottom quarter of active Chogs (20+ rolls,
// at most 50) pays 5% of its cash into what's left, and that prize pool is shared: 45% to the top 10 by growth (weights
// 10..1), +5% to #1, 15% to the top 3 defenders, 35% split across every active Chog. A share nobody qualifies for rolls
// into next season's pot.
const ACTIVE_ROLLS = 20;
const isActive = c => c.rollsSeason >= ACTIVE_ROLLS;
function wealthTax() {
  const active = G.chogs.filter(isActive);
  const k = Math.min(50, Math.floor(active.length / 4));
  const bottom = [...active].sort((a, b) => appraisal(a) - appraisal(b)).slice(0, k);
  let total = 0;
  bottom.forEach(c => { const x = c.cash * 0.05; c.cash -= x; total += x; if (c === G.me) act("wealthtax", `Season ended with you in the bottom quarter. You paid 5% of your cash into the prize pool`, -x); });
  if (total) log(`Wealth tax: the bottom ${bottom.length} Chogs paid ${fmt(total)} into the prize pool.`);
  return { bottom, total };
}
function endSeason() {
  const no = G.seasonNo, rec = { no, pot: G.season, bell: 0, bellId: G.lastBuyer?.id ?? null, tax: 0, taxed: [], paid: {}, top: [], wardens: [], active: 0, rolled: 0 };
  if (G.lastBuyer) { rec.bell = G.season * 0.1; G.season -= rec.bell; G.lastBuyer.cash += rec.bell; rec.paid[G.lastBuyer.id] = rec.bell; }
  const wt = wealthTax(); rec.tax = wt.total; rec.taxed = wt.bottom.map(c => c.id);
  const pool = G.season + wt.total; G.season = 0; rec.pool = pool;
  const pay = (c, x) => { c.cash += x; rec.paid[c.id] = (rec.paid[c.id] || 0) + x; };
  let left = pool;
  const growth = [...G.chogs].sort((a, b) => (appraisal(b) - b.seasonAppraisal) - (appraisal(a) - a.seasonAppraisal));
  const top = growth.filter(c => isActive(c) || c.rollsSeason > 0).slice(0, 10);
  const tw = top.reduce((a, _, i) => a + (10 - i), 0);
  top.forEach((c, i) => { const x = pool * 0.45 * (10 - i) / tw; pay(c, x); left -= x; });
  if (top[0]) { pay(top[0], pool * 0.05); left -= pool * 0.05; }
  const wardens = [...G.chogs].filter(c => c.warden > 0).sort((a, b) => b.warden - a.warden).slice(0, 3);
  wardens.forEach(c => { const x = pool * 0.15 / wardens.length; pay(c, x); left -= x; });
  const active = G.chogs.filter(isActive);
  active.forEach(c => { const x = pool * 0.35 / active.length; pay(c, x); left -= x; });
  rec.top = top.map(c => c.id); rec.wardens = wardens.map(c => c.id); rec.active = active.length; rec.rolled = Math.max(0, left);
  G.season = Math.max(0, left); // unclaimed shares roll into the next season
  const gold = top[0] || growth[0]; G.golden = gold; rec.golden = gold.id;
  G.seasons.unshift(rec); if (G.seasons.length > 6) G.seasons.length = 6;
  log(`SEASON ${no} ENDED. ${gold.name} is the Golden Chog. Closing Bell winner: ${G.lastBuyer ? G.lastBuyer.name : "nobody"}. ${fmt(rec.pot + rec.tax - rec.rolled)} paid out.`, "me");
  G.seasonNo++; G.seasonStartT = G.t; G.bellEnd = null; G.lastBuyer = null;
  G.chogs.forEach(c => { c.seasonAppraisal = appraisal(c); c.rollsSeason = 0; c.warden = 0; });
  if (G.me) {
    const rank = growth.indexOf(G.me) + 1, won = rec.paid[G.me.id] || 0;
    act("season", `Season ${no} ended. You finished #${rank} of ${growth.length} by growth${won ? ` and won ${fmt(won)}` : ""}${rec.bellId === G.me.id ? ", including the Closing Bell" : ""}`, won);
    toast(`Season ${no} is over. You finished #${rank}${won ? ` and won ${fmt(won)}` : ""}.`);
  }
}
