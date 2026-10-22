# Teardown 7: Upland (play.upland.me)

**Checked:** 2026-10-22
**Sources:**
- [play.upland.me](https://play.upland.me/?promo=X_Profile): a JS-only app, nothing readable without logging in.
- [upland.me](https://www.upland.me/) and its [UPX / SPARKLET / STEM guide](https://www.upland.me/learn/upx-sparklet-and-stem).
- [Naavik's deep dive "Upland: Property Tycoon On-Chain"](https://naavik.co/deep-dives/upland-property-tycoon/).
- [Upland Revival: every way to earn (2026)](https://uplandrevival.com/guides/how-to-earn-in-upland) and [Upland Guide: collections](https://upland-guide.com/upland-metaverse-strategy/collections/).

> **One line:** the original "Monopoly on real-world addresses". Live since 2019, the map never resets, and there are about 4M property NFTs.
> **Why it matters to us:** it's the longest-running on-chain property game. It shows **what happens when yield isn't zero-sum**, and which ownership rules survive years of players.

---

## 1. How it works
| Piece | Design |
|---|---|
| **Properties** | NFTs of real addresses. **Minted** at a price set by a formula from real-world values (SF starts at 2–8 UPX), then traded on a secondary market (most $5–$50, Manhattan $100–$1k) |
| **UPX** | The in-game currency, **pegged at 1,000 UPX = $1** and **not tradable outside the game**. 100B minted into two pools: the Upland Pool (sold for fiat to fund the company) and the Community Pool (pays yield and rewards) |
| **Yield** | An annual % **of the property's mint price**, claimable every 3 h. **It has been cut over time: 17.3% → 14.7% (2022) → 4.9% base today**, up to 15.2% with missions |
| **Collections** | Own a themed set of properties for boosted yield and a **one-time bonus**. **The bonus needs a holding period**: Limited 7 d, Exclusive 21 d, Rare and Ultra-Rare 30 d |
| **Status levels by net worth** | Visitor (free account, **assets recycled after 7 days inactive**), then **Uplander** (10k UPX), Pro (100k), Director, Executive. **Higher status = a shorter USD cash-out hold: 30 d → 14 d → 7 d → 3 d** |
| **FSA ("Fair Start Act")** | A cheaper share of properties in each city **reserved for newer players**. Pros (100k+) can't mint FSA land |
| **Fees** | A **10% fee on secondary sales** (5% buyer, 5% seller). UPX transfers also cost 10% (5% + 5%), with a **60-day cooldown on acquired UPX**. 10% of USD sales goes to Upland |
| **Structures** | Built with staked Spark over time (a townhouse takes 2,600 Spark-hours). **Structures are bound to their land: to sell one, you sell the land** |
| **Side features** | Treasure hunts (new hunters lose more than they win), visit fees (5–100 UPX, "not a substantial source"), racing, trade routes, shops, Legits, Uppies, SPARKLET (an ERC-20 on Ethereum and Base) |

## 2. What went wrong (Naavik plus the history of yield cuts)
1. **Yield paid from a pool, not from players.** The Community Pool is refilled by minting and fees. As new money slowed, **yield had to be cut three times.** Players feel cuts as broken promises.
2. **Land concentration:** early players bought cheap land and speculators sit on it. Naavik recommends a **Land Value Tax capturing 85–100% of land rent**. Upland didn't do it.
3. **Cold start:** a first property is slow or expensive to get, and there's no global directory.
4. **Low engagement:** "tangential features (events, Legits, metaventures) don't tie into the core loop." Revenue fell from $1.16M/month to about $200k, and MAU from 128k to 90k (US).
5. **Partnership spikes** (FC Porto) **didn't stick.**

## 3. What survived and worked
- **Assets bound to the thing you own** (a structure can only be sold with its land).
- **Holding periods before bonuses**, which make flip-farming collections pointless.
- **Friction on getting value out:** 10% transfer fees, a 60-day UPX cooldown, and a cash-out hold scaled by status.
- **Newcomer protection (FSA)** reserved for small accounts.
- **A map that never resets.** Persistence is the brand.

---

## 4. Lessons for The Chog of Wall Street (we have **no budget**, so zero-sum is the core)
| Lesson | Verdict | Change to The Chog of Wall Street |
|---|---|---|
| **Yield from a pool ends in cuts** | ✅ **Confirms our core** | **We never promise a yield or an APY.** All income is **rent paid by other Chogs**, and every bonus comes from the Commons *surplus*. Nothing needs outside money to keep its promises |
| **Structures are bound to land** | ✅ **Validates** | Bricks are bound to the Chog. Same principle, years of evidence that players accept it |
| **Holding period before a bonus** | ✅ **Adopt (tiny)** | **The District set bonus (+5%) only starts after the Chog has held its stamps or Bricks for 7 days.** Buying a set, collecting and dumping doesn't work |
| **Fair Start (FSA)** and the land-concentration critique | ✅ **Adopt (tiny, costs nothing)** | **Fair Start streets:** the two Brown streets accept Brick buys only from Chogs with an Appraisal under 50k $CHOG. Newcomers always have somewhere affordable to start. It's zero-sum: nobody gets paid, the rule just protects an entry point |
| **No transfers of the in-game currency** (UPX is non-tradable) | ✅ **Make it explicit** | **There is no Chog-to-Chog cash transfer.** Cash moves only through game actions (rent, Heist, hype). That stops consolidating many Chogs into one and dodging the exit tax |
| Land Value Tax (Naavik) | ✅ Already in | Our Property Tax (0.5% a day) is a mild version |
| **Side features that don't feed the core loop kill engagement** | ✅ **A design rule** | **Every feature must move $CHOG through rent and Bricks, or it doesn't ship.** This is the written test against jampacking |
| Status levels shorten the cash-out hold | ❌ Skip | It favours whales. Our flat 48 h plus Prestige is enough |
| Pegged, non-tradable currency | ❌ Skip | $CHOG must stay a real token (the hackathon bonus, and the community's asset). Exit friction does the job a peg would |
| Visitor accounts recycled after 7 days | ❌ Skip | A Chog is a real NFT. We never take it. Property Tax handles idleness |
| Treasure hunts, racing, shops, Uppies | ❌ **Reject** | Exactly the "tangential features" problem |

## 5. Zero-budget check (what no money means for us)
| Thing that usually needs money | How The Chog of Wall Street avoids it |
|---|---|
| Yield and rewards | Rent between players, plus the Commons surplus. **No emissions, no team-funded pool** |
| Season prizes | The season pot is funded only by in-game flows (25% of the exit tax, plus Commons). "Sponsor top-ups" move to *after the win* |
| Starter cash and airdrops | **Removed from the MVP.** The **Sleeping Chog Dividend** is the free starter cash, paid by the game's own Commons |
| Keepers and gas | Keepers are paid **tips from the Chog being served** (Daemon model). Players pay their own gas and Entropy fees |
| Hosting, indexer, voucher signer | A static frontend plus one small free-tier server for Tier B vouchers. Tier A quests need no server |
| Liquidity | None needed. Brick curves are self-funded by buyers. $CHOG trades on its existing nad.fun and Kuru pools |
