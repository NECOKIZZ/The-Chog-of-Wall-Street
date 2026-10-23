# The Chog of Wall Street: open problems

Status: 23 Oct 2026.

| Section | Status |
|---|---|
| 0. UI first | Done: the redesign is live and approved |
| 1. Camping | Done: the 48-hour rule is in the contract and in Practice |
| 2. The 47-hour loophole | Done: two leaderboards, and prizes follow "This season" |
| 3. Deposits | Done: everyone opens with $20; top-ups are capped at $20 per season |
| 4. Older open items | Still open (see `HANDOFF.md` §4) |
| 5. Stablecoin | Done: USDC is the game money, and $CHOG is the utility token with a buyback-and-burn |

---

## 0. The UI comes first

The new UI (landing, Desk, Map, Bank, Rules) is live, but the team isn't happy with it. Before any rule change, decide what "right" looks like:

- [x] Which screens feel wrong, and why (cluttered, confusing, ugly, too much reading)?
- [x] References for the look we want (sites, games, screenshots)
- [x] What a new player must understand in their first 10 seconds
- [x] What can be cut entirely

Every rule change below adds something to the screen (a timer, a second leaderboard, a cap). Settle the UI first so those additions have a place to go.

---

## 1. Not rolling is the safest strategy (camping)

**The problem.** You only pay rent when **you** land on someone else's street, but your Bricks keep earning when **others** land on yours. A Chog that never rolls:

- never pays rent, never hits tax squares, Rug Jail or bad cards;
- **can't go bankrupt** (bankruptcy only happens when you can't pay rent);
- is **exempt from the season-end wealth tax**, which only counts "active" Chogs with 5+ rolls;
- still earns rent, still gains Prestige (+1% a day), still gets the Sleeping Chog Dividend.

Its only costs are Property Tax (0.5% of its Bricks' value per day), missing the season prizes, and not growing.

**Result.** In a zero-sum game, campers quietly drain the active players.

**Agreed direction: the 48-hour rule.**

- Rolls still refill every 30 minutes and stack to 8 (9 for non-Common Chogs). No change.
- Every roll resets a **48-hour clock**.
- If 48 hours pass without a roll, **your streets stop paying you**. Chogs landing there still pay, but your share goes to the Commons.
- **One roll switches rent back on**, from that moment. Missed rent is **not** paid back, otherwise camping would just pay later.
- You keep your Bricks, cash, Prestige, stamps and the Chog's value. Nothing is taken.
- A Desk timer ("Earning rent · 47h left · Roll to reset"), with warnings at 36 h and 12 h.
- New accounts start with a full 48 hours.
- Chogs whose rent is off still count for the season-end wealth tax.
- No auto-rolling: players must make their own decisions, and real-life absences shouldn't be over-punished.
- No "away days": 48 hours is the agreed maximum.

**In one line, for players:** "Roll at least once every two days, or your streets stop paying you until you do."

**Rejected:** auto-rolling when the roll meter is full. It takes decisions away from players and punishes real absences. The meter also fills in 4 hours today, which is far too fast.

**To build:**
- [x] Practice: the rule, the Desk timer ("Your streets earn for …") and to-do warnings under 12 h and when stopped
- [x] Contract: `lastRoll` per Chog and `earningUntil(id)`; the rent checkpoint sends rent to the Commons after `lastRoll + 48h` (unit-tested)
- [x] Wealth tax: Chogs whose rent is off count as active (Practice; on-chain wealth tax is still pending)

---

## 2. The 47-hour loophole

**The problem.** A player can roll once just before the 48-hour clock runs out, wait, and repeat. That's about 3–4 rolls a week.

**Team view: a welcome loophole.** That player barely lands on new streets, so they barely grow, and every roll still risks rent. It's lazy play, not an exploit.

**Its downsides:**
1. **Whales can coast.** Rent scales with how much you own, not how often you roll. A big early buyer doing this collects from every active player at almost no risk. Long term that makes early buyers landlords and everyone else tenants.
2. **They can sit on top of the leaderboard.** The current leaderboard ranks total net worth, so a coasting whale can stay #1 without really playing.
3. **It's easy to script.** On-chain, anyone can write a bot that rolls every 47 hours. The rule then stops campers who can't code and not the ones who can.
4. **The board gets quieter.** Fewer landings means less rent moving around, so active players earn less from each other.

**What already limits it:**
- **Property Tax** grows with holdings.
- **One Chog can own at most 40% of a street.**
- **Season prizes reward growth this season, not total wealth.** 40% of the pot goes to the top 10 by growth, 30% to Chogs with 20+ rolls, and 10% to the Closing Bell winner (the last Brick buyer).

**Proposed fix: two leaderboards.**
- **Richest** shows total net worth. A coasting whale can top it.
- **This season** shows growth since the season started. Active players top it, and **it's the one that pays prizes.**

**To build:**
- [x] A Leaders page with This season and Richest tabs (This season ranks `appraisal − seasonAppraisal`). On-chain, growth reads 0 until the contract stores start-of-season values

---

## 3. Deposits favour whales

**How it works today:**

| | Minimum | Maximum |
|---|---|---|
| Practice | 10,000 (play money; the slider starts at 20,000) | 60,000 at sign-up, then unlimited top-ups |
| Testnet | 10,000 (free test $CHOG) | no cap |
| Mainnet (planned) | 10,000 $CHOG ≈ 670 MON ≈ $13 | 250,000 cash **at one time** ≈ $335 |

Prices are from Oct 2026 (1 MON ≈ 14.9 $CHOG, 1 MON ≈ $0.02). Re-check them before launch.

**The problem.** The mainnet cap (`maxDeposit`, checked as `cash + amount`) only limits **cash held at one time**. A whale can deposit 250k, let their plan spend it on Bricks, top up another 250k, and repeat. Combined with problem 2, a big early depositor buys the board and then coasts.

**Options, fairest first:**
1. **Everyone starts equal (recommended).** A fixed opening deposit (e.g. 20,000) and top-ups capped per season (e.g. +20,000). Skill and luck decide, not wallet size, like Monopoly where everyone gets $1,500.
2. **Lifetime cap per Chog.** Deposit anything from 10,000 up to e.g. 100,000 total over the Chog's life, counting top-ups.
3. **Keep it as it is.** Easiest to run, but whales can buy the top spots.

**To decide:**
- [x] Which option, and the numbers: **everyone starts equal**. $20 opening deposit, $20 of top-ups per season (USDC from app squares counts)
- [x] Contract: `START_DEPOSIT`, `TOPUP_CAP`, `seasonTopUp` per Chog (unit-tested); `maxDeposit` stays as a cash cap for the guarded launch

---

## 4. Already known, still open (from `HANDOFF.md`)

- **Bankruptcy is Practice-only.** On-chain needs a `bankruptUntilSeason` flag.
- **The season-end wealth tax is Practice-only.** On-chain needs a keeper or Merkle settlement.
- **On-chain messages between Chogs** need a small `ChogMail` contract. Today the Message button says "coming soon" on Testnet.
- **Scaling to ~2,000 players.** The app reads only the first 100 Chogs and makes too many RPC calls. Needs:
  - a lens contract that returns many Chogs per call;
  - events for an indexer;
  - paged lists;
  - a dedicated RPC.
- **Mainnet is not deployed.** On hold by decision until testing is done.

---

## 5. Switching the game currency from $CHOG to a stablecoin (AUSD or USDC)

**Why it's being considered.** $CHOG is too volatile. A player could top the leaderboard and still leave poorer if the token fell that week, so playing would feel pointless.

**Benefits:**
- **Prices mean something.** "Rent is $2" is clear. "Rent is 1,500 $CHOG" changes meaning every day.
- **Winning is real.** What you win is what you leave with.
- **Balance is stable.** A $CHOG pump or dump no longer makes the game randomly cheap or expensive in the middle of a season.

**Costs:**
1. **$CHOG loses its role.** "$CHOG powers the economy" was in the original brief. Without a design fix (below), $CHOG gets nothing from the game.
2. **Burning a stablecoin just destroys players' money.** Today's burns make every $CHOG holder a little richer. Every burn needs a new destination.
3. **It reads more like gambling.** Dice, real dollars and payouts (the season pot, the Nad Lounge jackpot) look closer to a casino. Do a sanity check before mainnet.
4. **Contract work.** The contract assumes 18 decimals; USDC and AUSD use 6. Every constant needs rescaling: the 10,000 minimum deposit, Brick prices, rent, fees, bail, guards, extra rolls and the deposit cap. The minimum deposit becomes roughly **$10–20**. Unit tests, fork tests, the deploy scripts and Practice's numbers all need redoing.
5. **The nad.fun squares change meaning.** "Buy $CHOG into your Chog" is no longer "add cash". It becomes a side position held by the Chog, like the staking squares.

**Recommended design: players use dollars, fees buy $CHOG.**
- **Players only touch the stablecoin:** deposits, cash, Bricks, rent and cash-outs.
- **Every amount burned today is instead swapped into $CHOG on nad.fun and burned.** That covers:
  - the 1% burn on Brick buys;
  - a quarter of the cash-out tax;
  - 10% of hype;
  - half of bail;
  - half of extra rolls;
  - half of guards.
  The contract already buys $CHOG on nad.fun (the nad.fun adapter), so this reuses proven code. A keeper or anyone can call the swap in batches, to save gas and avoid tiny swaps.
- **Result:** a stable game with one token for players, and steady $CHOG buy pressure from every game played. The pitch becomes **"the game buys $CHOG"** instead of "the game uses $CHOG".

**AUSD or USDC:**
- **AUSD:** preferred if it's what the Chog ecosystem uses. Before building, confirm on Monad mainnet:
  - [ ] the AUSD contract address
  - [ ] its decimals
  - [ ] a liquid AUSD↔MON (or AUSD↔$CHOG) pool for the fee swaps
- **USDC:** the fallback. Already verified on Monad mainnet (`0x754704Bc059F8C67012fEd69BC8A327a5aafb603`) with a working Uniswap MON pool.

**To decide:**
- [x] Stablecoin: yes, **USDC** (verified on Monad). $CHOG keeps its utility
- [x] Keep the "fees buy and burn $CHOG" design: yes. Plus extra rolls (100 $CHOG), guards (500 $CHOG) and hype (10% burned, 90% tipped to the owner) are paid in $CHOG
- [x] New number scale: one game unit = $0.001, so the old numbers carry over (a 60-unit rent is $0.06)

**To build** (after the UI):
- [x] Contract: `CASH` (USDC) and `CHOG`, the unit `U = 1e3`, a `buybackPot` and `buyback(minChog)`
- [x] Adapters: nad.fun holds $CHOG for the Chog; Uniswap swaps MON→USDC into cash; `ChogBuybackAdapter` does USDC→WMON→$CHOG→burn (fork-tested: $0.02 burned ~14 $CHOG)
- [x] App: dollars everywhere, $CHOG for power-ups, the Bank shows the pot and the burn, with a buyback button on-chain
- [x] Re-run the unit, fork and zero-sum tests: 13 unit and 9 fork tests pass; testnet redeployed

---

## How these fit together

Problems 1–3 are one issue: **passive wealth beats active play.**

- The 48-hour rule stops idle Chogs from earning.
- Two leaderboards stop idle wealth from winning prizes.
- Deposit limits stop wealth from being bought outright.

Together they make the game about playing, not about holding. Each can still be built and shipped separately.
