# Teardown 3: Daemon (trydaemon.vercel.app)

**Checked:** 2026-10-22
**Sources:**
- Live site: [trydaemon.vercel.app](https://trydaemon.vercel.app), covering the landing page, the FAQ, `/app` and `/practice`.
- **The full monorepo:** [github.com/Datwebguy/Daemon](https://github.com/Datwebguy/Daemon). I read the README, `contracts/src/account/DaemonAccount.sol` (910 lines), `DaemonDeploy.sol` (the live parameters), `TraitPolicy.sol`, `DegenVault.sol` and the FAQ component.

**Status:** a Chogathon 2026 entry (a competitor). Deployed on **Monad testnet (10143)**, with every contract source-verified.

> **One line:** every Chog gets its own wallet that earns, compounds, and has a mood.

---

## 1. Architecture
```
Chog NFT ─► ERC-6551 Registry (canonical 0x0000…6551…) ─► DaemonAccount (one per Chog)
DaemonAccount ─allocate─► StrategyRegistry-approved vaults (Stable / Degen)
anyone ─compound()─► DaemonAccount ─tip─► caller           (keeper network)
friends ─hype() MON / hypeWithChog()─► hype jar ─► boost on harvests
events ─► Envio HyperIndex ─► live feed + weekly leaderboard
```

**Stack:**
- Foundry and OpenZeppelin for the contracts.
- Next.js 16, wagmi and viem for the app, with **Privy** email and social sign-in, so there's no seed phrase.
- An open-source Node keeper bot.
- Envio HyperIndex with Hasura for the indexer.

## 2. Mechanics, with the live parameters (`DaemonDeploy.sol`)

| Mechanic | How it works | Live testnet numbers |
|---|---|---|
| **Wake** | The canonical ERC-6551 registry deploys the Chog's `DaemonAccount` at a deterministic address. Whoever holds the NFT controls it | Salt 0 |
| **Save** | The holder allocates dUSD to approved vaults. The account holds the vault shares | Source cap 1M |
| **Stable vault** | A constant reward stream, capped by its budget | 1,000 reward tokens over 30 days |
| **Degen vault** | The reward rate swings between **0.5× and 2×** each epoch, using a deterministic hash of the seed and the epoch. It can never pay out more than was funded | 2-hour epochs, 3,000 reward tokens |
| **Compound** | `compound()` is **public**. Anyone can call it once the rest timer ends. It harvests, swaps the rewards and redeposits them. The **caller earns a tip**: gas back (capped), plus a share of the profit that grows the longer the account waits | Cooldown 10 min. Tip **5% → 10% over 24 h**. Gas refund capped at 1 dUSD. Reverts unless profit > bounty |
| **Hype (MON)** | Anyone can drop MON in the **hype jar**. Each hype adds to a boost multiplier on future harvests | **+0.05× for 3 h**, capped at **1.25×**. Min 0.01 MON. Cooldowns: 1 h per user, 5 min per Daemon |
| **Hype ($CHOG)** | The same, but stronger, and part of it is burned | **+0.10× for 4 h**, **10% burned**, min 10 $CHOG |
| **Lucky hype** | Pays the Pyth Entropy fee too. A critical roll sets the max boost and adds an extra boost duration | 20% chance |
| **The boost is honest** | The extra yield is paid **only from the jar** (MON is wrapped and swapped, then $CHOG), sized by an oracle. It never creates value. Whatever is left in the jar belongs to the holder | — |
| **Mood** | Recomputed on every update, in this order: **Tired** (no activity for longer than `neglectAfter`), then **Flexing** (boosted and profit up), **Chaotic** (max boost, or profit swung more than 2×), **Smug** (profit up), and finally the trait bias (Vibe trait → mood). Each mood has 3 hard-coded lines, e.g. "Volatility is my cardio." | Neglect after 3 days |
| **Exit** | `sweepToOwner()`: one tap takes everything back to the holder's wallet | No fee |
| **Welcome MON** | A relayer drips 0.5 MON once to a new, near-empty wallet. Capped at 50 a day by the contract | — |
| **Practice mode** | The same rules with pretend money and a fast-forward button. No sign-in | — |

## 3. Security patterns worth copying
1. **Approval-style calls are forbidden in `execute()`:**
   - Blocked: `approve`, `increaseAllowance`, `setApprovalForAll`, `permit`, and Permit2 `approve`.
   - **Why:** an allowance granted by a previous owner would survive an NFT sale and let the seller drain the buyer's account.
   - This is *the* key insight for any game where the NFT carries value.
2. **CALL only.** `delegatecall` is rejected (operation must be 0).
3. **The pots are clamped to real balances** after every owner call, so the accounting never shows money that isn't there.
4. **Compounding is bounded:**
   - Approved vaults only.
   - Slippage limit (3%) and a minimum-profit check.
   - Funds can only return to the same account.
5. **The "golden rule":** "If Daemon vanished tomorrow, every holder could still withdraw everything, and anyone could still compound every Daemon."

## 4. NFT usage
- **The NFT is the account owner.** Sell the Chog and the savings, history and attitude go with it.
- The **Vibe trait biases the mood** (`TraitPolicy`): Calm → Chill, Cocky → Smug, Wild → Chaotic, Flashy → Flexing, Sleepy → Tired. It never affects yield.
- **On-chain `tokenURI`** (on their testnet mock Chog) shows the live mood, boost and savings.
- **Caveat:** the real Genesis collection's metadata is immutable, so this only works on their mock collection.

## 5. Retention
- The mood decays to Tired after 3 days with no activity, which is an emotional nudge to come back.
- Friends hyping you is a social loop. The live feed shows hypes, harvests and mood changes in the Daemon's own words.
- Weekly leaderboard and seasons.

---

## 6. What to take for The Chog of Wall Street
| Steal | How it shows up in The Chog of Wall Street |
|---|---|
| **The Chog's own account (ERC-6551)** | A **Chog Vault** holds the Chog's game cash and the real dapp positions it picks up on dapp squares (LST, vault shares) |
| **Forbidding approvals and delegatecall** | The same rules, plus: **only whitelisted adapters can be called, and assets leave only through `cashOut()`** (that's where the exit tax lives) |
| **Permissionless keeper calls with a tip** | Anyone can **settle dice rolls, run autopilot turns and close auctions** for a small tip. The game keeps running without us |
| **The hype jar ($CHOG, 10% burned)** | **Hype a Chog:** fans boost its rent income by up to 1.25× for 4 hours, paid only from the jar. It's social and a $CHOG sink |
| **Moods** | The Chog's mood follows its empire: Tycoon, Flexing, Chaotic, **Tired** (idle 3 days, rent claims ×0.75), and **Broke** |
| **Pyth Entropy "lucky" rolls** | Entropy cards, plus a per-epoch dice seed (see the dice design) |
| **Practice mode with fast-forward** | **Practice City** for judges, with no wallet |
| **Privy sign-in and welcome MON** | Remove onboarding friction (stretch goal) |

## 7. Weaknesses we can beat
- **There's no game.** It's a savings account with a face. Fun and novelty depend on the moods.
- **"One tap out, any time, no fee."** Holders can strip the Chog and sell it empty, so **the NFT's value doesn't stick.** That's exactly what our user wants to prevent.
- **Testnet only, with mock vaults.** It doesn't touch real Monad dapps.
- **$CHOG is only a hype currency.**
