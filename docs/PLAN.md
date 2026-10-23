# The Chog of Wall Street: the plan

> **Update, 23 Oct 2026:** some of this plan has changed since it was written. Where it disagrees, `HANDOFF.md` §3 wins.
> - The game money is now **USDC**, not $CHOG. $CHOG is the power-up token: extra rolls, guards and hype are paid in it and burned, and fees buy $CHOG back and burn it.
> - Everyone opens with **$20**, with top-ups capped at $20 per season.
> - Streets stop paying a Chog that hasn't rolled in **48 hours**.
> - The city is called **Chog Street**.

**Status:** Built: the Practice City UI plus contracts with tests (v3, zero-budget) · **Captured:** 2026-10-22 (working title: Chogopoly) · **Supersedes:** 009 Chog City v3, an earlier draft whose best parts are folded in
**Target:** Chogathon 2026 · **Judging:** Novelty 30% · Fun 20% · Retention 20% · Clarity 15% · Execution 15% · plus a $CHOG bonus · **Gate:** the NFT must be essential
**Research inputs:** [Chog Raid](research/01-chog-raid.md) · [Fomopoly](research/02-fomopoly.md) · [Daemon](research/03-daemon.md) · [Hoodopoly](research/04-hoodopoly.md) (unreachable) · [Stonkboard](research/05-stonkboard.md) · [Vault Street](research/06-vault-street.md) · [Upland](research/07-upland.md) · [$MONO teardown](research/00-mono-monopoly-land.md)
**Practice City (playable sim):** [`app/index.html`](../app/index.html) · **Contracts:** [`contracts/`](../contracts/)

> **Name note:** the game is called **The Chog of Wall Street**. It's a Monopoly-style board, but we never use Hasbro's "Monopoly" mark. The design's roots are Lizzie Magie's *The Landlord's Game* (patent 1904, public domain).

---

## 0. One line
**A Monopoly city on Monad where the land belongs to Chog NFTs, not to wallets.**
- Every square is a real Monad app.
- Every brick you buy, every stamp you earn and every day you stay makes **that Chog** worth more.
- $CHOG pays for everything.
- Cashing out is allowed, but it costs enough that the smart move is to keep building, or sell the whole Chog.

**30-second pitch:**
1. Wake your Chog: it gets a vault and a pawn on the board.
2. Roll. Land on *Kuru Tower* and swap MON → $CHOG straight into your Chog. Land on *Magma Station* and stake MON for gMON. Land on *Perpl Pit* and pay rent to the Chogs that own it.
3. Your roll plan buys **Bricks** in the street you land on. Every Chog that later lands there pays your Chog rent.
4. Your bricks can never leave the Chog. Selling the empire means selling the Chog.

---

## 0.5 Ground rules (we have no budget)
1. **Zero-sum at the core.**
   - Every $CHOG a Chog earns was paid by another Chog: rent, a Heist, a tax, an exit tax.
   - Or it was given by a fan (hype).
   - Or it came from the Commons *surplus*, which is itself funded only by those flows.
   - **There are no emissions, no team-funded pools, and we never quote an APY.** Upland had to cut its pool-funded yield from 17.3% to 4.9%; we never make a promise that needs outside money.
2. **Every feature must move $CHOG through rent and Bricks, or it doesn't ship.** That's the written test against jampacking: Upland's side features that didn't feed the core loop are what dragged its engagement down.
3. **Everything that would need money waits for after the win** (§16).

## 1. The five idea sources, and what each one teaches us
**The rule we followed:** each source gives us one or two *lessons*, not a feature list. Anything that would only add complexity was left out (see §15 for what we rejected).

| # | Source | The lesson we take | Where it lives in The Chog of Wall Street |
|---|---|---|---|
| 1 | **Chog Raid** (chog-raid.vercel.app) | The NFT *is* a place that defends itself while you're offline. Traits change the rules through one table. The same daily featured thing for everyone | **Heist** and **Guards** (§6.4) · trait perks (§7) · Daily Hot Street (§9) · proof-of-visit receipts (§5.3) |
| 2 | **Fomopoly** (fomopoly.com) | Land is the asset, and **first and fast wins**: escalating parcel costs. A city that visibly grows. A golden tycoon statue. Variable jackpots | **Bricks** on bonding curves (§4) · buildings grow (§10) · **Golden Chog** (§9) · **Closing Bell** (§9) |
| 3 | **Daemon** (trydaemon.vercel.app) | The Chog owns a wallet, and **approvals are forbidden so a sale is safe**. Keepers run public calls for a tip. A hype jar that burns $CHOG | **Chog Vault** (§3) · keepers land rolls (§6.1) · **Hype a Chog** (§6.5) · moods (§8) |
| 4 | **Stonkboard** (stonkboard.online) | **The roll commits a plan and anyone can land it.** GO pays % of what you own, from surplus only. The bank always pays. A per-player property cap | Roll plans (§6.1) · Genesis Dividend (§4.4) · solvency invariant (§4.3) · the 40% per-Chog cap (§6.2) |
| 5 | **Vault Street** (vaultstreet.fun) | **Claim tax plus a streak reset proves the withdrawal design.** Upkeep stops earning but loses nothing. Robbers only take *unclaimed* rewards. **The NFT gets a revenue share** | Daily cash-out cap (§3.2) · **Property Tax** (§4.2) · Heist on unclaimed rent (§6.4) · **Sleeping Chog Dividend** (§4.4) |
| check | **Upland** (play.upland.me) | **Yield paid from a pool ends in cuts** (17.3% → 4.9%). Assets bound to land. Holding periods before bonuses. Newcomer-reserved land. Side features that skip the core loop kill engagement | The zero-sum core (§0.5) · Fair Start streets (§6.2) · 7-day hold on district bonuses (§5.3) · no cash transfers between Chogs (§3.1) |
| base | **Our Chog City v3, plus $MONO** (009) | An async shared table. Fractional shares. Magie's Prosperity dividend. A practice table | The whole skeleton |
| — | Hoodopoly (hoodopoly.fun) | The site was down. Only a fragment was recovered: a cartoon canvas board with pawn select | Toy-box art direction (§10) |

**What's new:** none of the five has **property owned by the NFT, a board of real dapps, and a withdrawal design that keeps the value inside the NFT**. That combination is the novelty pitch.

---

## 2. Design goals (what the user asked for), and how each is met

| Requirement | Mechanism |
|---|---|
| **Squares interact with real Monad dapps, as many as possible** | **28 named dapp squares plus 8 dapp cards (36 dapps in all).** Tier A: the Chog's vault calls the dapp on-chain through a whitelisted adapter. Tier B: a proof-of-visit receipt (§5) |
| **Properties belong to the Chog NFTs, not to users** | Bricks, stamps, Prestige and the vault are recorded **against the tokenId**. There's no transfer function. The only way to move an empire is to transfer the NFT |
| **Properties drive the NFT's worth up** | The **Appraisal** (§3.3) is a public value per Chog. Bricks earn rent forever, Prestige raises its share of rent, and stamps and traits add multipliers. The marketplace price should follow the Appraisal |
| **Make withdrawals restricted, diluted, not worthwhile** | Six layers (§3.2): bricks can never be withdrawn · 20% exit tax that pays the players who stay · a 48 h clearing queue · **cashing out resets Prestige** · a global daily cash-out cap · a 72 h lock after a sale. **Dilution:** idle Bricks with unpaid Property Tax earn nothing, and their rent goes to the Commons (§4.2) |
| **Zero-sum, because we have no money to fund it** | §0.5. Everything is paid by players to players, and every bonus is capped by the Commons surplus. **The Sleeping Chog Dividend** replaces a funded airdrop |
| **$CHOG powers the economy** | $CHOG is the unit of account for everything. MON enters only through dapp squares that **buy $CHOG**. Six burn sinks. **The game never mints anything** (§4) |

---

## 3. The Chog is the account

### 3.1 The Chog Vault (ERC-6551, a hardened Daemon pattern)
**Waking a Chog:**
- The canonical ERC-6551 registry deploys the **Chog Vault** (`ChogVault`), which belongs to that tokenId.
- Starting cash needs at least **10,000 $CHOG** (≈ $12 at today's price). It's deposited, never a fee.

**What lives where:**

| Asset | Where it's recorded | Can it leave? |
|---|---|---|
| **Cash** ($CHOG) | The game ledger, keyed by tokenId | Only through `cashOut()` (taxed and queued). **There's no Chog-to-Chog transfer** (Upland's lesson): cash moves between Chogs only through game actions, so you can't merge Chogs or dodge the tax |
| **Bricks** (shares of properties) | The game ledger, keyed by (property, tokenId) | **Never.** You can only sell them back to the curve, and the proceeds go to cash |
| **Dapp positions** (shMON, gMON, vault shares, tokens bought on nad.fun) | Inside the Chog Vault (6551) | Locked 7 days after the quest, then through `cashOut()` |
| **Stamps, Prestige, Warden points, history** | The game ledger | Never. They are the Chog's story |

**Vault safety rules (copied from Daemon, then tightened):**
- **CALL only.** No delegatecall.
- **Approval selectors are forbidden** (`approve`, `increaseAllowance`, `setApprovalForAll`, `permit`, Permit2). An allowance can't outlive a sale.
- **Only whitelisted adapters can be called.** The adapters can only swap or deposit *into* the vault, never send anything out.
- **Golden rule:** no admin key can move anyone's funds. If we disappear, `cashOut()` and the keeper functions keep working.

### 3.2 Withdrawal design: keep the value inside the NFT
**The problem:** in Daemon-style designs a holder can strip the Chog with one tap and dump the empty NFT. That kills the floor and the game's liquidity.

**Our rule:** *you can always leave, but staying, or selling the whole Chog, always pays better.*

| Layer | Rule | Why |
|---|---|---|
| 1. **Bricks are bound to the Chog** | They can't be withdrawn or transferred. You can only sell them back to the curve (5% spread to the Commons), and the proceeds stay as cash in the Chog | Land always stays with the NFT |
| 2. **Exit tax 20%** on `cashOut()` | Split: **50% to the Commons** (the players who stay), **25% burned**, **25% to the season pot**. A **Loyalty** discount takes −1% per full week since the Chog last cashed out, down to a **10% floor** | Leaving pays the stayers. That's a dilution penalty for leavers and an anti-dilution bonus for holders |
| 3. **A 48 h clearing queue** | `requestCashOut()` freezes the amount. It earns nothing and can't be used. After 48 h, `claimCashOut()` sends it | No bank-run sniping and no instant extract-and-dump |
| 4. **Cashing out resets Prestige** | Prestige grows **+1% per day** without a cash-out, up to **+50%** rent weight. **Any** cash-out resets it to 0 | Prestige is a stat **of the Chog**, so a high-Prestige Chog is worth more. Cashing out destroys value in the NFT itself |
| 5. **Global daily cap** (from Vault Street) | Cash-outs across all Chogs are capped at **2% of total game cash per UTC day**. Requests over the cap wait in line for the next day | Stops a death spiral. One clear rule |
| 6. **Moving Day: a 72 h lock after a sale** | When a Chog changes owner, the new owner can't cash out for 72 h. **Prestige, bricks and stamps carry over in full** | Buyers price the Chog on its *in-game* value, not as cash to strip. A buy-strip-dump trade isn't worth it |

**The holder's decision, worked through:** a Chog has 50k cash, 150k in bricks and +40% Prestige.

| Option | What you get | What you lose |
|---|---|---|
| **Cash out everything** | Sell bricks (−5%), then cash out (−20%). You keep about **152k** after 48 h | Prestige goes to 0 and the Chog becomes a bare NFT |
| **Sell the Chog on a marketplace** | A buyer pays for cash + bricks + Prestige (a bidder can value it at ≈ the Appraisal) | Nothing. **Usually the best way out.** It creates NFT volume and royalties for the Chog team |
| **Keep playing** | Rent keeps coming in at a 1.4× weight | — |

### 3.3 The Appraisal: the Chog's public value
```
Appraisal = cash
          + Σ bricks × curve sell price
          + dapp positions (oracle-valued)
          + income premium: last 7d rent × (1 + Prestige + stamps%) × 4 weeks   (displayed separately, "earning power")
```
**Where it's shown:**
- On every Chog's **Deed Card** page: art, Appraisal, Prestige, stamps (a passport), streets, mood and history.
- In a shareable OG image.
- Through a public API that marketplace aggregators can read.
- **The gap between floor and Appraisal is the arbitrage that pulls the NFT price up.**
- Chog Genesis metadata is immutable, so we can't change the image a marketplace shows. Our answer is the Deed Card, the API and bots that post "Chog #561's Appraisal is 3.4× floor".

---

## 4. The $CHOG economy (no minting, ever)

**Reference:** $CHOG ≈ $0.00116, mcap ≈ $1.16M, on Monad. Contract `0x3500…7777`, launched on nad.fun. Every number below is in $CHOG and will be tuned in the sim.

### 4.1 Where $CHOG comes in
1. **Waking deposits** (at least 10k) and top-ups.
2. **Dapp squares that buy $CHOG.** *Chog Alley* (the nad.fun pool) and *Kuru Tower* (Kuru) swap the player's MON → $CHOG **straight into the Chog's cash**. Every swap is market buy pressure.
3. **Hype** from fans.
4. *(After the win: sponsor top-ups to the season pot. For the MVP, the pot is funded only by in-game flows.)*

### 4.2 Where it goes out (sinks)
| Sink | Rate | Split |
|---|---|---|
| Brick buy fee | 3% | 1% burned · 2% Commons |
| Brick sell spread | 5% | 100% Commons |
| Extra rolls | 100 each | 50% burned · 50% Nad Lounge |
| Rug Jail bail | 500 | 50% burned · 50% Nad Lounge |
| Guards | 500 each | 50% burned · 50% Commons |
| Hype | any amount | **10% burned** · 90% to the Chog's jar |
| Exit tax | 20% (10–30%) | 25% burned · 50% Commons · 25% season pot |
| Gas and MEV tax squares | 5% of cash (max 1,000) / 750 | 100% Nad Lounge |
| **Property Tax** (Magie's land-value tax, Vault Street's upkeep) | **0.5% of Brick value per day**, prepaid up to 3 days | 100% Commons. **Unpaid Bricks earn no rent (it goes to the Commons), but they are never lost** |

### 4.3 Rent (the main flow)
- **Rent = base[colour] × buildingLevel multiplier × Hot Street (×2 if today's)**.
  - The building level is set by the property's curve reserve (§10).
  - The multipliers are 1 / 2 / 4 / 7 / 11 / 16, just like houses → hotel.
  - The bonus part of a Hot Street is paid by the Commons.
- **Split:** **90% to Brick holders pro rata, 10% to the Commons.**
- **A pull-based accumulator:** `rentPerBrick` grows, and holders claim any time. It's O(1) gas.
- **Claim multipliers:** Prestige, stamps, traits, mood and hype.
  - **The base share comes from the rent pool. The bonus above 1× is paid by the Commons** (or by the hype jar for hype), capped at what it holds.
  - Rent earned by Bricks with unpaid Property Tax goes **to** the Commons.
  - ⇒ **Bonuses are never minted.** The contract invariant is: the sum of all claimable amounts ≤ the $CHOG balance held.
- **The bank always pays** (from Stonkboard): the curve reserves always cover selling every Brick back. The Commons pays bonuses, dividends and cards **only from its surplus**, and never dips into money it owes.

### 4.4 The Commons (Magie's 1904 Prosperity rule)
- **Funded by:**
  - the 10% rent cut;
  - buy fees and sell spreads;
  - 50% of the exit tax;
  - guards;
  - Property Tax, and the rent from untaxed Bricks.
- **How inflow is routed (as built):** every $CHOG entering the Commons splits **80% Commons, 10% Sleeping Chog Dividend, 10% season pot.** The season pot also gets 25% of every exit tax.
- **Pays out:**
  - **The Sleeping Chog Dividend** (from Vault Street's NFT revenue share): **10% of everything flowing into the Commons accrues equally to all 1,969 Chog tokenIds, woken or not.**
    - Every Deed Card shows it: "this Chog has 3,240 $CHOG waiting".
    - **Claiming means waking the Chog.** The dividend lands as its starting cash.
    - It lifts the floor of the whole collection and pulls holders into the game.
  - **The GO salary ("Genesis Dividend"):** **1% of the Chog's Brick value, capped at 500**, every time it passes GO, from surplus only (Stonkboard). Own nothing, earn nothing, so owning land makes the Chog itself earn.
  - Commons Chest cards.
  - Claim bonuses.
  - **50% of the Commons at season end, split equally among every Chog that made ≥ 20 rolls** (Prosperity).

### 4.5 Why this holds up
- It's a **zero-sum game between players plus burns.** No emissions means no inflation spiral (Fomopoly's risk).
- **Winning players earn from losing players**, and the Commons recycles part of it to everyone active.
- **Exit friction keeps the TVL in the city**, so rent keeps flowing.
- **Each dapp landing is a real Monad transaction.** That's activity for the ecosystem and buy pressure for $CHOG.

---

## 5. The board: 40 squares, 36 Monad dapps

### 5.1 Layout (8 colour districts, one per Monad sector)
| # | Square | Type | District / dapp | Dapp quest (Tier) |
|---|---|---|---|---|
| 0 | **GENESIS** (GO) | corner | — | Collect the Genesis Dividend |
| 1 | **nad.fun Lane** | street · Brown | Launchpad: nad.fun | Buy any nad.fun token with ≥ 0.5 MON (**A**) |
| 2 | Commons Chest | card | — | Draw a Commons card |
| 3 | **Chog Alley** | street · Brown | Launchpad: the $CHOG pool | Swap ≥ 1 MON → $CHOG into the Chog (**A**) |
| 4 | **Gas Tax** | tax | — | Pay 5% of cash (max 1,000) to the Nad Lounge |
| 5 | **FastLane Station** | station | LST: shMON | Stake ≥ 0.5 MON → shMON (**A**) |
| 6 | **OpenSea Ave** | street · Light blue | NFT: OpenSea | Buy or list a Monad NFT (**B**) |
| 7 | Entropy | card | Pyth Entropy | Draw an Entropy card |
| 8 | **Magic Eden Way** | street · Light blue | NFT: Magic Eden | Buy or list a Monad NFT (**B**) |
| 9 | **Nad Names St** | street · Light blue | Names: Nad Name Service | Register a `.nad` name for the Chog Vault (**B**) |
| 10 | **Rug Jail** / Just Visiting | corner | — | — |
| 11 | **Rain St** | street · Pink | Payments: Rain | Hold ≥ 5 USDC in the vault (swap through Kuru) (**A**) |
| 12 | **Pyth Entropy Works** | utility | Oracle: Pyth | Rent = dice × 20 × level |
| 13 | **MetaMask Ct** | street · Pink | Payments: MetaMask | Bridge or onramp to Monad (**B**) |
| 14 | **Portal Pl** | street · Pink | Payments: Portal | A payment through Portal (**B**) |
| 15 | **Magma Station** | station | LST: gMON | Stake ≥ 0.5 MON → gMON (**A**) |
| 16 | **Kalshi Row** | street · Orange | Prediction: Kalshi | A deposit on Monad (**B**) |
| 17 | Commons Chest | card | — | — |
| 18 | **Polymarket Sq** | street · Orange | Prediction: Polymarket | A deposit on Monad (**B**) |
| 19 | **Kizzy Ct** | street · Orange | Prediction: Kizzy | Make a prediction (**B**) |
| 20 | **NAD LOUNGE** (Free Parking) | corner | — | **Win the whole pot** |
| 21 | **Perpl Pit** | street · Red | Perps: Perpl | Open and close a position ≥ $5 (**B**) |
| 22 | Entropy | card | — | — |
| 23 | **Obsidian Ave** | street · Red | Perps: Obsidian | Open and close a position (**B**) |
| 24 | **Narwhal Wharf** | street · Red | Perps: Narwhal | Open and close a position (**B**) |
| 25 | **aPriori Station** | station | LST: aprMON | Stake ≥ 0.5 MON → aprMON (**A**) |
| 26 | **Pendle Gardens** | street · Yellow | Yield: Pendle | Buy any PT on Monad (**B**) |
| 27 | **Maple Grove** | street · Yellow | Yield: Maple syrupUSDC | Deposit ≥ 5 USDC (**A**, ERC-4626) |
| 28 | **Chainlink Data Works** | utility | Oracle: Chainlink | Rent = dice × 20 × level |
| 29 | **Ethena Heights** | street · Yellow | Yield: sUSDe | Stake USDe → sUSDe (**A**, ERC-4626) |
| 30 | **GOT RUGGED** | corner | — | Go straight to Rug Jail |
| 31 | **Curvance Rd** | street · Green | Lending: Curvance | Supply ≥ 5 USDC or 0.5 MON (**B**) |
| 32 | **Euler Ct** | street · Green | Lending: Euler | Supply to an Euler vault (**A**, ERC-4626) |
| 33 | **HEIST** | special | Inspired by Chog Raid | Raid another Chog's cash (§6.4) |
| 34 | **Neverland Park** | street · Green | Lending: Neverland | Supply (**B**) |
| 35 | **Kintsu Station** | station | LST: sMON | Stake ≥ 0.5 MON → sMON (**A**) |
| 36 | Entropy | card | — | — |
| 37 | **Uniswap Boardwalk** | street · Dark blue | DEX: Uniswap | Swap MON → $CHOG on Uniswap (**A**) |
| 38 | **MEV Tax** | tax | — | Pay 750 to the Nad Lounge |
| 39 | **Kuru Tower** | street · Dark blue | DEX: Kuru (Monad-native CLOB) | Swap MON → $CHOG on Kuru (**A**) |

**On Entropy cards:** they name 8 more dapps: Aave, Morpho, Clober, Atlantis, Capricorn, Monday Trade, Drake and Valos, e.g. "Morpho vault payday: deposit 0.1 MON into a Morpho vault from your Chog and collect 300 from the Commons".

**Total:** **28 dapps on squares plus 8 on cards = 36.**

### 5.2 Ownable squares
- **22 streets, 4 stations and 2 utilities = 28 properties.** Each has its own Brick curve.
- **Stations (the LSTs)** add a **Commuter Pass**: a Chog that completed that station's stake quest pays **half rent at every station for 7 days**.
- **Utilities (the oracles)** charge rent from the dice: dice total × 20 × level multiplier.

### 5.3 Dapp quests: how a Chog "touches" a real dapp
| Tier | How | Verification |
|---|---|---|
| **A: on-chain, atomic** | The owner sends MON with `quest(tokenId, square, minOut)`. The **Chog Vault calls a whitelisted adapter**: a router swap (Kuru, Uniswap, the nad.fun curve), an **ERC-4626 deposit** (Euler, Maple, sUSDe; a generic adapter covers most lending and yield vaults) or an LST stake. The output stays in the vault | Same transaction. The adapter returns the amount and the game checks it. Nothing to trust |
| **B: proof-of-visit** | The owner uses the real dapp from their own wallet | Our indexer finds the matching event from that wallet within 24 h. It signs an **EIP-712 voucher** `(tokenId, square, txHash, expiry)`. The contract checks the signature and marks the txHash as used (Chog Raid's hash-claim pattern, moved on-chain) |

**Quest rewards:**
- **First completion:** a permanent **Patron Stamp** for that dapp in the Chog's Passport, worth **+1% claim weight each** (up to +28%).
- **Full district** (every stamp in a colour): **+5%** more, plus a district title on the Deed Card ("Perps Baron"). **The bonus only starts after the stamps have been held for 7 days** (Upland's collection holding period), so flipping a Chog to farm sets doesn't work.
- **Once per UTC day per square: +1 free roll.** This is the engine that brings people back to Monad dapps every day.
- **Stamps belong to the Chog.** A Chog with 28 stamps is a collector's item.

> **To verify before mainnet:** every dapp's contract address and interface (router, 4626 vault, LST deposit), and the event signatures for Tier B. **For the hackathon:** ship the generic swap and ERC-4626 adapters on testnet against mock dapps, plus **one real mainnet adapter (the $CHOG swap)** if time allows.

---

## 6. How a turn plays out

### 6.1 Rolling (an async shared table with no turns)
**Roll energy:**
- **+1 roll every 30 min, storing up to 8** (Uncommon and rarer: 9). Stonkboard showed that fast energy is what makes a session fun.
- **Extra rolls cost 100 $CHOG**, at most 10 a day.

**Every roll commits a plan (from Stonkboard).** The owner sets it once, and it's stored in the Chog:

| Plan | Behaviour |
|---|---|
| **Safe** | Buys Bricks only on streets up to building level 1, keeps 50% of cash in reserve |
| **Balanced** | Buys up to N Bricks anywhere, keeps 25% |
| **Degen** | Buys as much as it can, keeps 0% |
| **Custom** | `maxSpend`, `maxBricks` and `keepCash` |

- **Why:** the plan is fixed before the dice exist, so the whole landing resolves in **one settle**, and **anyone can land it**. You can't stall on a bad roll, and nobody can snipe.

**The dice:**
- 2d6. Doubles roll again; three doubles send you to Rug Jail.
- **Randomness, two steps:**
  1. `roll(tokenId)` commits at block *b*, along with the Chog's current plan.
  2. `settle(tokenId)` is callable by **anyone** from *b+2*. The seed is `keccak(blockhash(b+1), tokenId, nonce)`, mixed with the latest **Pyth Entropy epoch seed** when there is one.
- **The dapp does both steps for you.** Keepers settle anyone else's pending rolls for a 5 $CHOG tip.
- **Why:** Monad blocks are about 400 ms, so it still feels instant. Per-roll Entropy fees on mainnet are too high (a forum thread reports a fee of 40 MON), so we use **one Entropy request per epoch** to harden the seed.

**Landing resolves inside `settle()`:** move, pass GO, pay rent, cards, taxes, jail, **and buy Bricks according to the plan.**

### 6.2 Buying land, rent, and going broke
- **You can only buy Bricks where you land, through the roll's plan.** That's Fomopoly's FOMO plus dice that matter, and it rate-limits whales.
- **Fair Start streets** (Upland's FSA): the two Brown streets (nad.fun Lane, Chog Alley) only sell Bricks to Chogs with an **Appraisal under 50k $CHOG**. Newcomers always have an affordable way in. It costs the game nothing.
- **Cap: one Chog can hold at most 40% of a property's Bricks** (Stonkboard's per-player cap, applied per Chog). Ownership spreads across more Chogs, so more NFTs carry value. A whale with 10 Chogs has to *play* 10 Chogs.
- **You can sell Bricks anywhere, any time**, back to the curve (5% spread). The proceeds go to cash.
- **Rent you can't afford:**
  1. The Chog's Bricks auto-sell, cheapest first, until the rent is covered.
  2. If it's still short, the shortfall is written off. **There's never bad debt.** The Chog becomes **Broke** and goes to Rug Jail.
  3. The owner can top up any time.

### 6.3 Corners and taxes
| Square | Effect |
|---|---|
| **GENESIS** | Genesis Dividend from the Commons |
| **Rug Jail** | Get out by rolling doubles (3 tries), paying 500 bail, or with a "Get out of Rug Jail" card. **Inmate and Prisoner** trait Chogs need 1 fewer try ("they know the place") |
| **Nad Lounge** | **Win 25% of the pot.** It's a variable jackpot that never empties (Stonkboard: 5% of spare cash). Taxes keep refilling it |
| **Got Rugged** | Go to Rug Jail without passing GO |
| **Gas / MEV Tax** | Paid into the Nad Lounge pot |

### 6.4 Heist (Chog Raid's async defense, simplified)
**Landing on #33:** pick any target Chog with at least 500 unclaimed rent. **Newly woken Chogs are immune for 24 h** (Vault Street's Grand Opening).

| | Formula |
|---|---|
| **Success chance** | 55% + raider bonuses − target defense, clamped to 10–80% |
| Raider bonuses (traits) | Laser eyes +5%, heist hat (Robber/Mafia) +5%, knife +5% |
| Target defense | Tier (Common 0 / Uncommon 5 / Rare 10 / Epic 15 / Legendary 20%) + **Guards** (each 500 $CHOG, +5%, max 4; one wears off each season) |
| **Success** | Steal **10% of the target's *unclaimed rent*** (Vault Street: robbers only take unclaimed rewards). Cash and Bricks are never at risk. **Claiming into the Chog protects you** |
| **Failure** | The raider pays a **500 fine to the target** (Warden income), the target earns **Warden points**, and the raider goes to Rug Jail |

- The target gets an **alert**: "Chog #812 tried to rob you. Your guards held. +500."
- **Anti-farming:** Warden points count only from raiders with a different owner wallet. Heists on Chogs you own are blocked.

### 6.5 Hype a Chog (from Daemon)
- **Anyone** can hype any Chog with $CHOG: 10% is burned and 90% goes into the Chog's hype jar.
- Each hype adds **+0.10× claim weight for 4 h**, capped at **1.5×**. The boost is **paid only from the jar**, and whatever's left belongs to the Chog's cash.
- Cooldowns: 1 h per hyper, 5 min per Chog.
- **Why it matters:** a social loop. Friends, KOLs and DAOs can sponsor "their" Chog.

### 6.6 Autopilot and keepers (from Daemon, simplified by Stonkboard)
- **Autopilot is just the roll plan plus a switch.** With autopilot on, **anyone** can call `autoPlay(tokenId)` to use a stored roll with the saved plan. They earn a **5 $CHOG tip from the Chog's cash.**
- Autopilot also **prepays Property Tax** from cash.
- It never takes Heists or dapp quests, because those need the owner.
- **Result:** absent holders survive, but active players do better (quests, Heists, timing).

---

## 7. Traits matter, but only a little (capped at about 10%)
These use the real trait values from Chog Genesis (taken from Chog Raid's `traitRules.ts`).

| Trait | Perk |
|---|---|
| Tier: Uncommon / Rare / Epic / Legendary | Roll storage 7 · +3% / +6% / +10% claim weight · base Heist defense 5/10/15/20% |
| **Legendary 1/1s (10 Chogs)** | **Landmark Chogs:** a gold standee and a named title ("Blaze, the Inferno") |
| Laser eyes / heist hats / knife | +5% Heist success |
| Visor, VR and glasses eyes / guard outfits | +5% Heist defense |
| Inmate, Prisoner | −1 Rug Jail try |
| Gold tooth, BTC coin, Mon coin (treasure mouth) | +5% on Commons Chest payouts |
| Crown and royal headgear / royal aura | −10% bail |
| Fire shirt, fiery aura | Rent paid on Red (Perps) streets −5% |

**Rarer Chogs are slightly stronger** and wear their tier, so the floor of each tier follows the game. Skill still matters more.

---

## 8. Moods (from Daemon): the Chog reacts to its empire
| Mood | When | Effect |
|---|---|---|
| **Tycoon** | Top 10% by Appraisal | Crown on the pawn |
| **Flexing** | Hyped and income up | Sparkles |
| **Chaotic** | Income swung by more than 2× | Wobble |
| **Smug** | Income ≥ last week | "Rent's in. As expected." |
| **Tired** | Property Tax unpaid, or no action for 3 days | Cosmetic: the pawn yawns. The real cost is Property Tax (§4.2). A hype or any action wakes it |
| **Broke** | Cash at 0 and in jail | The barrel-and-braces pawn |

---

## 9. Retention: why people come back
| Loop | Cadence | Source |
|---|---|---|
| Roll energy +1 every 30 min (cap 8) | Several sessions a day | Stonkboard |
| **Property Tax is prepaid at most 3 days ahead** | Every ≤ 3 days | Vault Street |
| **A free roll for every dapp quest**, once per square per day | Daily | New |
| **Daily Hot Street:** rent ×2 on one street (hash of the UTC date, the same for everyone) | Daily | Chog Raid |
| Prestige +1% a day, which you lose by cashing out | Daily, compounding | New |
| **The Sleeping Chog Dividend grows on every Deed Card** ("wake me") | Always | Vault Street |
| Heist alerts, plus a "buy a guard?" nudge | When it happens | Chog Raid |
| **Seasons: 7 days, Monday 00:00 UTC.** The city is **persistent**; only leaderboards and the pot reset | Weekly | Chog Raid |
| **The Closing Bell (Fomo3D):** in the last 24 h of a season, each Brick buy adds 60 s to a timer. At zero, **the last buyer wins 10% of the season pot** | Weekly climax | Fomopoly |
| **The Golden Chog:** last season's #1 by Appraisal growth stands as a **gold statue in the board's centre** and earns 1% of all rent next season | Weekly | Fomopoly |

**Season pot split:**

| Share | Who gets it |
|---|---|
| 40% | Top 10 by Appraisal growth |
| 30% | **Prosperity:** equal shares to every Chog with ≥ 20 rolls |
| 15% | Top Wardens |
| 10% | Closing Bell winner |
| 5% | Golden Chog |

---

## 10. Look and feel
- **A toy-box diorama board** (Hoodopoly's cartoon brightness meets Fomopoly's isometric city):
  - Chunky tiles.
  - The centre of the board is a **Chog Street skyline** with the **Golden Chog statue**.
  - A **day and night cycle** on real UTC time.
- **Buildings grow with each property's Brick reserve:** lot → cottage → shop → tower → skyscraper → neon landmark.
- **Your real Chog art is the pawn**, as a hopping standee. It wears its mood and tier.
- **Juice:**
  - Dice tumble.
  - Coins arc to the Brick holders, with a "RENT!" stamp.
  - The vault door opens on a quest.
  - A gavel on a Heist.
  - A neon sign flashes on a Nad Lounge jackpot.
  - The Closing Bell ticks red.
- **The dapp square's real logo is on the tile**, with a "Do it for real" button.

---

## 11. Go-to-market (hackathon plus after)
- **Practice City** (no wallet, bots, fast-forward) is the judge path, like Daemon's practice mode.
- **Share cards (free):** every Deed Card exports a share image with the Chog's Appraisal and its **waiting Sleeping Chog Dividend** ("Chog #561 has 3,240 $CHOG waiting, wake it"). That's the viral hook, and it costs nothing.
- **Rent-a-Chog (stretch, from 009):** holders who won't play can delegate their Chog to a player for a revenue split (owner 30%). Players without a Chog get in, and demand for Chogs goes up.
- **Dapp partners (after the win):** each square is a free billboard. Partners could later sponsor Hot Street days or top up the season pot (§16).

---

## 12. Exploits we've thought about
| Attack | Mitigation |
|---|---|
| Strip the cash, then dump the NFT | §3.2: taxes, queue, Prestige reset, Moving Day. Bricks can't be withdrawn at all |
| Wash rent between your own Chogs | 10% to the Commons plus the 3% buy fee and 5% sell spread make it a loss |
| Sniping Bricks just before a big landing | You can only buy through a roll plan committed before the dice. Landing, rent and buying resolve atomically in `settle()` |
| One whale buys a whole street | The 40% per-Chog cap |
| Stalling on a bad roll | Anyone can land a committed roll (Stonkboard) |
| Grinding the dice | Commit → future blockhash → Entropy epoch mix. Low stakes per roll |
| Farming Heists against your own wallets | Same-owner Heists are blocked. Warden points need distinct owners. Thresholds borrowed from Chog Raid |
| A bank run | 48 h queue and the global daily cap |
| Approval left behind after a sale | Approval selectors are forbidden in the vault (Daemon) |
| Spoofed quests | Tier A is atomic. Tier B uses a signed voucher plus a used-txHash registry, a 24 h window, and the wallet must be the Chog's owner at the time |
| Bonus multipliers creating money | Bonuses are paid by the Commons or the jar, capped by their balances. Invariant tests |

---

## 13. MVP: what ships for the Chogathon (deadline Oct 23, 15:00 UTC)
**Must have:**
1. **Practice City**, a playable single-file sim (`app/index.html`):
   - The 40-square board, your Chog plus bots.
   - Roll plans (Safe / Balanced / Degen), Bricks with the 40% cap, rent, the Commons.
   - Property Tax and the Sleeping Chog Dividend.
   - Nad Lounge, Rug Jail, Heist (unclaimed rent) and Hype.
   - **The cash-out panel with the tax, the queue and the Prestige reset.**
   - Dapp quests (simulated, with a "Do it for real" link).
   - The Appraisal.
   - The season and the Closing Bell.
2. **Contracts** (`contracts/`):
   - `The Chog of Wall Street.sol`: rolls with committed plans, settle (anyone), movement, Brick curves with the per-Chog cap, rent accumulator, Property Tax, pots, Sleeping Chog Dividend, cash-out (tax, queue, Prestige, daily cap, Moving Day), hype.
   - Mocks for $CHOG and the Chog NFT.
   - Tests for the economy invariants.
3. **The demo video:** wake → roll → land on Kuru Tower (swap MON→$CHOG into the Chog) → buy Bricks → bot lands, RENT! → try to cash out (show the 20% and the Prestige loss) → sell the Chog on the marketplace instead.

**Stretch:**
- The `ChogVault` 6551 account and adapters on testnet.
- The Tier B voucher signer.
- Keepers and autopilot.
- Guards UI.
- Rent-a-Chog.

## 14. Open questions
1. **Mainnet or testnet for judging?** The Chogathon page doesn't say. The plan: Practice City plus testnet contracts, with mainnet read-only Chog ownership through the real `ownerOf`.
2. **Dapp addresses and interfaces:** every adapter target needs verifying against Monad mainnet docs.
3. **Pyth Entropy fee on Monad mainnet:** confirm, and size the epoch cadence to fit.
4. **Tuning:** exit tax, Prestige rate, rent bases and curve slopes. Tune them in the sim first.
5. **Optics:** call it a strategy game, never a "Ponzi" (unlike Fomopoly). Keep stakes small and make Practice City the default.
6. **Hoodopoly:** the site was down. Re-check it and update the sources table.

---

## 15. Changelog v2: what Stonkboard and Vault Street taught us
**Adopted.** Each one *replaces* or tightens something that was already here, so the game got simpler:
1. **Roll plans plus anyone-can-land** replace the "stand and buy" window, and they merge autopilot into one feature.
2. **The Genesis Dividend is 1% of the Chog's Bricks**, from surplus only. That replaces a flat salary.
3. **Bank-always-pays solvency rule.**
4. **The 40% per-Chog Brick cap.**
5. **Faster energy:** 30 min per roll, store 8.
6. **Property Tax** replaces the Tired claim penalty. It's the dilution lever for absent holders.
7. **The Heist steals unclaimed rent only.** Newly woken Chogs are immune for 24 h.
8. **A global daily cash-out cap** replaces the bank-run surcharge formula.
9. **The Sleeping Chog Dividend:** NFT revenue share for all 1,969 Chogs, and the onboarding hook.
10. **The Nad Lounge pays 25%** of its pot.

**Rejected, on purpose, so the game doesn't get jampacked:**
- **Hostile takeovers, shields and rent spikes** (Stonkboard). They need single-owner deeds, and Bricks plus the Heist already cover PvP.
- **NFT fusion** (Vault Street). We won't burn Chogs.
- **Emission pools** (Vault Street). We mint nothing.
- **drand** (no Monad verifier yet).
- **Price-linked rent.**
- **ETH-bought treasuries.**
- **Build timers** (maybe later).

**v3 (Upland, zero budget).** Each change is small:
- **Ground rules (§0.5):** zero-sum core, a no-APY rule, and the "every feature feeds rent and Bricks" test.
- **Fair Start streets** (Brown is for Chogs under 50k Appraisal).
- **A 7-day hold before district bonuses.**
- **No Chog-to-Chog cash transfers.**
- **Funded things moved out of the MVP:** the Founder starter pool and sponsor pots. They're replaced by free share cards and the Sleeping Chog Dividend.
- **Rejected from Upland:**
  - status-scaled cash-out holds (they favour whales);
  - a pegged currency ($CHOG stays real);
  - recycling idle accounts (we never take a Chog);
  - treasure hunts, racing and shops (side features).

## 16. Perks to add after the win (only once there's money or partners)
These are kept out of the MVP on purpose. Each one is an *add-on* to a zero-sum game that already works:
1. **Founder starter cash:** a funded pool, visible on-chain, for the first 500 Chogs that wake up.
2. **Sponsored season pots** from Monad dapp partners, who "buy" their square's Hot Street days.
3. **Dapp-partner quest rewards:** partners pay a bonus for real usage of their app from the board.
4. **More real Tier-A adapters,** after an audit of the vault and adapters.
5. **Rent-a-Chog delegation markets.**
6. **Governance for Chog holders:** pick the dapp list and the Hot Street calendar (Vault Street's NFT votes).
7. **Building timers and animations** (anticipation hooks).
8. **A mobile app with sign-in by email** (Privy, like Daemon).

