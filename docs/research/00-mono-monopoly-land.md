# Competitor teardown: $MONO, "The stock market board game" (monopoly.land)

**Checked:** 2026-10-16
**Pages read:** [landing](https://monopoly.land/) · [docs](https://monopoly.land/docs) · [game](https://monopoly.land/game) · [pawn studio](https://monopoly.land/custom)
**Chain:** Robinhood Chain. **Token:** $MONO (sold on the pons launchpad).
**Tagline:** "A little luck. A share of the board." / "Roll the dice. Own a share. Collect rent."

## How it works
| Part | Their design |
|---|---|
| Board | 40 tiles: 23 companies in 8 colour groups, 6 Chance, 3 Tax (Income / Liquidity / Wealth), 4 "Market Close", 4 corners |
| What the tiles are | **Each company tile is backed by a Robinhood Stock Token** (AAPL, NVDA, TSLA, COIN, MSTR…) and tracks a live index of the real share price |
| Turns | **None.** "Nobody waits for a turn": one shared table, roll whenever you like. Doubles roll again, three doubles send you to Jail |
| Owning a tile | **Shares, not single ownership.** Share price = tile liquidity ÷ shares, starting at 1,000 $MONO. Buying raises the price, selling lowers it, with a 2% spread kept by the curve. "The holders are the market" |
| Rent | 1,000–5,400 $MONO base. It scales with liquidity (2× base at 100M liquidity). **90% goes to shareholders pro rata, 10% to the treasury**. Claimable hourly once above 1,000 $MONO, in $MONO or the company's stock |
| Treasury | Funded by the rent cut and Tax tiles (1% of balance). It pays Chance rewards and the Free Parking pot |
| Jail | 5 minutes, or 5,000 $MONO bail |
| Identity | **One wallet = one player = one pawn.** The "Pawn studio" stores your piece against your wallet. No NFTs |
| Custody | The game reads your wallet. Shares are recorded on-chain and every trade is signed by the owner. "The game never holds player funds" |
| AI agents | First-class players: their own wallets, same rules, at most one action per minute. "Connect your AI agent", "Show key" to export |
| Modes | A "Practice table, play money" mode, plus the live table |

## What they got right (worth borrowing)
1. **No turns:** a persistent shared table you can join any time. That solves the biggest problem with on-chain board games, waiting for others.
2. **Fractional shares of a tile:** no single owner, so no snowballing monopoly. It's simple to explain ("own a share, collect rent").
3. **Rent paid out pro rata and claimable hourly:** clean incentives, the treasury takes 10%.
4. **Agents as players:** the "plays while you're offline" story, done well.
5. **Real assets underneath:** the tiles mean something because they're stock tokens.
6. **A play-money practice table:** a zero-risk way in, which helps with judges too.

## What they don't have (where Chog Monopoly can be different)
1. **No NFT.** The pawn is a cosmetic tied to a wallet. **For us, the Chog *is* the pawn and the wallet (ERC-6551)**: shares, rent and history live inside the Chog, and **selling the Chog sells the position.** That's the Chogathon's "essential" rule, and $MONO can't do it.
2. **No commons dividend.** Rent goes to shareholders and the treasury. Our **Prosperity dividend** (Magie's 1904 second rule set) shares part of the pot with every player, which is a real story and a real difference.
3. **No forced-sale or anti-hoarding rule** beyond the curve. Harberger pricing is a different take on fair ownership. It's optional, because shares already solve snowballing.
4. **The tiles are stocks.** Ours could be **Monad-native**: $CHOG plus the top nad.fun coins, or plain game streets. Avoid copying their stock board.

## Implications for our design (009)
- **Adopt** the async shared table: roll whenever, no turns. The daily auto-roll becomes **agent mode** for when you're offline.
- **Decide on ownership:**
  - (a) **Shares on a curve:** simpler and proven by $MONO, but closer to a copy.
  - (b) **Harberger:** more novel and ties into the 1904 story, but harder to explain.
  - (c) **Hybrid:** shares, plus a small holding tax on shares that funds the Prosperity dividend. This keeps the Magie story and stays simple.
- **Keep** "Chog = pawn + wallet, sell the Chog, sell the empire" as the headline difference.
- **Steal** the practice table (play money) for judges.
