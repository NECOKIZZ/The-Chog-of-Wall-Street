"use strict";
/* ============ The Chog of Wall Street: on-chain mode (Monad testnet + mainnet) ============
   Reads the deployed contracts into the same G state the board renders, and turns every button into a real
   transaction. Needs an injected wallet (MetaMask, Rabby, Phantom, Backpack…). ethers v6 is loaded from cdnjs. */
window.Chain = (() => {
  const CID = "bafybeihau2egcccbdxymeckmmbrqytbfor5gkt3en6d5fsbueymdbq7g6e";
  const GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/"];
  const NETS = {
    testnet: {
      key: "testnet", label: "Testnet City", name: "Monad Testnet", chainId: 10143, hex: "0x279f",
      rpc: "https://testnet-rpc.monad.xyz", explorer: "https://testnet.monadvision.com",
      game: "0x4f4e8a4FCA7784D7531Cd01Fef7963d24e82c141", usdc: "0x2496958B8816F2FD88E888a05aA7d34A7D46Ed12", chog: "0xc5fC739e97a411960Da8d98A8d02D7Cb9D79fcAF", nft: "0x5b5D262376Ae025CeB6218C8547dE889c973F645",
      mocks: true,
      squares: { 1: { kind: "mock", label: "Swap MON → test USDC into your Chog's cash (stand-in for nad.fun)" }, 3: { kind: "mock", label: "Swap MON → test USDC into your Chog's cash (stand-in for nad.fun)" }, 5: { kind: "mock", label: "Swap MON → test USDC into your Chog's cash (stand-in for FastLane shMON)" }, 25: { kind: "mock", label: "Swap MON → test USDC into your Chog's cash (stand-in for aPriori aprMON)" }, 35: { kind: "mock", label: "Swap MON → test USDC into your Chog's cash (stand-in for Kintsu sMON)" }, 37: { kind: "mock", label: "Swap MON → test USDC into your Chog's cash (stand-in for Uniswap)" } },
      adapters: { mock: "0x66331182082DA6D816B096572d60DeFE64C42d8d" },
      questMon: "0.5",
    },
    mainnet: {
      key: "mainnet", label: "Mainnet City", name: "Monad", chainId: 143, hex: "0x8f",
      rpc: "https://rpc.monad.xyz", explorer: "https://monadvision.com",
      game: null, // filled from the mainnet deployment (see contracts/deployments/monad.json)
      chog: "0x350035555E10d9AfAF1566AaebfCeD5BA6C27777", nft: "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763",
      mocks: false,
      squares: {
        1: { kind: "nad", sym: "$CHOG", label: "Buy real $CHOG on nad.fun, held by your Chog" },
        3: { kind: "nad", sym: "$CHOG", label: "Buy real $CHOG on nad.fun, held by your Chog" },
        5: { kind: "lst", lst: "0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c", sym: "shMON", label: "Stake MON → shMON (FastLane), held by your Chog" },
        25: { kind: "lst", lst: "0x0c65A0BC65a5D819235B71F554D210D3F80E0852", sym: "aprMON", label: "Stake MON → aprMON (aPriori), held by your Chog" },
        35: { kind: "lst", lst: "0xA3227C5969757783154C60bF0bC1944180ed81B9", sym: "sMON", label: "Stake MON → sMON (Kintsu), held by your Chog", noPreview: true },
        37: { kind: "uni", sym: "USDC", label: "Swap MON → USDC on Uniswap v3, straight into your Chog's cash" },
      },
      adapters: {}, // filled from deployment
      lens: "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea", quoter: "0x661e93cca42afacb172121ef892830ca3b70f08d",
      wmon: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A", usdc: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
      questMon: "20",
    },
  };
  // Mainnet deployment (written by scripts/deploy-mainnet.js). Kept here so the static app needs no server.
  const MAINNET_DEPLOYMENT = null;

  const GAME_ABI = [
    "function chogs(uint256) view returns (address owner,uint64 movedAt,uint64 woke,uint64 lastCash,uint64 taxUntil,uint64 checkpoint,uint64 rollTs,uint64 immuneUntil,uint64 hypeUntil,uint64 heistUntil,uint64 pendingBlock,uint64 lastRoll,uint32 rollsSeason,uint32 seasonNo,uint16 hypeBps,uint8 pos,uint8 rolls,uint8 jail,uint8 plan,uint8 planCommitted,uint8 doubles,uint8 guards,uint8 tier,bool jailCard,bool awake,uint256 cash,uint256 unclaimed,uint256 jar,uint256 sleepDebt,uint256 stamps,uint256 warden)",
    "function props(uint256) view returns (uint128 p0,uint128 baseRent,uint64 supply,uint256 reserve,uint256 acc)",
    "function bricks(uint256,uint256) view returns (uint64)",
    "function awakeCount() view returns (uint256)", "function awakeList(uint256,uint256) view returns (uint256[])",
    "function rollsOf(uint256) view returns (uint256)", "function pendingRent(uint256) view returns (uint256)",
    "function sleepingDividend(uint256) view returns (uint256)", "function maxDeposit() view returns (uint256)", "function dailyCapLeft() view returns (uint256)",
    "function commons() view returns (uint256)", "function lounge() view returns (uint256)", "function seasonPot() view returns (uint256)", "function burned() view returns (uint256)",
    "function seasonNo() view returns (uint256)", "function seasonStart() view returns (uint256)", "function bellEnd() view returns (uint256)", "function accounted() view returns (uint256)",
    "function cashOuts(uint256) view returns (address to,uint128 net,uint64 readyAt)", "function adapterOf(uint256) view returns (address)",
    "function buybackPot() view returns (uint256)", "function chogBurned() view returns (uint256)", "function seasonTopUp(uint256) view returns (uint256)", "function topUpSeason(uint256) view returns (uint256)", "function buyback(uint256)",
    "function wake(uint256,uint256)", "function topUp(uint256,uint256)", "function setPlan(uint256,uint8)", "function roll(uint256)", "function settle(uint256)", "function buyExtraRoll(uint256)",
    "function claim(uint256)", "function prepayTax(uint256,uint256)", "function payBail(uint256)", "function hireGuard(uint256)", "function hype(uint256,uint256)", "function heist(uint256,uint256)",
    "function sellBricks(uint256,uint256,uint64,uint256)", "function quest(uint256,bytes) payable", "function requestCashOut(uint256,uint256)", "function claimCashOut(uint256)", "function sync(uint256)",
    "event Landed(uint256 indexed tokenId, uint8 d1, uint8 d2, uint8 pos, uint256 rentPaid, uint64 bricksBought)",
    "event Card(uint256 indexed tokenId, uint8 card)", "event Heist(uint256 indexed raider, uint256 indexed target, bool success, uint256 amount)",
    "error NotOwner()", "error NotAwake()", "error Pending()", "error NoRolls()", "error NotHere()", "error Cap()", "error Funds()", "error Locked()", "error Bad()",
  ];
  const ERC20 = ["function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)", "function approve(address,uint256) returns (bool)", "function mint(address,uint256)"];
  const ERC721 = ["function ownerOf(uint256) view returns (address)", "function mint(address,uint256)"];
  const ADAPTER = ["function held(uint256,address) view returns (uint256)", "function unlockAt(uint256) view returns (uint64)", "function withdraw(uint256,address)"];
  const ERR = {
    NotOwner: "That Chog isn't owned by the connected wallet.", NotAwake: "Wake this Chog first.", Pending: "A roll is already in flight. Land it first.",
    NoRolls: "Out of rolls. Buy an extra roll or wait 30 minutes.", NotHere: "Stand on that square to do its quest.", Cap: "That's over a limit: $20 of top-ups per season, the deposit cap, or today's city-wide cash-out cap.",
    Funds: "Not enough cash inside your Chog.", Locked: "Locked for now (48h cash-out queue, 72h after a sale, or 7-day position lock).", Bad: "The game rejected that action in the current state.",
  };
  const CARD_TEXT = ["Airdrop: collect $0.20 from the Commons.", "Front-run by MEV: pay $0.30 to the Nad Lounge.", "Lucky Pyth roll: +1 free roll.", "Rugged: straight to Rug Jail.", "Advance to GENESIS.", "LP fees: collect $0.15 from the Commons.", "Vet bill: pay $0.10 to the Nad Lounge.", "Get out of Rug Jail free."];

  let net = null, rp = null, bp = null, signer = null, me = null, myId = null, game = null, gameR = null, chogT = null, usdcT = null, nft = null;
  let busy = false, timer = null, extra = { positions: [], walletChog: 0, walletUsdc: 0, walletMon: 0, accounted: 0, held: 0, maxDeposit: Infinity, mine: [] };

  const on = () => !!net && !!myId;
  const sleepMs = ms => new Promise(r => setTimeout(r, ms));
  /** Read with retries. A real revert (e.g. ownerOf on a token that doesn't exist) is returned as null, never retried;
   *  rate limits and network errors are retried with backoff, so nothing is silently skipped. */
  async function rc(fn, revertAsNull = false) {
    for (let k = 0; ; k++) {
      try { return await fn(); } catch (e) {
        if (revertAsNull && (e.code === "CALL_EXCEPTION" || /revert/i.test(e.message || ""))) return null;
        if (k >= 6) throw e;
        await sleepMs(400 * 2 ** k);
      }
    }
  }
  /** Map with limited concurrency. */
  async function pmap(items, fn, conc = 6) {
    const out = new Array(items.length); let i = 0;
    await Promise.all(Array.from({ length: Math.min(conc, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
    return out;
  }
  const cacheKey = () => `cows.mine.${net.key}.${me?.toLowerCase()}`;
  // The game money is USDC (6 decimals); the app counts it in game units of $0.001. $CHOG and MON have 18 decimals.
  const fe = x => Number(x) / 1e3; // USDC base units → game units
  const W = n => BigInt(Math.round(Number(n) * 1e3)); // game units → USDC base units
  const fe18 = x => Number(ethers.formatEther(x));
  const W18 = n => ethers.parseEther(String(n));
  const artOf = id => {
    const emb = CHOG_ART.find(a => a.id === id); if (emb) return emb.img;
    const row = CHOG_TABLE.find(r => r[0] === id); return row ? `${GATEWAYS[0]}${CID}/${row[2]}.webp` : "";
  };
  const rowOf = id => CHOG_TABLE.find(r => r[0] === id) || [id, `CHOG #${id}`, id, "Common", "", "", "", ""];
  const wakeEl = () => document.querySelector("#onboard");
  const say = m => toast(m);

  function niceError(e) {
    const data = e?.data || e?.info?.error?.data || e?.error?.data;
    try { const p = game.interface.parseError(data); if (p && ERR[p.name]) return ERR[p.name]; } catch (_) { /* not ours */ }
    const m = e?.shortMessage || e?.reason || e?.message || String(e);
    if (/user rejected|denied/i.test(m)) return "You cancelled in your wallet.";
    if (/insufficient funds/i.test(m)) return `Not enough ${net.key === "mainnet" ? "MON" : "testnet MON"} for gas.`;
    return m.slice(0, 160);
  }
  async function tx(label, fn) {
    if (busy) return null; busy = true;
    try {
      say(`${label}: confirm in your wallet…`);
      const t = await fn(); say(`${label}: sent, waiting for Monad…`);
      const r = await t.wait(); log(`${label} ✓ <a href="${net.explorer}/tx/${r.hash}" target="_blank" rel="noopener">tx</a>`, "me");
      return r;
    } catch (e) { say(niceError(e)); return null; } finally { busy = false; }
  }

  // ---------- entering a network ----------
  function enter(key) {
    net = NETS[key];
    if (key === "mainnet" && MAINNET_DEPLOYMENT) applyDeployment(MAINNET_DEPLOYMENT);
    G.mode = key;
    rp = new ethers.JsonRpcProvider(net.rpc, net.chainId, { staticNetwork: true, batchMaxCount: 1 });
    if (net.game) gameR = new ethers.Contract(net.game, GAME_ABI, rp);
    chogT = new ethers.Contract(net.chog, ERC20, rp); usdcT = new ethers.Contract(net.usdc, ERC20, rp); nft = new ethers.Contract(net.nft, ERC721, rp);
    document.body.dataset.mode = key;
    renderConnect();
  }
  function applyDeployment(d) { net.game = d.game; for (const [sq, k] of Object.entries(d.squares || {})) net.adapters[sq] = d.adapters[k]; }

  function renderConnect(extraHtml = "") {
    const el = wakeEl();
    const live = !!net.game;
    el.innerHTML = `<div class="stepper"><span class="done">1 · ${net.label}</span><span class="${me ? "done" : "on"}">2 · Wallet</span><span class="${me ? "on" : ""}">3 · Chog and deposit</span></div>
      <div class="row between" style="margin-bottom:8px"><span class="pill purple">${net.name} · chain ${net.chainId}</span><button class="btn sm ghost" data-mode-back>← Choose another city</button></div>
      <h1 style="font-size:clamp(2rem,4.5vw,3.2rem)">${net.key === "mainnet" ? "Real Chogs. Real $CHOG." : "Play on-chain, for free."}</h1>
      <p class="muted" style="margin:10px 0 22px;max-width:62ch">${net.key === "mainnet"
        ? "Connect the wallet that holds your Chog Genesis NFT. Your deposit is real $CHOG, every roll is a real transaction, and six squares do real things on Monad."
        : "Same contracts as mainnet, on Monad testnet. Mint a free test Chog and free test $CHOG. Every roll, rent payment and cash-out is a real testnet transaction."}</p>
      <div class="stack">
      ${!live ? `<div class="card"><h3>Not open yet</h3><p class="muted small">Mainnet contracts aren't deployed. Play Practice or Testnet for now.</p></div>` : ""}
      ${!window.ethereum ? `<div class="card"><h3>No wallet found in this browser</h3><p class="muted small">Install MetaMask, Rabby, Phantom or Backpack, then reload this page.</p></div>` : ""}
      ${live && window.ethereum ? (me ? myChogsHtml() : `<div><button class="btn primary lg" data-chain="connect">Connect wallet</button></div>`) : ""}
      ${extraHtml}
      <p class="tiny">${net.key === "mainnet" ? "Unaudited hackathon contracts. Deposits are capped and cash-outs are taxed 10 to 20% with a 48-hour wait. Only play with what you can afford to lose." : "Testnet only. Nothing here has real value. You need a little testnet MON for gas (faucet.monad.xyz)."}</p></div>`;
  }

  async function connect() {
    try {
      bp = new ethers.BrowserProvider(window.ethereum);
      await bp.send("eth_requestAccounts", []);
      await ensureChain();
      signer = await bp.getSigner(); me = await signer.getAddress();
      game = new ethers.Contract(net.game, GAME_ABI, signer);
      window.ethereum.on?.("accountsChanged", () => location.reload());
      window.ethereum.on?.("chainChanged", () => location.reload());
      await loadWallet(); renderConnect(); scanMyChogs();
    } catch (e) { say(niceError(e)); }
  }
  async function ensureChain() {
    const cur = await bp.send("eth_chainId", []);
    if (cur === net.hex) return;
    try { await bp.send("wallet_switchEthereumChain", [{ chainId: net.hex }]); }
    catch (e) {
      if (e?.error?.code === 4902 || e?.code === 4902 || /Unrecognized|not added/i.test(e?.message || "")) {
        await bp.send("wallet_addEthereumChain", [{ chainId: net.hex, chainName: net.name, nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: [net.rpc], blockExplorerUrls: [net.explorer] }]);
      } else throw e;
    }
    bp = new ethers.BrowserProvider(window.ethereum);
  }
  async function loadWallet() {
    const c = await rc(() => chogT.balanceOf(me)), u = await rc(() => usdcT.balanceOf(me)), m = await rc(() => rp.getBalance(me)), md = await rc(() => gameR.maxDeposit());
    extra.walletChog = fe18(c); extra.walletUsdc = fe(u); extra.walletMon = fe18(m); extra.maxDeposit = md > W(1e12) ? Infinity : fe(md);
    G.wallet = { usdc: extra.walletUsdc, chog: extra.walletChog, mon: extra.walletMon };
  }

  // ---------- finding the player's Chogs ----------
  async function scanMyChogs(force) {
    extra.awake = extra.awake || {};
    let cached = null; try { cached = JSON.parse(localStorage.getItem(cacheKey()) || "null"); } catch (e) { /* storage blocked */ }
    if (cached && !force) {
      // re-verify cached ids (they may have been sold)
      const owners = await pmap(cached, id => rc(() => nft.ownerOf(id), true));
      extra.mine = cached.filter((id, k) => owners[k] && owners[k].toLowerCase() === me.toLowerCase());
    } else {
      extra.mine = []; extra.scan = 0; renderConnect();
      const ids = Array.from({ length: 1969 }, (_, i) => i + 1);
      for (let i = 0; i < ids.length; i += 60) {
        const part = ids.slice(i, i + 60);
        const owners = await pmap(part, id => rc(() => nft.ownerOf(id), true));
        const had = extra.mine.length;
        owners.forEach((o, k) => { if (o && o.toLowerCase() === me.toLowerCase()) extra.mine.push(part[k]); });
        extra.scan = Math.min(1969, i + 60);
        // only redraw when a Chog turns up; otherwise just tick the counter so clicks on the page aren't lost
        const n = document.getElementById("scanN"); if (extra.mine.length !== had || !n) renderConnect(); else n.textContent = `checking ${extra.scan} / 1,969…`;
      }
    }
    try { localStorage.setItem(cacheKey(), JSON.stringify(extra.mine)); } catch (e) { /* ignore */ }
    for (const id of extra.mine) extra.awake[id] = (await rc(() => gameR.chogs(id))).awake;
    extra.scan = "done"; renderConnect();
  }
  async function useId(id) {
    if (!(id >= 1 && id <= 1969)) return say("Chog IDs run from 1 to 1,969.");
    const o = await rc(() => nft.ownerOf(id), true);
    if (!o || o.toLowerCase() !== me.toLowerCase()) return say(`Chog #${id} isn't in this wallet.`);
    if (!extra.mine.includes(id)) extra.mine.push(id);
    extra.awake[id] = (await rc(() => gameR.chogs(id))).awake; extra.pick = id; renderConnect();
  }
  function myChogsHtml() {
    const scanning = extra.scan !== "done";
    const list = extra.mine.map(id => { const r = rowOf(id); return `<button data-pick="${id}" aria-pressed="${extra.pick === id}"><span class="im" style="background-image:url(${artOf(id)})"></span><b>${r[1]}</b><small>${r[3]}${extra.awake?.[id] ? " · awake" : ""}</small></button>`; }).join("");
    const pick = extra.pick, awake = pick && extra.awake?.[pick];
    const dep = K.startDeposit, short = extra.walletUsdc < dep;
    return `<div class="card"><dl class="kv"><dt>Wallet</dt><dd>${me.slice(0, 6)}…${me.slice(-4)}</dd><dt>USDC in wallet</dt><dd>${fmt(extra.walletUsdc)}</dd><dt>$CHOG in wallet (power-ups)</dt><dd>${fmtN(extra.walletChog)}</dd><dt>MON for gas${net.key === "mainnet" ? " and app squares" : ""}</dt><dd>${extra.walletMon.toFixed(3)}</dd>${extra.maxDeposit < Infinity ? `<dt>Deposit cap per Chog</dt><dd>${fmt(extra.maxDeposit)}</dd>` : ""}</dl>
      ${net.mocks ? `<div class="row" style="margin-top:12px"><button class="btn sm" data-chain="faucetUsdc">Get 100 test USDC</button><button class="btn sm" data-chain="faucetChog">Get 10,000 test $CHOG</button><button class="btn sm" data-chain="mintChog">Mint a free test Chog</button></div>` : `<p class="tiny" style="margin-top:10px">Need $CHOG? Land on a nad.fun square in the game, or wake with any amount from 10,000.</p>`}</div>
      <div class="row between"><h3>Your Chogs</h3><span class="tiny" id="scanN">${scanning ? `checking ${extra.scan || 0} / 1,969…` : `${extra.mine.length} found`}</span></div>
      <div class="row"><label class="tiny" for="cId">Know your Chog's token ID?</label><input id="cId" class="qamt" type="number" min="1" max="1969" placeholder="e.g. 561"><button class="btn sm" data-chain="useId">Use it</button>${scanning ? "" : `<button class="btn sm ghost" data-chain="rescan">Scan again</button>`}</div>
      ${list ? `<div class="pick">${list}</div>` : scanning ? "" : `<p class="muted small">This wallet holds no ${net.mocks ? "test Chog yet. Mint one above." : "Chog Genesis NFT. Try Testnet City instead."}</p>`}
      ${pick ? `<div class="card stack"><h3>${awake ? "Open the account" : `Open an account for ${rowOf(pick)[1]}`}</h3>
        ${awake ? `<p class="muted small">This Chog already has an account.</p><button class="btn primary lg" data-chain="enterCity">Enter as ${rowOf(pick)[1]}</button>`
          : `<dl class="kv"><dt>Opening deposit (same for everyone)</dt><dd>${fmt(dep)} USDC</dd></dl><div><button class="btn primary" data-chain="wake" ${short ? "disabled" : ""}>Approve and open account</button></div>${short ? `<p class="tiny">You need ${fmt(dep)} of ${net.mocks ? "test " : ""}USDC in this wallet.</p>` : ""}`}</div>` : ""}`;
  }

  // ---------- reading the city ----------
  async function refresh() {
    if (!gameR) return;
    const now = Math.floor(Date.now() / 1000);
    const n = Number(await rc(() => gameR.awakeCount()));
    const ids = n ? (await rc(() => gameR.awakeList(0, Math.min(n, 100)))).map(Number) : [];
    const cs = await pmap(ids, id => rc(() => gameR.chogs(id)));
    const rolls = await pmap(ids, id => rc(() => gameR.rollsOf(id)));
    const pend = await pmap(ids, id => rc(() => gameR.pendingRent(id)));
    const propsR = await pmap(PROPS, p => rc(() => gameR.props(p.i)));
    const potFns = [() => gameR.commons(), () => gameR.lounge(), () => gameR.seasonPot(), () => gameR.burned(), () => gameR.seasonNo(), () => gameR.seasonStart(), () => gameR.bellEnd(), () => gameR.accounted(), () => usdcT.balanceOf(net.game), () => gameR.sleepingDividend(0), () => gameR.buybackPot(), () => gameR.chogBurned()];
    const pots = await pmap(potFns, f => rc(f), 4);
    const pairs = PROPS.filter((p, k) => Number(propsR[k].supply) > 0).flatMap(p => ids.map(id => [p.i, id]));
    const brick = await pmap(pairs, ([sq, id]) => rc(() => gameR.bricks(sq, id)).then(b => [sq, id, Number(b)]));
    G.t = Math.floor(now / 60);
    G.commons = fe(pots[0]); G.lounge = fe(pots[1]); G.season = fe(pots[2]); G.burned = fe(pots[3]); G.seasonNo = Number(pots[4]);
    G.seasonStartT = Number(pots[5]) / 60; G.bellEnd = Number(pots[6]) ? Number(pots[6]) / 60 : null; extra.accounted = fe(pots[7]); extra.held = fe(pots[8]);
    G.sleep = fe(pots[9]) * SUPPLY; G.buyback = fe(pots[10]); G.chogBurned = fe18(pots[11]);
    PROPS.forEach((p, k) => { p.supply = Number(propsR[k].supply); p.reserve = fe(propsR[k].reserve); p.h = {}; });
    brick.forEach(([sq, id, b]) => { if (b) SQ[sq].h[id] = b; });
    const prev = new Map(G.chogs.map(c => [c.id, c]));
    G.chogs = ids.map((id, k) => {
      const s = cs[k], r = rowOf(id), old = prev.get(id) || {};
      const st = new Set(); let bits = BigInt(s.stamps); for (let i = 0; bits; i++, bits >>= 1n) if (bits & 1n) st.add(i);
      return {
        ...old, id, name: r[1].replace(/^CHOG /, ""), full: r[1], img: artOf(id), tier: r[3] || "Common", eyes: r[4], head: r[5], body: r[6], mouth: r[7],
        bot: id !== myId, pos: Number(s.pos), cash: fe(s.cash), unclaimed: fe(s.unclaimed) + fe(pend[k]), jar: fe(s.jar), rolls: Number(rolls[k]),
        hypeMult: Number(s.hypeBps) / 10000 || 1, hypeUntil: Number(s.hypeUntil) / 60, guards: Number(s.guards), jail: Number(s.jail), jailCard: s.jailCard,
        lastCash: Number(s.lastCash) / 60, woke: Number(s.woke) / 60, lastRoll: Number(s.lastRoll) / 60, taxUntil: Number(s.taxUntil) / 60, immuneUntil: Number(s.immuneUntil) / 60, heistUntil: Number(s.heistUntil),
        stamps: st, qday: old.qday || {}, pos_: {}, warden: Number(s.warden), rollsSeason: Number(s.rollsSeason), plan: ["safe", "balanced", "degen"][Number(s.plan)] || "balanced",
        pendingBlock: Number(s.pendingBlock), queue: old.queue || [], broke: false, autoTax: false, seasonAppraisal: old.seasonAppraisal ?? null, lastIncome: old.lastIncome || 0, prevIncome: 0, income: 0,
      };
    });
    const before = G.me && G.me.id === myId ? { unclaimed: G.me.unclaimed, jar: G.me.jar } : null;
    G.me = G.chogs.find(c => c.id === myId) || G.me;
    liveDiff(before, G.me);
    if (G.me && me) {
      const q = await rc(() => gameR.cashOuts(myId));
      G.me.queue = Number(q.net) ? [{ net: fe(q.net), at: Number(q.readyAt) / 60, ready: now >= Number(q.readyAt) }] : [];
      await loadPositions(); await loadWallet(); saveSnap();
    }
    render();
  }
  const snapKey = () => `cows.snap.${net.key}.${myId}`;
  function snapOf(c) { return { t: G.t, unclaimed: c.unclaimed, jar: c.jar, cash: c.cash, bricks: brickValue(c), pos: c.pos, season: G.seasonNo, warden: c.warden }; }
  function awaySummary(old) {
    const c = G.me; if (!c) return;
    G.activity = []; G.lastSeen = old ? old.t : G.t;
    if (!old) act("welcome", `Welcome to ${net.label}. Everything that happens to ${c.name} while you're away shows up here`);
    else {
      const rent = c.unclaimed - old.unclaimed, hyped = c.jar - old.jar;
      if (rent > 0.5) act("rent", `While you were away, Chogs landed on your streets and paid ${fmt(rent)} rent`, rent);
      if (hyped > 0.5) act("hype", `Someone hyped you with ${fmt(hyped)} $CHOG while you were away`, hyped);
      if (c.warden > old.warden) act("guard", "Your guards caught a robber while you were away");
      if (G.seasonNo > old.season) act("season", `Season ${old.season} ended while you were away`);
      if (rent < -0.5 && c.cash <= old.cash) act("heist", `Your unclaimed rent dropped by ${fmt(-rent)}. Someone may have pulled off a HEIST`, rent);
      G.activity.forEach(a => a.t = old.t + 1);
    }
    saveSnap();
  }
  function saveSnap() { if (G.me) try { localStorage.setItem(snapKey(), JSON.stringify(snapOf(G.me))); } catch (_) { /* storage blocked */ } }
  // live changes while you're here
  function liveDiff(prev, c) {
    if (!prev || !c) return;
    const rent = c.unclaimed - prev.unclaimed;
    if (rent > 0.5 && !G.busy) act("rent", `Another Chog landed on your streets and paid you ${fmt(rent)} rent`, rent);
    if (c.jar - prev.jar > 0.5) act("hype", `Someone hyped you with ${fmt(c.jar - prev.jar)} $CHOG`, c.jar - prev.jar);
  }
  async function loadPositions() {
    extra.positions = [];
    for (const [sq, s] of Object.entries(net.squares)) {
      if (!s.lst && s.kind !== "nad") continue; // USDC from Uniswap goes straight into cash
      const a = net.adapters[sq]; if (!a) continue;
      const asset = s.lst || net.chog;
      if (extra.positions.some(p => p.adapter === a && p.asset === asset)) continue; // both nad.fun squares share one adapter
      const ad = new ethers.Contract(a, ADAPTER, rp);
      const h = await rc(() => ad.held(myId, asset)), u = await rc(() => ad.unlockAt(myId));
      if (h > 0n) extra.positions.push({ sq: +sq, sym: s.sym, asset, adapter: a, amount: fe18(h), unlock: Number(u) });
    }
  }

  // ---------- actions ----------
  async function ensureAllowance(amountWei, which = "usdc") {
    const t = new ethers.Contract(which === "usdc" ? net.usdc : net.chog, ERC20, signer);
    if ((await t.allowance(me, net.game)) >= amountWei) return true;
    return !!(await tx(which === "usdc" ? "Approve USDC" : "Approve $CHOG", () => t.approve(net.game, ethers.MaxUint256)));
  }
  async function wake() {
    const amt = W(K.startDeposit);
    if (!(await ensureAllowance(amt))) return;
    if (await tx("Wake your Chog", () => game.wake(extra.pick, amt))) { extra.awake[extra.pick] = true; enterCity(); }
  }
  async function enterCity() {
    myId = extra.pick; G.wallet = { usdc: extra.walletUsdc, chog: extra.walletChog, mon: extra.walletMon };
    say("Loading the city…");
    let old = null; try { old = JSON.parse(localStorage.getItem(snapKey()) || "null"); } catch (_) { /* storage blocked */ }
    await refresh(); awaySummary(old);
    enterApp();
    const le = $("#lastev"); if (le) le.textContent = "Press ROLL. Every roll is two quick transactions: commit, then land.";
    clearInterval(timer); timer = setInterval(() => { if (!busy && !G.busy && !document.hidden) refresh().catch(() => {}); }, 15000);
  }
  async function roll() {
    const c = G.me; if (!c || G.busy || busy) return;
    G.busy = true; render();
    try {
      const onchainPlan = ["safe", "balanced", "degen"].indexOf(c.plan), want = ["safe", "balanced", "degen"].indexOf(G.plan);
      if (onchainPlan !== want && !(await tx(`Set plan to ${G.plan}`, () => game.setPlan(myId, want)))) return;
      if (!c.pendingBlock) {
        if (c.rolls === 0 && (!(await ensureAllowance(W18(K.extraRollChog), "chog")) || !(await tx(`Buy an extra roll (${K.extraRollChog} $CHOG, burned)`, () => game.buyExtraRoll(myId))))) return;
        if (!(await tx("Commit roll", () => game.roll(myId)))) return;
      }
      const from = c.pos;
      for (let k = 0; k < 20; k++) { // wait one block before landing
        const cur = await rc(() => rp.getBlockNumber()); const s = await rc(() => gameR.chogs(myId));
        if (cur > Number(s.pendingBlock)) break; await new Promise(r => setTimeout(r, 500));
      }
      const r = await tx("Land the roll", () => game.settle(myId));
      if (!r) return;
      let landed = null, card = null;
      for (const l of r.logs) { try { const p = game.interface.parseLog(l); if (p?.name === "Landed") landed = p.args; if (p?.name === "Card") card = Number(p.args.card); } catch (_) { /* other contract */ } }
      if (landed) {
        await showDice(Number(landed.d1), Number(landed.d2));
        const steps = (Number(landed.pos) - from + 40) % 40;
        for (let k = 0; k < steps && !Number(landed.d1 === landed.d2 && false); k++) { c.pos = (c.pos + 1) % 40; renderPawns(); await new Promise(res => setTimeout(res, 110)); }
        let msg = `Rolled ${landed.d1}+${landed.d2} → ${SQ[Number(landed.pos)].name}.`;
        if (landed.rentPaid > 0n) msg += ` Paid ${fmt(fe(landed.rentPaid))} rent.`;
        if (landed.bricksBought > 0n) msg += ` Your plan bought ${landed.bricksBought} Bricks.`;
        if (card !== null) msg += ` Card: ${CARD_TEXT[card]}`;
        log(msg, "me"); const le = $("#lastev"); if (le) le.textContent = msg;
      }
      await refresh();
      const pos = G.me.pos;
      if (card !== null) openCard("Card", CARD_TEXT[card]);
      else if (SQ[pos].t === "prop") openTile(pos, true);
      else if (SQ[pos].t === "heist") openHeist();
      window.Guide?.on("rolled", { r: {}, pos, sq: SQ[pos], jail: G.me.jail > 0 });
    } finally { G.busy = false; render(); }
  }
  const after = async (r, ev, data) => { if (r) { await refresh(); window.Guide?.on(ev, data); } return r; };
  const claim = async () => after(await tx("Claim rent", () => game.claim(myId)), "claimed");
  const tax = async days => after(await tx(`Prepay ${days} day${days > 1 ? "s" : ""} of Property Tax`, () => game.prepayTax(myId, days * 86400)), "tax");
  const bail = async () => after(await tx("Pay bail", () => game.payBail(myId)), "bail");
  const guard = async () => (await ensureAllowance(W18(K.guardChog), "chog")) && after(await tx(`Hire a guard (${K.guardChog} $CHOG, burned)`, () => game.hireGuard(myId)), "guard");
  const sell = async sq => after(await tx("Sell 1 Brick", () => game.sellBricks(myId, sq, 1, 0)), "sell");
  const claimCashOut = async () => after(await tx("Claim cash-out", () => game.claimCashOut(myId)), "cashoutClaimed");
  async function cashOut(amount) { return after(await tx("Request cash-out", () => game.requestCashOut(myId, W(Math.floor(amount)))), "cashout"); }
  async function topUp(amount) { const a = W(amount); if (!(await ensureAllowance(a))) return; return after(await tx("Top up your Chog", () => game.topUp(myId, a)), "topup"); }
  async function hype(target, amount) { const a = W18(amount); if (!(await ensureAllowance(a, "chog"))) return; return after(await tx(`Hype with ${amount} $CHOG`, () => game.hype(target, a)), "hyped"); }
  // Anyone can run the buyback: the pot's USDC buys $CHOG and burns it. minOut is quoted on mainnet (95%).
  async function buyback() {
    let minOut = 0n;
    if (!net.mocks) try {
      const q = new ethers.Contract(net.quoter, ["function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160,uint32,uint256)"], rp);
      const [w] = await q.quoteExactInputSingle.staticCall({ tokenIn: net.usdc, tokenOut: net.wmon, amountIn: W(G.buyback), fee: 3000, sqrtPriceLimitX96: 0 });
      const lens = new ethers.Contract(net.lens, ["function getAmountOut(address,uint256,bool) view returns (address,uint256)"], rp);
      const [, out] = await lens.getAmountOut(net.chog, w, true); minOut = (out * 95n) / 100n;
    } catch (e) { return say("Couldn't get a quote: " + niceError(e)); }
    return after(await tx("Buy back and burn $CHOG", () => game.buyback(minOut)), "buyback");
  }
  async function heist(target) {
    const r = await tx("Heist", () => game.heist(myId, target)); if (!r) return;
    for (const l of r.logs) { try { const p = game.interface.parseLog(l); if (p?.name === "Heist") say(p.args.success ? `Heist worked: +${fmt(fe(p.args.amount))}` : `Caught! You paid ${fmt(fe(p.args.amount))} and went to Rug Jail.`); } catch (_) { /* skip */ } }
    closeSheet(); await refresh();
  }
  async function withdrawPos(i) { const p = extra.positions[i]; const ad = new ethers.Contract(p.adapter, ADAPTER, signer); await after(await tx(`Withdraw ${p.sym}`, () => ad.withdraw(myId, p.asset)), "withdraw"); }

  // ---------- dapp quests ----------
  async function minOutFor(sq, value) {
    const s = net.squares[sq];
    if (s.kind === "mock") return 0n;
    if (s.kind === "nad") { const lens = new ethers.Contract(net.lens, ["function getAmountOut(address,uint256,bool) view returns (address,uint256)"], rp); const [, out] = await lens.getAmountOut(net.chog, value, true); return (out * 97n) / 100n; }
    if (s.kind === "uni") {
      const q = new ethers.Contract(net.quoter, ["function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160,uint32,uint256)"], rp);
      const [out] = await q.quoteExactInputSingle.staticCall({ tokenIn: net.wmon, tokenOut: net.usdc, amountIn: value, fee: 3000, sqrtPriceLimitX96: 0 }); return (out * 97n) / 100n;
    }
    if (s.kind === "lst" && !s.noPreview) { const l = new ethers.Contract(s.lst, ["function previewDeposit(uint256) view returns (uint256)"], rp); return ((await l.previewDeposit(value)) * 98n) / 100n; }
    return 0n;
  }
  async function quest(sq) {
    const s = net.squares[sq]; if (!s) return;
    const amt = $("#qAmt")?.value || net.questMon; const value = W18(amt);
    let minOut;
    try { minOut = await minOutFor(sq, value); } catch (e) { return say("Couldn't get a quote: " + niceError(e)); }
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [minOut]);
    const r = await tx(s.label, () => game.quest(myId, data, { value }));
    if (r) { await refresh(); openTile(sq, true); window.Guide?.on("quest", { i: sq, first: true }); }
  }
  function questHtml(p, here) {
    const s = net.squares[p.i]; if (!s) return null;
    return `<div class="questbox"><div class="row between"><b>${p.dapp}</b><span class="pill ok">${net.mocks ? "On-chain (test stand-in)" : "Real, on Monad"}</span></div>
      <p class="small">${s.label}.</p>
      <p class="tiny">First time: a permanent Patron Stamp (+1% claim weight). Once a day: +1 free roll.${s.kind === "lst" || s.kind === "nad" ? " The position is held by this Chog and its holder can withdraw it after 7 days." : s.kind === "uni" || s.kind === "mock" ? " The USDC counts toward your $20-a-season top-up limit." : ""}</p>
      ${here ? `<div class="row"><label class="tiny" for="qAmt">MON</label><input id="qAmt" class="qamt" type="number" min="0.01" step="0.01" value="${net.questMon}"><button class="btn primary sm" data-chainquest="${p.i}">Do it on-chain</button></div>` : `<p class="tiny">Land here to use it.</p>`}</div>`;
  }
  function positionsHtml() {
    const now = Date.now() / 1000;
    return `<div class="card"><h3>App positions held by your Chog</h3>
      ${extra.positions.length ? `<div class="stack" style="margin-top:10px">${extra.positions.map((p, i) => `<div class="row between"><span><b>${p.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${p.sym}</b><br><span class="tiny">${SQ[p.sq].name} · ${now >= p.unlock ? "unlocked" : "unlocks " + new Date(p.unlock * 1000).toLocaleString()}</span></span>${now >= p.unlock ? `<button class="btn sm" data-chainwd="${i}">Withdraw</button>` : `<span class="pill warn">locked</span>`}</div>`).join("")}</div>`
        : `<p class="muted small" style="margin-top:6px">None yet. The station squares and the nad.fun squares put real positions inside your Chog.</p>`}
      <p class="tiny" style="margin-top:10px">Positions belong to the NFT. If you sell the Chog, the buyer can withdraw them.</p></div>`;
  }
  function walletHtml() {
    return `<dl class="kv"><dt>USDC in your wallet</dt><dd>${fmt(extra.walletUsdc)}</dd><dt>$CHOG (power-ups)</dt><dd>${fmtN(extra.walletChog)}</dd><dt>MON</dt><dd>${extra.walletMon.toFixed(3)}</dd><dt>Game contract</dt><dd><a href="${net.explorer}/address/${net.game}" target="_blank" rel="noopener">${net.game.slice(0, 8)}…</a></dd></dl>`;
  }
  function ledgerHtml() {
    const ok = Math.abs(extra.held - extra.accounted) < 1e-6;
    return `<dl class="kv"><dt>USDC held by the game</dt><dd>${fmt(extra.held)}</dd><dt>Owed to players and pots</dt><dd>${fmt(extra.accounted)}</dd><dt>Zero-sum check</dt><dd>${ok ? '<span class="pill ok">balanced</span>' : '<span class="pill bad">mismatch</span>'}</dd></dl>`;
  }
  // Chog-to-Chog messages need their own contract (ChogMail), which isn't deployed yet.
  function dm() { toast("On-chain messages between Chogs are coming soon. They work in Practice City today."); }

  // ---------- wiring ----------
  document.addEventListener("click", async e => {
    const b = e.target.closest("[data-chain],[data-pick],[data-chainquest],[data-chainwd],[data-mode-back]"); if (!b || !net) return;
    if (b.dataset.modeBack !== undefined) { location.hash = ""; location.reload(); return; }
    if (b.dataset.pick) { extra.pick = +b.dataset.pick; renderConnect(); return; }
    if (b.dataset.chainquest) return quest(+b.dataset.chainquest);
    if (b.dataset.chainwd) return withdrawPos(+b.dataset.chainwd);
    const a = b.dataset.chain;
    if (a === "connect") return connect();
    if (a === "wake") return wake();
    if (a === "enterCity") return enterCity();
    if (a === "topup5k") return topUp(5000);
    if (a === "useId") return useId(+$("#cId").value);
    if (a === "rescan") return scanMyChogs(true);
    if (a === "faucetChog") { const t = new ethers.Contract(net.chog, ERC20, signer); if (await tx("Mint 10,000 test $CHOG", () => t.mint(me, W18(10000)))) { await loadWallet(); renderConnect(); } return; }
    if (a === "faucetUsdc") { const t = new ethers.Contract(net.usdc, ERC20, signer); if (await tx("Mint 100 test USDC", () => t.mint(me, 100_000_000n))) { await loadWallet(); renderConnect(); } return; }
    if (a === "mintChog") {
      const n = new ethers.Contract(net.nft, ERC721, signer); let id = 0;
      for (let k = 0; k < 30; k++) { const c = 6 + Math.floor(Math.random() * 1960); try { await nft.ownerOf(c); } catch (_) { id = c; break; } }
      if (id && (await tx(`Mint test Chog #${id}`, () => n.mint(me, id)))) { extra.mine.push(id); extra.awake[id] = false; extra.pick = id; renderConnect(); }
    }
  });

  return { on, enter, dm, buyback, roll, claim, tax, bail, guard, sell, cashOut, claimCashOut, topUp, hype, heist, quest, questHtml, positionsHtml, walletHtml, ledgerHtml, refresh, net: () => net, NETS };
})();
