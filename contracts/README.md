# The Chog of Wall Street: contracts

`contracts/ChogOfWallStreet.sol` is the on-chain core of [the plan](../docs/PLAN.md). Every balance is keyed by Chog tokenId. $CHOG is the only currency, and nothing is minted.

| Feature | Function(s) |
|---|---|
| Wake a Chog: deposit plus the Sleeping Chog Dividend | `wake` |
| Roll with a committed plan; anyone can land it (keeper tip 5 $CHOG) | `roll`, `settle`, `setPlan`, `buyExtraRoll` |
| Bricks on linear curves: 40% per-Chog cap, Fair Start streets, sell anywhere (5% spread) | `_planBuy`, `sellBricks` |
| Rent: 90% to holders through an accumulator, 10% to the Commons, Hot Street paid by the Commons | `_payRent`, `claim` |
| Property Tax: 0.5% a day; rent earned while it's unpaid goes to the Commons | `prepayTax`, `_checkpoint` |
| Claim bonuses: Prestige + stamps + tier, paid from the Commons surplus only; hype from the jar | `claim`, `bonusPct` |
| Cash-out: 10–20% tax, 48 h queue, city-wide cap of 2% a day, Prestige reset, 72 h Moving Day | `requestCashOut`, `claimCashOut`, `sync` |
| Hype (10% burned), Heist (unclaimed rent only), guards, bail | `hype`, `heist`, `hireGuard`, `payBail` |
| Dapp quests: Tier A adapter (atomic), Tier B signed receipt | `quest`, `questReceipt` |
| Closing Bell: the last Brick buyer wins 10% of the season pot | `_tickSeason` |
| Invariant: `CHOG.balanceOf(game) == accounted()` | `accounted` |

**The admin can only:**
- whitelist quest adapters;
- set the receipt signer;
- seed the tier table once (then freeze it).

It can never move funds.

## Run
```bash
npm install
npx hardhat test        # 10 tests incl. the zero-sum invariant over hundreds of rolls
npx hardhat run scripts/deploy.js --network monadTestnet   # DEPLOYER_KEY=0x... ; mocks if CHOG_NFT/CHOG_TOKEN unset
```

## Known MVP limits
- **Dice randomness** is commit → a future blockhash. Before mainnet, mix in a Pyth Entropy epoch seed.
- **Heist randomness** uses the previous blockhash. It's low stakes, but the caller can time it.
- **Season leaderboard payouts** (top 10, Wardens, Golden Chog) aren't on-chain yet. They'll ship as a Merkle distributor; until then the pot rolls over.
- **The district set bonus** (7-day hold) is in the sim only.
- **Real dapp adapters** need verified Monad addresses. Only a mock swap adapter is included.
- **Not audited.**
