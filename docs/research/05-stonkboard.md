# Teardown 5: Stonkboard (stonkboard.online)

**Checked:** 2026-10-22
**Sources:**
- Landing page, `/play`, `/leaderboard`.
- **The live game config and rules, read from the shipped JS bundles** (the client runs the same rules engine as practice mode). `docs` returns a 404, because the rules live on the landing page.

**Chain:** Robinhood Chain. **Token:** $PAPER (1B fixed supply, launching on PONS).
**NFTs:** none. Players are wallets with one of 8 pixel characters (Bull, Bear, Ape, Whale, Bot, Wizard, Banker, Rocket).

> **One line:** "A Monopoly-style board where the properties are stock tokens and everyone plays on the same board."

---

## 1. The board
- **40 squares:**
  - 22 stock streets in 8 sectors: Meme GME/AMC · Finance · Energy · Healthcare · Consumer · Industrial · Big Tech · Crypto ETH/BTC.
  - **4 exchanges** as the railroads: Uniswap, PONS, Robinhood, Arbitrum.
  - **2 oracles** as the utilities.
  - Market News and Airdrop cards, taxes, jail, Free Parking.
- **Rent moves with the real stock price, up to ±50%** (`market[pos]` in bps).
- **Classic rent tables:** a full colour SET doubles base rent and allows houses. Railroad rent depends on how many you own. Oracle rent = dice × 4, or × 10 if you own both.

## 2. Live config (from the bundle; $PAPER amounts are ×100 in code)
| Param | Value | Meaning |
|---|---|---|
| `buyIn` | 1,500 $PAPER | It becomes your starting cash. `seatPrice()` can make it dynamic (`seatPerPlayer`, `seatPerHouse`, currently 0) |
| `goReward` / `goDividendBps` | 200 / **2%** | **GO pays 2% of what you own** (unmortgaged property and houses), up to 200 a lap, **paid only from the pool's surplus**. "Own nothing, earn nothing." |
| `jailFine` | 50 | Or roll doubles, or use a card |
| `maxEnergy` / `energyRegen` | **5 / 180 s** | 5 batteries, +1 every **3 minutes**. Doubles give a free roll. Three doubles: jail |
| `maxProperties` | **10 per wallet** | A hard cap |
| `whaleThreshold` / `whaleRentBps` / `smallHolderRentBps` | 5 / 110% / **80%** | **"Robin Hood rent":** small holders pay 20% less, whales with 5+ properties pay 10% more |
| Fees | buy 10% · rent 5% · build 2% · sale 0% → the vault. `feePoolBps` 50% | Half of every fee refills the rewards pool and half goes to the vault. **Half the vault's share is burned in 100k batches anyone can trigger** |
| Bank buyback | **80%** of the price | "Cash out any time and the bank buys your properties back at 80%" |
| `takeoverBaseBps` / `takeoverStepBps` / `takeoverOwnerBps` | **2×** value, +0.5× per earlier flip / the owner gets **1.2×** | **Hostile takeover:** land on a rival's stock and buy it out from under them, houses included |
| `rentStepBps` / `rentCapBps` / `rentFade` | +50% per flip, cap 5×, fades over **6 h** | **Rising stakes:** rent spikes after each takeover, then cools |
| Shields | 1/4/12/24 h for 1/3.2/7.2/12 units. Back-to-back shields double in price. 24 h cap, 6 h cooldown. **A shielded stock earns half rent** | "Shields up, rent down" |
| Free Parking | **5% of the pool's spare cash** | A variable jackpot that never empties the pool |

## 3. The mechanics that matter
1. **The roll commits a plan.** You pick SAFE (cheap squares only, never takes over), BALANCED (buys most, takes over cheap) or DEGEN (buys everything), or set custom `buyMax`, `takeoverMax` and `keepCash`. **The plan is fixed before the dice exist**, so the landing resolves in one go with no follow-up decision.
2. **drand randomness:** "Your roll locks onto drand's next random number before anyone knows it. **Anyone can land it, so nobody can hide from a bad one**" ("NO STALLING"). A keeper usually lands rolls.
3. **The bank always pays:** the pool always keeps enough to buy back every property. The GO dividend only comes out of the surplus. Mortgages and cash-outs never bounce.
4. **Liquidation:** if you can't pay, houses are sold and properties mortgaged automatically. If you're still short, you're **REKT** and the properties go back to the bank. You can top up at any time.
5. **Autoplay:** your plan rolls for you while the tab is open, and you pay a little gas per roll.
6. **Practice mode:** the same engine against N CPU bots with personalities, and "No wallet? Practice mode is free and needs nothing."

## 4. UX
- An 8-bit Game Boy shell: an LCD palette, an A/B/START d-pad, and chiptune sound and effects.
- "THREE BUTTONS. INFINITE COPE." A whole session is **press A**.
- Onboarding cards explain each panel in one sentence.
- Names are wallet-signed and free, changeable every 10 minutes.

---

## 5. Lessons for The Chog of Wall Street (what we take, and what we don't)
| Lesson | Verdict | Change to The Chog of Wall Street |
|---|---|---|
| **The roll commits a plan, and anyone can land it** | ✅ **Adopt** | Replaces our "buy only while standing there, until your next roll" window. Buying happens **atomically when the roll lands**, according to the Chog's plan. Autopilot becomes "a saved plan" (one feature instead of two). Stalling on a bad roll is impossible |
| **GO pays % of what you own, from surplus only** | ✅ **Adopt** | The Genesis Dividend becomes **1% of the Chog's Brick value, capped, paid only from the Commons surplus**. Passing GO rewards *owning land in the Chog*, which pushes up NFT value |
| **The bank always pays (a solvency rule)** | ✅ **Adopt** | Contract invariant: the Commons never pays a bonus that would push it below its obligations. Curve reserves always cover sells |
| **A per-player property cap + Robin Hood rent** | ✅ **Adopt a lighter version** | **A per-Chog cap: one Chog can hold at most 40% of a street's Bricks.** Ownership spreads across *more Chogs*, so more NFTs carry value. (No progressive rent: one cap is enough) |
| **Fast energy** (+1 every 3 min) | ✅ **Adjust** | Our 1 roll per 2 h is too slow for a fun session. New: **+1 every 30 min, store 8** |
| **Free Parking = 5% of spare cash** | ✅ **Adopt** | **Nad Lounge pays 25% of its pot**, a variable jackpot that never hits zero |
| **Hostile takeovers, shields, rent spikes** | ❌ **Skip** | Great PvP, but it only works with *single-owner* deeds. Our Bricks spread ownership across many Chogs, and the **Heist** square already gives us PvP. Adding both would be jampacking |
| drand | ❌ Skip for now | No verified drand verifier on Monad. Keep commit → future blockhash → Pyth Entropy epoch |
| Real-price-linked rent (±50%) | ❌ Skip | Our tiles are dapps, not price feeds |
| The 8-bit shell, "press A" UX | 💡 **Inspiration** | One big ROLL button. Every panel explained in one sentence. Bots with personalities in Practice City |
