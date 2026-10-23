# The Chog of Wall Street: contracts

`contracts/ChogOfWallStreet.sol` is the on-chain core. Every balance is keyed by Chog tokenId.

- **USDC (`CASH`) is the game money.** Amounts are USDC base units, and constants use `U = 1e3` (one game unit is $0.001).
- **$CHOG (`CHOG`) is the utility token.** The game never holds it: it's burned (or tipped) straight from the player's wallet.
- **Nothing is minted.**

| Feature | Function(s) |
|---|---|
| Wake a Chog: exactly $20 (`START_DEPOSIT`) plus the Sleeping Chog Dividend | `wake` |
| Top-ups: at most $20 per Chog per season (`TOPUP_CAP`), counting USDC from app squares | `topUp`, `seasonTopUp` |
| Roll with a committed plan; anyone can land it (keeper tip $0.005) | `roll`, `settle`, `setPlan` |
| Extra rolls (100 $CHOG) and guards (500 $CHOG), burned from the wallet | `buyExtraRoll`, `hireGuard` |
| Hype in $CHOG: 10% burned, 90% to the Chog's owner; claim boost paid by the Commons | `hype`, `claim` |
| Bricks on linear curves: 40% per-Chog cap, Fair Start streets, sell anywhere (5% spread) | `_planBuy`, `sellBricks` |
| Rent: 90% to holders through an accumulator, 10% to the Commons, Hot Street paid by the Commons | `_payRent`, `claim` |
| Earning stops when Property Tax is unpaid **or 48 h after the last roll** (`IDLE`); that rent goes to the Commons | `_checkpoint`, `earningUntil` |
| Claim bonuses: Prestige + stamps + tier + hype, from the Commons surplus only (max 10% of it per claim) | `claim`, `bonusPct` |
| Cash-out: 10–20% tax, 48 h queue, city-wide cap of 2% a day, Prestige reset, 72 h Moving Day | `requestCashOut`, `claimCashOut`, `sync` |
| $CHOG buyback: fees fill `buybackPot`; anyone swaps it to $CHOG and burns it, with a slippage floor | `buyback`, `setBuybackAdapter` |
| Heist (unclaimed rent only), bail | `heist`, `payBail` |
| Dapp quests: Tier A adapter (atomic), Tier B signed receipt | `quest`, `questReceipt` |
| Closing Bell: the last Brick buyer wins 10% of the season pot | `_tickSeason` |
| Invariant: `CASH.balanceOf(game) == accounted()` | `accounted` |

**Adapters** live in `contracts/adapters/QuestAdapters.sol`:

| Adapter | What it does |
|---|---|
| `NadFunChogAdapter` | Buys $CHOG on nad.fun and holds it for the Chog |
| `LstAdapter` | Stakes into shMON, aprMON or sMON and holds the shares for the Chog |
| `UniswapUsdcAdapter` | Swaps MON into USDC straight into the Chog's cash |
| `ChogBuybackAdapter` | Swaps USDC → WMON (Uniswap v3) → $CHOG (nad.fun) and sends it to the burn address |

Positions held for a Chog can be withdrawn by its current holder after 7 days.

**The admin can only:**
- whitelist quest adapters and the buyback adapter;
- set the receipt signer and a deposit cap;
- seed the tier table once (then freeze it).

It can never move funds. `buyback` checks that the burn address actually received at least `minChog` $CHOG, and that the adapter took no more than the pot.

## Run
```bash
npm install
npx hardhat test                                   # 13 tests: zero-sum over hundreds of rolls, the 48-hour rule, deposit caps, $CHOG utilities, buyback
FORK=1 npx hardhat test test/mainnet.fork.test.js  # 9 tests against real USDC, $CHOG, Chog Genesis, nad.fun, Uniswap, shMON, aprMON, sMON
DEPLOYER_KEY=0x... REUSE=1 npx hardhat run scripts/deploy.js --network monadTestnet
FORK=1 npx hardhat run scripts/deploy-mainnet.js   # mainnet dry run on a fork
```

## Known limits
- **Dice randomness** is commit → a future blockhash. Before mainnet, mix in a Pyth Entropy epoch seed.
- **Heist randomness** uses the previous blockhash. It's low stakes, but the caller can time it.
- **Season leaderboard payouts** (top 10, Wardens, Golden Chog), the season-end wealth tax and bankruptcy are in Practice only. On-chain they need a Merkle distributor or keeper; until then the season pot rolls over.
- **Mortgages and auctions** are in Practice only.
- **The buyback adapter is trusted** to route the swap. The game checks the result (`minChog` reached at the burn address), and the admin sets the adapter.
- **Not audited.**
