# The Chog of Wall Street: handoff and build guide

**Read this first** if you're picking up the project. It covers:
1. what the game is;
2. what's built and deployed;
3. what's in progress;
4. exactly how to continue.

Last updated: 2026-10-22 (Chogathon deadline: Oct 23, 15:00 UTC).

**Golden rule from the team:** sophisticated mechanics, but a UI anyone understands in seconds. **If something is too complicated or doesn't work, leave it out.** Bugs cost more than missing features.

---

## 1. What it is (one paragraph)
A Monopoly-style city on Monad where **the land belongs to Chog NFTs, not wallets**.
- A player "opens an account" by depositing $CHOG into their Chog.
- They roll, land, and their **buying plan** (Safe, Balanced or Degen) buys **Bricks**: shares of a street. Every Chog that later lands there pays rent to the Brick holders.
- Bricks, stamps and Prestige live **inside the NFT** and can never be withdrawn. **Selling the Chog sells the empire.**
- Cashing $CHOG out is allowed, but it's taxed (10–20%), queued for 48 hours, capped city-wide, and it resets Prestige. So staying, or selling the whole Chog, pays better.
- **Zero-sum:** the game never mints. Every coin comes from another player, a fan (hype), or the shared Commons pot, which is funded only by fees and taxes. We have no budget, so this is a hard rule.

Full design: [`PLAN.md`](PLAN.md). Research on the 8 reference projects: [`research/`](research/).

---

## 2. What exists today

### Live
| Thing | Where |
|---|---|
| Web app (Practice, Testnet, Mainnet cities) | https://necokizz.github.io/The-Chog-of-Wall-Street/. Auto-published from `main` by `.github/workflows/pages.yml` whenever `app/**` changes (about 40 s) |
| Testnet contracts (chain 10143) | Game `0x09741a1CBaBc28c7034cF6F941B571CA3601f30d`, mock $CHOG `0xc5fC…fcAF`, mock Chog NFT `0x5b5D…F645`, mock swap adapter `0x4204…d4f3`. See `contracts/deployments/monadTestnet.json` |
| Mainnet contracts (chain 143) | **Not deployed yet.** The deployer wallet needs about 3 MON. Then run `npx hardhat run scripts/deploy-mainnet.js --network monad` (a dry run on a fork already passes). Afterwards, paste the output into `MAINNET_DEPLOYMENT` in `app/src/chain.js` |
| Deployer wallet | `0x6D55dF0ca3E3DbDcBb2eE0edc54633aE313dac3d`. **The private key was generated in a temporary cloud session.** If you don't have a saved copy, make a new wallet for the mainnet deploy |

### Code map
| Path | What |
|---|---|
| `contracts/contracts/ChogOfWallStreet.sol` | The whole game on-chain: wake, roll (commit) and settle (anyone can land it), Bricks on curves with a 40% per-Chog cap, rent accumulator, Property Tax, claim bonuses from the Commons surplus, cash-out rules, hype, heist, quests, Closing Bell, awake list, deposit cap |
| `contracts/contracts/adapters/QuestAdapters.sol` | **Real mainnet dapp adapters**, fork-tested: `NadFunChogAdapter` (buy $CHOG), `LstAdapter` (shMON, aprMON, sMON), `UniswapUsdcAdapter` (MON→USDC). Positions are held per Chog tokenId; the holder withdraws after 7 days |
| `contracts/config/monad-mainnet.js` | Every verified mainnet address, plus the notes on what's **not** wired (Kuru, Magma) and why |
| `contracts/test/*.test.js` | 10 unit tests (incl. the zero-sum invariant) and 7 mainnet-fork tests (`FORK=1 npx hardhat test test/mainnet.fork.test.js`) |
| `app/src/` | The app parts. `build.sh` builds the single file `app/index.html` |
| `app/src/game.js` | **Current** UI and engine (one file). It's what the live site uses today |
| `app/src/engine.js` | **New** engine-only split of `game.js` (see §4). Not wired into the build yet |
| `app/src/chain.js` | On-chain mode: wallet connect, find your Chogs (with retry), wake, roll+land, claim, tax, hype, heist, cash-out, real quests with quotes, positions |
| `app/src/guide.js` | Onboarding: a 10-step tour, one-time hints, the "First rounds" checklist, Help and glossary |
| `app/src/modes.js` | The city picker (Practice, Testnet, Mainnet) |
| `app/src/logos.js` | Embedded brand icons for the 5 wired dapps (nad.fun, FastLane, aPriori, Kintsu, Uniswap) |
| `app/src/chogtable.js`, `chogart.js` | All 1,969 Chogs (name, image number, tier, traits) plus 15 embedded portraits |

### Verified facts you can rely on
| Fact | Detail |
|---|---|
| $CHOG `0x3500…7777` | 18 decimals, ~1B supply. Main liquidity: the nad.fun DEX pool `0x116e…d8f1` (1% fee) |
| Exchange rates (Oct 2026) | **1 MON ≈ 14.9 $CHOG; MON ≈ $0.02.** Quest amounts must be tens of MON to matter |
| Uniswap's $CHOG pools | Dust. Uniswap Boardwalk therefore swaps MON→USDC |
| Kuru v1 order books | No bids (`MarketStateError`) |
| Magma gMON | Deposits revert. **Neither Kuru nor Magma is wired.** Don't add them back without a passing fork test |
| Monad RPC `eth_getLogs` | Only 100 blocks per call. The public RPC rate-limits (HTTP 429): always read through the retry helper `rc()` in `chain.js` |

---

## 3. Decisions already made (don't relitigate)
- **Persistent city, weekly seasons.** The city never resets. Seasons are 7 days. The last 24 hours are the Closing Bell: each Brick buy adds 1 minute, and the last buyer wins 10% of the season pot.
- **Unwired dapps are removed from the board.** Only the 6 real squares keep a brand: nad.fun Lane, Chog Alley, FastLane, aPriori, Kintsu, Uniswap Boardwalk. The other 22 are in-game Wall Street streets with **no external links**. Players must never need to leave the app. Done in `engine.js`; not yet in `game.js`/live.
- **Players see only their own Chog on the map.** Other Chogs appear only in a street's owner list, on its title-deed card, with **DM** and **Hype** buttons. And on the leaderboard (below).
- **Dice stay** (they're what makes rent a game). **Autopilot** for absent players is still to be built on-chain (see §5).
- **Cards exist:** "Market News" (Chance, 3 squares) and "Commons Chest" (community, 2 squares). On-chain there's one simplified deck of 8.

---

## 4. In progress: the UI rebuild (the team's top priority)
**Feedback:** the old UI was "diabolical" and "jammed". It was one dark screen with everything visible at once.

**New information architecture:**
1. **Landing page** (new):
   - hero, using the angled board as the visual;
   - a ticker marquee;
   - How it works (4 steps: Wake → Roll → Collect → Stay or sell);
   - "Real Monad apps on the board" (the 6 logos);
   - why your Chog gains value; fair by design;
   - the three cities; FAQ.
   - CTA: **Open an account**.
2. **Open an account:** pick a city → pick a Chog → deposit. Practice needs no wallet.
3. **App,** with a floating glass nav pill: **Desk · Map · Bank · Rules** (a bottom tab bar on phones).
   - **Desk (home after login):**
     - your Chog card (art, Appraisal, Prestige, mood);
     - "Your move" (rolls ready, ROLL);
     - **"While you were away"** (from `G.activity`);
     - **Inbox / DMs** (`G.inbox`, `sendDM()`);
     - a to-do list (claim rent, tax running out, cash-out ready, jail);
     - City today (Hot Street, pots, **season timer**);
     - the First rounds checklist.
   - **Map:**
     - the board **from an angle** (CSS 3D: `rotateX(55deg) rotateZ(-45deg)`, pawn counter-rotated to stand up), with a Flat toggle;
     - **only your pawn**;
     - tapping a square opens the **title deed**: the colour band, a rent table by building level with the current level highlighted, Brick price, owners (avatar, %, DM, Hype), the quest (only on the 6 wired squares), and Sell 1 Brick.
     - Dice, ROLL, plan and roll meter sit in a side rail.
   - **Bank:** cash and Appraisal, claim, deposit/top-up, Property Tax (prepay/autopay), guards, dapp positions, cash-out with the breakdown, "sell the whole Chog instead", the queue, and your streets.
   - **Rules:** how to play, every square, the glossary, the economy, the cities, the FAQ.
4. **Style:** Kickoff's structure (see the `NECOKIZZ/kickoff` repo, `app/globals.css`):
   - Fraunces for headlines, Inter for body, JetBrains Mono for numbers;
   - diagonal cards (`border-radius: 24px 4px 24px 4px`);
   - a floating glass nav pill;
   - `rounded-t-[50px]` section bands;
   - a marquee.

   **Our colours, not Kickoff's:**
   - Light mode: banknote-mint paper `#EEF1E8`, cards `#FBFCF8`, ink `#13201A`, Chog purple `#6B3BEF`, money green `#0F8A52`, gold `#C8961B`, red `#D23A4E`.
   - Dark mode: paper `#0E1511`, card `#18231C`, ink `#ECF2EA`, purple `#9C7CFF`, green `#33D07D`.
   - Light is the default, and every colour is a token.

**State of the rebuild:**
- `engine.js` is extracted from `game.js` lines 1–370. It has the new board names, cards, `act()` for the Desk and the DM system with bot replies.
- `logos.js` is ready.
- **Next:**
  1. Write `ui.js` (landing, onboarding, Desk, Map, Bank, Rules, title deed, DM, card and heist modals). Port the remaining practice actions from `game.js` (lines 371–805: `rollMe`, `doQuest`, `requestCashOut`, `claimCashOuts`, `initWorld`, `wakeScreen`) into it.
  2. Rewrite `head.html` and `body.html`.
  3. Point `guide.js` selectors at the new elements: the tour becomes Desk → Map/ROLL → title deed → Bank → checklist.
  4. Adapt `chain.js`: it renders into the onboarding step and calls `openTile`, `openCard`, `openHeist`, `showDice`, `renderPawns`, `render`, `log`, `toast`, `closeSheet`. Keep those names. For "While you were away" on-chain, save a per-Chog snapshot in `localStorage` and show the differences on return (rent earned, rent robbed, hype received). Event logs are limited to 100 blocks.
  5. Update `build.sh` to include `logos.js engine.js ui.js` (and drop `game.js`).
  6. Re-run the browser tests (§6), then push.

  The old `game.js` stays live until the new UI passes the tests.

---

## 5. Requested mechanics, not built yet (judge each against the golden rule)
| Request | Recommended simple version | Notes |
|---|---|---|
| **Leaderboard** of top and bottom players by net worth (cash + Bricks + houses) | Rank by Appraisal (`appraisal(c)` / on-chain `appraisal(id)`). Show top 10, your rank, and the bottom 3 | Contradicts "only see others via tiles" a little. That's acceptable: it's a list, not the map |
| **Season timer** | A countdown on the Desk and the Map rail to `seasonStart + 7 days`, turning into the Closing Bell timer in the last 24 h | Data exists: `G.seasonStartT`, `G.bellEnd`; on-chain `seasonStart()`, `bellEnd()` |
| **Bankrupt means your game ends** | Bankrupt = cash 0 and can't pay rent (Bricks were auto-sold). The Chog is **out until next season** (can't roll), unless the owner tops up | Already partly there: auto-sell, then Broke, then Rug Jail. On-chain it needs a `bankruptUntilSeason` flag |
| **Season end: the bottom pays the top** | **Wealth tax:** at season end, the bottom 25% of *active* Chogs pay 5% of their **cash** (never Bricks) into the season pot, which goes to the top 10 | Zero-sum. Spare inactive or new Chogs (woken under 3 days), or newcomers churn. In Practice it's easy (`endSeason()`). On-chain it needs a Merkle or keeper settlement: **do it in Practice first, on-chain later** |
| **Absent players** | Rolls store up to 8. Property Tax can be prepaid 3 days (autopay in Practice). The Sleeping Chog Dividend and Prestige keep growing. **On-chain autopilot:** `setAutopilot(id, plan, until)`, then anyone can call `autoRoll(id)` (commit) and `settle(id)` for the 5 $CHOG tip | Autopilot isn't on-chain yet. It's a small contract change |
| **Over-present players** | Already handled: 1 roll per 30 min (cap 8), extra rolls cost 100 $CHOG (max 10 a day), the 40% per-Chog cap per street, Fair Start streets, Property Tax that scales with holdings, and no cash transfers between Chogs | — |
| **nad.fun "launch a token on landing"** | Not as a real launch: the game can't spend a player's MON while they're offline. An in-game "Chog coin" curve is possible but overlaps with Bricks | **Parked** |
| **DMs on-chain** | A small `ChogMail` contract: `send(fromId, toId, text)` (sender must own `fromId`), with an inbox array per tokenId and paged views | Practice DMs work in `engine.js`. On-chain isn't built |
| **Scale to ~2,000 players** | A board "lens" view (packed state for 200 Chogs per call), events for an indexer (Envio), paged lists, a dedicated RPC | The contract scales (fixed-size loops). The current app reads only the first 100 Chogs and would hit RPC rate limits |

---

## 6. How to build, test, deploy
```bash
# App
app/src/build.sh                      # builds app/index.html; push to main to auto-publish

# Contracts
cd contracts && npm ci
npx hardhat test                      # 10 unit tests
FORK=1 npx hardhat test test/mainnet.fork.test.js   # 7 real-mainnet fork tests
DEPLOYER_KEY=0x... npx hardhat run scripts/deploy.js --network monadTestnet
DEPLOYER_KEY=0x... npx hardhat run scripts/deploy-mainnet.js --network monad   # FORK=1 for a dry run
```

**Browser tests** (Playwright, used during development; they live outside the repo). They must stay green:
- **Practice:** wake, 6 rolls, quests, +1 day, the zero-sum ledger "balanced" after 10 game days, no horizontal scroll at 400 px.
- **Guided flow:** the tour advances on real clicks; "Show me" points at the right element.
- **Testnet:** the injected EIP-1193 test wallet connects, finds Chogs, wakes, rolls and lands, and the on-chain ledger is balanced.

Before shipping UI changes, re-create equivalent checks.

## 7. Demo video (3 minutes) script
1. Landing page.
2. Open an account (Practice).
3. Desk: what happened while away, a DM.
4. Map: roll and land on nad.fun Lane, then the title deed.
5. Bank: the cash-out breakdown versus selling the Chog.
6. Switch to Testnet: a real transaction.
7. A mainnet-fork test output showing real $CHOG bought and shMON staked.
