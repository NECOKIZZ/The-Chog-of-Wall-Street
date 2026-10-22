# The Chog of Wall Street

**A Monopoly-style city on Monad where the land belongs to Chog NFTs, not to wallets.**

- Every street, station and utility on the 40-square board is a real Monad app (Kuru, Uniswap, nad.fun, FastLane, Magma, Perpl, Polymarket…).
- **Bricks** are shares of a street. They're bought by your roll plan, earn rent from every Chog that lands, and **can never leave the Chog**. Selling the empire means selling the NFT.
- **$CHOG** pays for everything, and **nothing is ever minted.** Every coin a Chog earns was paid by another Chog, given by a fan, or comes from the shared Commons surplus.
- **Cashing out is allowed but costly:**
  - a 10–20% tax that goes to the players who stay;
  - a 48-hour wait;
  - a city-wide daily cap;
  - Prestige resets to 0.

  So the better exit is selling the whole Chog, which pushes NFT value up.

Built for **Chogathon 2026**.

## Play
**Live: https://necokizz.github.io/The-Chog-of-Wall-Street/** (republished automatically on every push to `main` that touches `app/`).

Or open [`app/index.html`](app/index.html) in a browser. That's the **Practice City**: play money, 14 bot Chogs, and real Chog Genesis art. You don't need a wallet or a server.

- A guided tour walks you through your first roll.
- The **First rounds** checklist has **Show me** buttons that point at exactly where to click.
- **? Help** has the rules, a glossary, and tour replay.
- **+2 hours** and **+1 day** fast-forward time, so you can see rent, Prestige, Property Tax and the season's Closing Bell play out.

## Repo
| Path | What |
|---|---|
| `app/` | The game UI. `app/src/build.sh` builds `app/index.html` from `src/` (rules engine `game.js`, onboarding `guide.js`, styles `head.html`) |
| `contracts/` | Solidity core (`ChogOfWallStreet.sol`), mocks, Hardhat tests (incl. the zero-sum invariant), deploy script |
| `docs/PLAN.md` | The full design: economy, board, withdrawal rules, retention, exploits, MVP |
| `docs/research/` | Teardowns of Chog Raid, Fomopoly, Daemon, Hoodopoly, Stonkboard, Vault Street, Upland and $MONO, and what we took from each |

## Live on Monad testnet (chain 10143)
| Contract | Address |
|---|---|
| ChogOfWallStreet (game) | [`0xD4A674261A992A4f4E3a7FEC1A0e7A07F7AC6bC6`](https://testnet.monadvision.com/address/0xD4A674261A992A4f4E3a7FEC1A0e7A07F7AC6bC6) |
| Mock $CHOG | [`0x8A4fD1897924D182Db1BD0C7B4ed13fCC610feb6`](https://testnet.monadvision.com/address/0x8A4fD1897924D182Db1BD0C7B4ed13fCC610feb6) |
| Mock Chog Genesis | [`0x9B4AC1ab5503920BCCE821AA0A9CB8A9d838619E`](https://testnet.monadvision.com/address/0x9B4AC1ab5503920BCCE821AA0A9CB8A9d838619E) |
| Mock Kuru-style swap adapter (quests on squares 1, 3, 37, 39) | [`0x6ED957563A36fAf67C58b017a35Db7AAf5724f60`](https://testnet.monadvision.com/address/0x6ED957563A36fAf67C58b017a35Db7AAf5724f60) |

**Smoke test on-chain:**
- Chog #1 was woken with 20,000 $CHOG.
- It rolled and landed: [settle tx](https://testnet.monadvision.com/tx/0x202f4b52d048c7298ae152873806a86e56689ffb7cbe13e8b5c4cc033aafc277).
- `balanceOf(game) == accounted()` held.

The full record is in [`contracts/deployments/monadTestnet.json`](contracts/deployments/monadTestnet.json).

## Contracts
```bash
cd contracts
npm install
npx hardhat test
DEPLOYER_KEY=0x... npx hardhat run scripts/deploy.js --network monadTestnet
```
Without `CHOG_NFT` and `CHOG_TOKEN` set, the deploy script uses mock contracts. See [`contracts/README.md`](contracts/README.md) for the function map and known limits.

**Mainnet references:**
- Chog Genesis: `0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763` (1,969 tokens)
- $CHOG: `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777`

**Status:** prototype. Not audited. Dapp adapter addresses are still to be verified.
