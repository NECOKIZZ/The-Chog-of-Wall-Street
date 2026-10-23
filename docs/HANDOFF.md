# The Chog of Wall Street: handoff and build guide

**Read this first** if you're picking up the project. It covers:
1. what the game is;
2. what's built and deployed;
3. the decisions already made;
4. what's left;
5. exactly how to build, test and deploy.

Last updated: 2026-10-23 (Chogathon deadline: Oct 23, 15:00 UTC).

**Golden rule from the team:** sophisticated mechanics, but a UI anyone understands in seconds. **If something is too complicated or doesn't work, leave it out.** Bugs cost more than missing features.

---

## 1. What it is (one paragraph)
A Monopoly-style city on Monad, called **Chog Street**, where **the land belongs to Chog NFTs, not wallets**.
- A player opens an account for their Chog with **$20 of USDC**. That's the same for everyone; top-ups are capped at $20 per season.
- They roll, land, and their **buying plan** (Safe, Balanced or Degen) buys **Bricks**: shares of a street. They can also buy by hand on the street they're standing on. Every Chog that later lands there pays rent to the Brick holders.
- Bricks, stamps and Prestige live **inside the NFT** and can never be withdrawn. **Selling the Chog sells the empire.**
- **$CHOG is the power-up token.** Extra rolls, guards and hype are paid in $CHOG and burned. Part of every fee buys $CHOG back and burns it.
- **Roll at least once every 48 hours,** or your streets stop paying you until you roll again.
- **Cashing out** is allowed but taxed (10–20%), queued for 48 hours, capped city-wide, and it resets Prestige.
- **Zero-sum:** the game never mints. Every dollar comes from another player or the Commons, which is funded only by fees and taxes.

Original design: [`PLAN.md`](PLAN.md) (the money model has since changed; see §3). Problems and decisions: [`OPEN-PROBLEMS.md`](OPEN-PROBLEMS.md). Research on the reference projects: [`research/`](research/).

---

## 2. What exists today

### Live
| Thing | Where |
|---|---|
| Web app (Practice, Testnet, Mainnet cities) | https://necokizz.github.io/The-Chog-of-Wall-Street/. Auto-published from `main` by `.github/workflows/pages.yml` whenever `app/**` changes |
| Testnet contracts (chain 10143), v2 | Game `0x4f4e8a4FCA7784D7531Cd01Fef7963d24e82c141`, test USDC `0x2496…Ed12`, test $CHOG `0xc5fC…fcAF`, test Chog NFT `0x5b5D…F645`, stand-in app adapter `0x6633…2d8d`, stand-in buyback `0x8323…9549`. Chogs #1–#4 are awake. Full record: `contracts/deployments/monadTestnet.json` |
| Mainnet contracts (chain 143) | **Not deployed (on hold by decision).** A dry run on a fork passes: `FORK=1 npx hardhat run scripts/deploy-mainnet.js`. To deploy, fund a deployer with ~3 MON, run it with `--network monad`, then paste the output into `MAINNET_DEPLOYMENT` in `app/src/chain.js` |
| Deployer wallet | `0x6D55dF0ca3E3DbDcBb2eE0edc54633aE313dac3d` (testnet admin). **The key was generated in a temporary cloud session.** If you don't have the saved copy, use a new wallet for mainnet |

### Code map
| Path | What |
|---|---|
| `contracts/contracts/ChogOfWallStreet.sol` | The game on-chain. USDC is `CASH`, $CHOG is `CHOG`. Wake ($20), capped top-ups, roll (commit) and settle (anyone can land it), Bricks on curves with a 40% per-Chog cap, rent accumulator, Property Tax and the 48-hour rule (`earningUntil`), claim bonuses from the Commons surplus, cash-out rules, $CHOG utilities, buyback, heist, quests, Closing Bell |
| `contracts/contracts/adapters/QuestAdapters.sol` | Real mainnet adapters, fork-tested: `NadFunChogAdapter` (buy $CHOG, held for the Chog), `LstAdapter` (shMON, aprMON, sMON), `UniswapUsdcAdapter` (MON→USDC into cash), `ChogBuybackAdapter` (USDC→WMON→$CHOG→burn) |
| `contracts/contracts/mocks/Mocks.sol` | Test USDC (6 decimals), test $CHOG, test Chog NFT, stand-in quest adapter, stand-in buyback |
| `contracts/config/monad-mainnet.js` | Every verified mainnet address |
| `contracts/test/` | 13 unit tests and 9 mainnet-fork tests (§5) |
| `app/src/style.html`, `shell.html` | Design tokens and styles, and the page skeleton. Chog-purple game world, gold as the one hot accent, green only for gains and red for losses, Kickoff-style 3D keycap buttons, a solid full-width nav, light and dark mode |
| `app/src/engine.js` | Practice rules, in game units of $0.001 (`fmt` shows dollars, `fmtN` plain counts). Board, Bricks, rent, tax, the 48-hour rule, cards, heist, $CHOG hype, buyback, seasons (incl. the wealth tax), mortgages and auctions, bots, Desk activity, DMs |
| `app/src/ui.js` | The interface: landing, open an account, Desk, Map (classic-deed tiles, flat with a 3D switch), Leaders, Portfolio, Bank, Rules, title deeds with Buy / Sell / Mortgage / Auction, profile cards, the balance dropdown, light/dark toggle |
| `app/src/chain.js` | On-chain mode: wallet connect, faucets on testnet, find your Chogs, open an account ($20), roll+land, claim, tax, $CHOG power-ups, hype, heist, cash-out, app squares with quotes, positions, buyback button, "While you were away" from a local snapshot |
| `app/src/guide.js` | A 9-step first tour, one-time tips tied to their room, and the "First rounds" checklist on the Desk |
| `app/src/logos.js`, `chogtable.js`, `chogart.js` | Brand icons for the wired apps; all 1,969 Chogs; 15 embedded portraits |

### Verified facts you can rely on
| Fact | Detail |
|---|---|
| USDC `0x7547…b603` | 6 decimals. Deepest MON pool: Uniswap v3 WMON/USDC 0.3% (`0x659b…a9da`) |
| $CHOG `0x3500…7777` | 18 decimals, ~1B supply. Main liquidity: the nad.fun DEX pool `0x116e…d8f1` |
| Prices (Oct 2026) | 1 MON ≈ 14.9 $CHOG ≈ $0.02. On a fork, $0.02 of fees bought and burned ~14 $CHOG |
| Not wired | Kuru (no bids), Magma gMON (deposits revert), Uniswap $CHOG pools (dust). Don't add them back without a passing fork test |
| Monad RPC | `eth_getLogs` is limited to 100 blocks per call, and the public RPC rate-limits (HTTP 429). Always read through the retry helper `rc()` in `chain.js` |

---

## 3. Decisions already made (don't relitigate)
- **Money:**
  - USDC is the game money.
  - $CHOG is utility: extra rolls (100), guards (500) and hype are paid in it and burned; hype tips 90% to the owner.
  - Fees (1% of Brick buys, half of bail, a quarter of the cash-out tax) fill a buyback pot that buys $CHOG and burns it.
- **Deposits:** everyone opens with exactly $20. Top-ups are capped at $20 per Chog per season, and USDC from the Uniswap square counts.
- **The 48-hour rule:**
  - A Chog that hasn't rolled in 48 hours stops earning rent; the rent goes to the Commons.
  - One roll switches earning back on, and missed rent isn't paid back.
  - No auto-rolling and no "away days".
- **Leaderboards:** "This season" (growth, pays prizes) and "Richest" (net worth), on their own Leaders page.
- **Seasons:**
  - The city never resets, and seasons are 7 days.
  - The last 24 hours are the Closing Bell: each Brick buy adds 1 minute, and the last buyer wins 10% of the season pot.
  - At season end the bottom quarter of active Chogs pays 5% of its cash into the pot (Practice only for now).
- **Board:**
  - The city is called Chog Street.
  - Classic-deed tiles (design A), with all text upright.
  - Only the 6 wired app squares carry a brand. The other 22 are in-game streets with no external links; players never need to leave the app.
- **Players see only their own Chog on the map.** Other Chogs appear on title deeds, the Leaders page and profile cards.
- **The Bank is the house, not the player's account.** It holds the treasury, mortgages, auctions and the buyback. The player's own page is the Portfolio.
- **Mainnet stays undeployed** until the team says so.

---

## 4. What's left (judge each against the golden rule)
| Item | Notes |
|---|---|
| On-chain mortgages and auctions | In Practice only. Contract work: loans from the Commons per street, an auction escrow |
| On-chain season payouts, wealth tax and bankruptcy | Practice only. Needs a Merkle distributor or keeper settlement |
| On-chain "This season" growth | The contract doesn't store each Chog's start-of-season value, so on-chain growth shows 0 |
| ChogMail (on-chain DMs) | Practice DMs work. On Testnet the Message button says "coming soon" |
| Scale to ~2,000 players | The app reads the first 100 Chogs. Needs a lens contract, an indexer, paged lists and a dedicated RPC |
| Better randomness | Mix a Pyth Entropy seed into dice and heists before mainnet |
| Audit | Not audited |

---

## 5. How to build, test, deploy
```bash
# App
app/src/build.sh                      # builds app/index.html; push to main to auto-publish

# Contracts
cd contracts && npm ci
npx hardhat test                                   # 13 unit tests
FORK=1 npx hardhat test test/mainnet.fork.test.js  # 9 real-mainnet fork tests
DEPLOYER_KEY=0x... REUSE=1 npx hardhat run scripts/deploy.js --network monadTestnet   # keeps the test Chogs
FORK=1 npx hardhat run scripts/deploy-mainnet.js   # mainnet dry run
```
After a testnet redeploy, update the `testnet` block at the top of `app/src/chain.js` with the new addresses.

**Browser tests** (Playwright drivers used during development; they live outside the repo). They must stay green:
- **Practice:**
  - landing → open an account → the full tour → rolls with app squares → Portfolio, Bank, Leaders;
  - buy, sell, mortgage, repay and auction from a title deed;
  - a profile card and the balance dropdown;
  - two full seasons with the ledger balanced to the cent;
  - no JS errors, and no horizontal scroll at 400 px.
- **Testnet:**
  - the injected test wallet connects;
  - enters a Chog, rolls on-chain and opens a station's title deed;
  - the Bank shows "balanced", and the buyback button burns test $CHOG.

## 6. Demo video (3 minutes) script
1. Landing page.
2. Open an account in Practice: everyone starts with $20.
3. Desk: what happened while away, the 48-hour earning clock, a DM.
4. Map: roll and land, then the title deed with Buy / Sell / Mortgage / Auction.
5. Leaders and a Chog's profile card.
6. Bank: the treasury, the buyback burning $CHOG, a mortgage.
7. Switch to Testnet: a real transaction and the on-chain buyback.
8. The mainnet-fork test output: real USDC in, real $CHOG bought and burned, shMON staked.
