# Teardown 6: Vault Street Tycoon (vaultstreet.fun)

**Checked:** 2026-10-22, hours before launch (early access opens Oct 22, 17:00 UTC; public access Oct 23)
**Sources:**
- [vaultstreet.fun/docs](https://vaultstreet.fun/docs), the full docs, read end to end.
- The landing page, `/whitelist`, `/collab` and `/play` (the HUD shell).
- [@VaultStreet_rh](https://x.com/VaultStreet_rh).

**Chain:** Robinhood Chain. **Token:** $VST (1B fixed supply, CA `0x1D21…7A6e`).
**NFTs:** **1,000 supply, free mint**, whitelist only.

> **One line:** "An idle DeFi bank tycoon. Fill your branches with assets, out-yield rival banks for the rewards pool and keep your vault secure."

---

## 1. Core loop
1. **Buy a Treasury (your bank) with ETH.** One per wallet, yours forever. Five tiers, from $2 to $45.
2. **Place assets on plots.** Each branch has 3 plots, and there are up to 8 branches. Each asset adds **yield (Y/s)**.
3. **Earn $VST every second**, even offline. **Your share = your yield ÷ everyone's yield.**
4. **Pay guards** (upkeep), or the bank stops earning.
5. **Keep security high**, or robbers take part of your unclaimed rewards.
6. **Claim** (taxed, with limits) or **spend the rewards in-game** (no tax, 10% off).

## 2. Assets (4 families × 5 levels)
| Family | Role | L1 → L5 price ($VST) | Yield (Y/s) | Upkeep/day | Security |
|---|---|---|---|---|---|
| Bonds | Plain yield | 2k → 250k | 1.5 → 525 | 60 → 4,750 | – |
| Vaults | Yield plus defense | 5k → 600k | 3 → 1,008 | 150 → 11,400 | **+5 → +25** |
| AMM Nodes | Better yield | 10k → 1.2M | 8 → 2,898 | 300 → 22,800 | – |
| Leverage Desks | Best yield, but weaker defense | 15k → 1.5M | 15 → 4,568 | 670 → 51,000 | **−4 → −16** |

- **Higher levels earn more per dollar.**
- Branches cost "$X + $1.5 per 100 Y/s" (the price scales with your best yield) and take **2 min → 3 h to build**.

## 3. Reward emission (the "Vault")
- 600M $VST to start, 60% of supply. It releases **25% on launch day, then 2% of what's left per day in week 1, then 5% per day after that.**
- **60% of all in-game spending flows back into the Vault and 40% is burned.**
- Claim taxes and robberies also go back into the Vault.

**Boosts:**

| Boost | Effect |
|---|---|
| Grand Opening | ×2 for the first 10 min, and you can't be robbed |
| **Hold streak** | **+10% for every hour you don't claim, up to +50%. Claiming resets it** |
| Founders | +25% for 72 h (the first 500 banks) |
| NFT holder | +10% |

## 4. Defence
- **Guards (upkeep):** paid 12 or 24 h at a time, up to 72 h ahead. **If they're unpaid, the bank stops earning, but nothing is lost.**
- **Robbery:** every 6 h each bank has a **(100 − security) ÷ 4 %** chance of being robbed, starting at 50 security, so 12.5%. A robbery takes **7.5% of your *unclaimed* rewards** back into the Vault. **Your bank and assets are never at risk.**

## 5. Cashing out (the part most relevant to us)
| Rule | Value |
|---|---|
| Claim cooldown | 2 h |
| **Claim tax** | **10%, or 25% if you claimed in the last 24 h.** The tax stays in the Vault for everyone |
| Must hold | 10,000 $VST in your wallet to claim (anti-bot) |
| Daily limit | **1M per wallet, 15M for all players combined** |
| The alternative | **"Pay with rewards": no tax, no wallet popup, 10% off** |
| Trading tax | Buys free. Sells 3.5% → 2%, and every sell fee is burned |

## 6. NFTs (the user asked specifically how they use them)
- **1,000 supply, free mint**, through a whitelist: sign in with X, like, repost and comment, post your own content, give a wallet. Partners (communities and DAOs) can apply for spots.
- **What the NFT does** ("holders own a piece of the game, not just a picture"):
  1. **Revenue share:** holders share the game's revenue.
  2. **Governance:** holders vote on game decisions.
  3. **+10% in-game yield boost.**
  4. **Fusion:** fuse NFTs into a stronger one that earns more. It's deflationary.
- "More details coming soon." Revenue share and fusion aren't specified yet.

## 7. Funnel
- Early access is a 6-step X quest: follow, repost, **quote with your generated bank card**, comment, wallet.
- **Referral links: top referrers win a free mint spot.** There's a leaderboard of top referrers.

---

## 8. Lessons for The Chog of Wall Street
| Lesson | Verdict | Change to The Chog of Wall Street |
|---|---|---|
| **Claim tax that's higher if you claimed recently, plus a hold streak reset by claiming** | ✅ **Validates our design** | Same shape as our Exit tax + Loyalty + Prestige reset. Their numbers (10–25% tax, +50% streak cap) back ours (10–20% tax, +50% Prestige cap) |
| **"Spend inside: no tax, 10% off"** | ✅ **Already true** | Cash in the Chog is spent on Bricks, rolls, guards and hype with no exit tax. Say it loudly in the UI: *"Reinvest free. Cash out 20%."* |
| **A global daily claim cap (15M a day)** | ✅ **Adopt, replacing the bank-run surcharge** | **Cash-outs are capped at 2% of all game cash per UTC day across all Chogs.** One clear rule instead of our surcharge formula |
| **Upkeep: unpaid guards mean you stop earning, but lose nothing** | ✅ **Adopt as Property Tax, replacing the Tired penalty** | **Bricks pay 0.5% of their value per day, prepaid up to 3 days, into the Commons.** Unpaid Bricks earn no rent (it goes to the Commons) but **are never lost.** It's Magie's land-value tax, a steady $CHOG sink, a reason to visit every 3 days, and the "dilution" lever for absent holders. Autopilot can prepay it |
| **Robbery takes only *unclaimed* rewards, never assets** | ✅ **Adopt for the Heist** | **The Heist steals 10% of the target's *unclaimed rent*, not its cash.** Claiming into the Chog protects you. It's gentler, and the target's rent can never drop below zero |
| **Grand Opening: can't be robbed** | ✅ **Adopt (tiny)** | A newly woken Chog is **Heist-immune for 24 h** |
| **The NFT gets revenue share** | ✅ **Adopt as the Sleeping Chog Dividend** | **10% of everything flowing into the Commons accrues equally to all 1,969 Chog tokenIds, woken or not.** It shows on every Deed Card ("this Chog has 3,240 $CHOG waiting"). **Claiming means waking the Chog**, and the dividend lands as its starting cash. It lifts the **whole collection's floor** and is our best onboarding hook |
| NFT +10% boost | ➖ Already covered | In our game every player *is* a Chog, so trait perks do this job |
| NFT governance | ❌ Skip for the MVP | Later, holders could vote on the Daily Hot Street sponsor or the dapp list |
| **Fusion** | ❌ **Reject** | Burning Chogs destroys art and community, and the supply is already fixed at 1,969 |
| Emission from a 600M pool | ❌ **Reject** | We mint and emit nothing. Our yield is rent between players. Safer optics, no inflation |
| Treasuries bought with ETH that goes to the team | ❌ Skip | Our "Treasury" is the Chog itself |
| Build timers on branches | 💡 Maybe later | Building levels could take time to rise after a big buy (an anticipation hook). Not for the MVP |
| Referral leaderboard for free mints | 💡 Marketing | Founder posts already cover it. Add a referral code to the Deed Card share image |
