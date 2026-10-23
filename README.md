# The Chog of Wall Street

**A Monopoly-style city on Monad where the land belongs to Chog NFTs, not to wallets.**

Roll your Chog around **Chog Street**. Buy **Bricks** (shares of a street) where you land, and collect rent every time another Chog lands there. Everything you build lives inside the NFT. Built for **Chogathon 2026**.

**Live: https://necokizz.github.io/The-Chog-of-Wall-Street/**. It republishes automatically on every push to `main` that touches `app/`.

## How the money works
- **USDC is the game money,** so a dollar stays a dollar. Everyone opens with the same **$20** and can top up at most **$20 more per season**. USDC from the Uniswap square counts toward that cap.
- **$CHOG is the power-up token.** Extra rolls (100 $CHOG), guards (500 $CHOG) and hype are paid in $CHOG and burned. Hype also tips 90% to the hyped Chog's owner.
- **Fees buy $CHOG back and burn it.** 1% of every Brick purchase, half of bail and a quarter of every cash-out tax go into the Bank's buyback pot. Anyone can run the buyback: USDC → WMON on Uniswap → $CHOG on nad.fun → burned.
- **Nothing is ever minted.** Every dollar a Chog earns was paid by another Chog or comes from the Commons surplus. The contract proves it: `USDC.balanceOf(game) == accounted()`.
- **Leaving costs, staying pays.** Cash-outs are taxed 10–20%, wait 48 hours, are capped city-wide per day, and reset Prestige. Bricks never leave the Chog, so the better exit is selling the whole NFT.
- **Roll at least once every 48 hours.** After that, your streets stop paying you until you roll again, and the rent goes to the Commons. You never lose your Bricks.

## The cities
| City | What it is | You need |
|---|---|---|
| **Practice** | Play money, 14 bot Chogs, a guided tour, fast-forward. Fully simulated in the browser | Nothing |
| **Testnet** | The real contracts on Monad testnet. Get free test USDC, test $CHOG and a test Chog in the app; every action is a transaction | A wallet and a little testnet MON |
| **Mainnet** | Real Chog Genesis NFT, real USDC, real $CHOG, and six squares that do real things on Monad. **Not deployed yet** | A Chog Genesis NFT, $20 of USDC, some $CHOG for power-ups, MON for gas |

**The six real app squares** (mainnet adapters, all tested on a mainnet fork in `contracts/test/mainnet.fork.test.js`):

| Square | Action |
|---|---|
| nad.fun Lane, Chog Alley | Buy $CHOG with MON on nad.fun. The $CHOG is held for the Chog |
| FastLane Station | Stake MON into shMON, held for the Chog |
| aPriori Station | Stake MON into aprMON, held for the Chog |
| Kintsu Station | Stake MON into sMON, held for the Chog |
| Uniswap Boardwalk | Swap MON into USDC on Uniswap v3, straight into the Chog's cash |

Positions held for a Chog belong to its tokenId. They move with a sale, and the holder can withdraw them after 7 days.

## The app
- **Desk:** your Chog, what happened while you were away, messages, to-do, the season clock and the 48-hour earning clock.
- **Map:** the board, flat or 3D. Tap any square for its title deed, where you can Buy, Sell, Mortgage or Auction.
- **Leaders:** This season (pays prizes) and Richest.
- **Portfolio:** your balance and everything you own.
- **Bank:** the city's treasury, mortgages, auctions and the $CHOG buyback.
- **Rules.**

It also has light and dark mode, a guided first tour, and profile cards for every Chog.

Mortgages and auctions run in Practice only for now; they aren't in the contract yet.

## Repo
| Path | What |
|---|---|
| `app/` | The game. `app/src/build.sh` builds the single file `app/index.html` from `style.html`, `shell.html`, `engine.js` (Practice rules), `ui.js`, `guide.js` and `chain.js` (on-chain mode) |
| `contracts/` | `ChogOfWallStreet.sol`, the dapp and buyback adapters, mocks, unit tests (incl. zero-sum, the 48-hour rule and deposit caps), mainnet fork tests, deploy scripts |
| `docs/HANDOFF.md` | Where everything stands and how to continue |
| `docs/OPEN-PROBLEMS.md` | Design problems and what was decided |
| `docs/PLAN.md` | The original full design |
| `docs/research/` | Teardowns of the games we learned from |

## Live on Monad testnet (chain 10143)
| Contract | Address |
|---|---|
| ChogOfWallStreet (game) | [`0x4f4e8a4FCA7784D7531Cd01Fef7963d24e82c141`](https://testnet.monadvision.com/address/0x4f4e8a4FCA7784D7531Cd01Fef7963d24e82c141) |
| Test USDC (game money) | [`0x2496958B8816F2FD88E888a05aA7d34A7D46Ed12`](https://testnet.monadvision.com/address/0x2496958B8816F2FD88E888a05aA7d34A7D46Ed12) |
| Test $CHOG | [`0xc5fC739e97a411960Da8d98A8d02D7Cb9D79fcAF`](https://testnet.monadvision.com/address/0xc5fC739e97a411960Da8d98A8d02D7Cb9D79fcAF) |
| Test Chog Genesis | [`0x5b5D262376Ae025CeB6218C8547dE889c973F645`](https://testnet.monadvision.com/address/0x5b5D262376Ae025CeB6218C8547dE889c973F645) |
| Stand-in app adapter (squares 1, 3, 5, 25, 35, 37: MON → test USDC) | [`0x66331182082DA6D816B096572d60DeFE64C42d8d`](https://testnet.monadvision.com/address/0x66331182082DA6D816B096572d60DeFE64C42d8d) |
| Stand-in buyback (test USDC → burned test $CHOG) | [`0x8323e6957edd756138f020B84deAC4fE5eE69549`](https://testnet.monadvision.com/address/0x8323e6957edd756138f020B84deAC4fE5eE69549) |

The full record, including the on-chain smoke test, is in [`contracts/deployments/monadTestnet.json`](contracts/deployments/monadTestnet.json).

## Contracts
```bash
cd contracts
npm install
npx hardhat test                                   # unit tests
FORK=1 npx hardhat test test/mainnet.fork.test.js  # real mainnet adapters on a fork
DEPLOYER_KEY=0x... REUSE=1 npx hardhat run scripts/deploy.js --network monadTestnet
FORK=1 npx hardhat run scripts/deploy-mainnet.js   # mainnet dry run on a fork
```

**Mainnet references:**
- Chog Genesis: `0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763` (1,969 tokens)
- $CHOG: `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777`
- USDC: `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`

Every address is listed in `contracts/config/monad-mainnet.js`.

**Status:** hackathon prototype. Not audited. Mainnet is not deployed.
