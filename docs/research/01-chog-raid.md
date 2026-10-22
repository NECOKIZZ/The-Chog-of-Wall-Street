# Teardown 1: Chog Raid (chog-raid.vercel.app)

**Checked:** 2026-10-22
**Sources:**
- Live site: [chog-raid.vercel.app](https://chog-raid.vercel.app): home, `/chog`, `/atlas`, `/leaderboards`, `/defend`.
- **The full source code:** [github.com/Im-2/chog-raid](https://github.com/Im-2/chog-raid). I read the README, `CLAUDE.md` (the build brief), and the files in `src/config/*`, `src/engine/*` and `src/server/*`.

**Builder:** [@nuelcrypt](https://x.com/nuelcrypt). It's a Chogathon 2026 entry, so a direct competitor.
**Chain:** Monad mainnet (chain id 143).
- Chog Genesis: `0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763` (ERC-721, 1,969 tokens, ids 1–1969).
- $CHOG: `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777`.

> **One line:** every Chog becomes a room in one giant shared dungeon. Owners set traps that defend the room while they're offline, and everyone else raids it.

---

## 1. Core loop

| Role | What you do | Needs a Chog? |
|---|---|---|
| **Raider** | Walk a 16×16 grid from the green entrance to the exit door, with limited HP and moves. Dodge the traps | No. Anyone can raid, even without a wallet |
| **Warden** (the holder) | Place traps in your Chog's room. It defends itself while you're offline. You earn points each time a raider fails | Yes. `ownerOf` is re-checked on every save |

- Raids are **turn-based and deterministic**: the same moves always give the same result.
- **The server is the source of truth.** The browser predicts each move instantly and sends moves in batches. The server replays the whole move list with the same engine and returns only what the raider can see. Hidden traps (and the fog in boss rooms) never reach the browser.
- **Every raid's move list is stored.** It doubles as a replay for the owner's raid log.

## 2. How the NFT is used (their "NFT is essential" answer)

1. **The room is built from the Chog's art.**
   - The image is downsampled to 16×16, keeping the ink lines.
   - Dark lines become walls, blue becomes water (slows you down), and saturated red becomes embers (damage).
   - A path from entrance to exit is always carved, so every room is solvable.
2. **Traits set the rules** through one config table (`src/engine/traitRules.ts`):

| Trait | Effect |
|---|---|
| Tier | +trap slots and more trap types |
| Laser eyes, horns, fire shirt, fiery aura, toxic sky, candles | Embers scattered across the floor |
| Visor, VR and glasses eyes, knife, guard outfits, skull base | Unlock **guards** |
| Heist hats (Robber, Mafia), jail outfits, gold tooth, coin | Unlock **lock doors** |
| Royal headgear, armor, royal aura | +1 trap slot |
| 1:1s | +2 trap slots |

   - Trait types with no effect: Skin, Side, Naked, Form.
   - Unknown trait types get a stable fallback effect from a hash of the trait.
3. **Rarity sets the difficulty (native defenses).** These are always on and can't be removed. Tier counts are real:

| Tier | Count | Native defenses | HP / moves | Points |
|---|---|---|---|---|
| Common | 1,279 | none | 5 / 60 | ×1 |
| Uncommon | 590 | a few walls, 2 embers, 1 guard | 5 / 56 | ×1.25 |
| Rare (Skull base) | 60 | walls, 4 embers, 1 guard, 1 locked door | 4 / 54 | ×1.6 |
| Epic (Radioactive base) | 30 | dense walls, 10 embers, 4 guards, 1 locked door | 4 / 48 | ×2 |
| Legendary (named 1/1s) | 10 | dense walls, 12 embers, 4 guards, 2 doors, plus a **boss signature** and **fog of war** | 4 / 44 | ×3 |

4. **Ownership follows the token.** Transfer the Chog and the new owner takes over the room. The old owner loses edit rights at once.

## 3. Traps

| Trap | Visible? | Effect |
|---|---|---|
| Spike | Hidden | Damage |
| Teleporter | Hidden | Sends you back to the entrance |
| Guard | Visible, with a warning pulse before it steps next to you | Patrols up to N tiles back and forth. Contact deals damage |
| Lock door | Visible | Blocks the way until you pick up its key, which is placed far away |

- **Practice traps:** rooms with no defender get a fair, clearly labelled practice set, so every room has something to dodge.
  - Simulated clear rates run from **93% (Common) down to 53% (Legendary)**.
- **Extra moves:**
  - Hourglass pickups give +6 moves.
  - "Keep going" gives +10 moves once per raid, but the clear then pays half points and doesn't count for the speed boards.

## 4. Retention (all numbers from `src/config/retention.ts`)

- **Weekly seasons**, starting Mondays at 00:00 UTC. The top 3 on each board get a badge.
- **Raider points:**

| Event | Points |
|---|---|
| Clear | 100 |
| First clear of a room this season | +50 |
| Repeat clear | 10 |
| First clear ever of a defended room | +150 |
| Fast-clear bonus | Up to +60 at par, falling to 0 at 2× par |
| Daily-room clear | +75 |
| Practice room | Half points |

- **Warden points:**
  - 20 for every hold (a raider fails in your room).
  - +5 for each consecutive hold, capped at +50.
  - Multiplied by the tier multiplier.
  - **Wardens never lose points.**
- **Daily raid:** one featured room per UTC day, the same for everyone (a hash of the date). It has its own board and 3 counted attempts.
- **Streaks:** a raid-day streak for raiders, and a "days held" streak for holders.
- **Raid alerts:** "Your Chog was raided 4 times, 1 got through", with replays.
- **The rebuild nudge** (`src/server/nudge.ts`): after a breach the owner sees a **heatmap of the paths raiders took**, where failed raiders died, and **one suggested trap change**. It's a clever loop that brings the defender back.
- **The Atlas:** a zoomable canvas map of all 1,969 rooms, coloured by activity, with pulses for fresh raids and a live feed.

## 5. How $CHOG is used (optional by design)

| Layer | What it does |
|---|---|
| Hold-to-unlock perks (read-only `balanceOf`) | 100 → badge · 1,000 → one extra counted daily raid · 10,000 → a golden torch (cosmetic) |
| Pay for a bonus attempt | 10 $CHOG, as a normal ERC-20 transfer to a pool address. Rules below the table |
| Season rewards | The top 50 Wardens and top 50 Raiders split the pool's **real on-chain balance** 50/50. Bands: #1 20%, #2 12%, #3 8%, #4–10 share 25%, #11–50 share 35%. Payouts are manual, from a ranking snapshot. It's **unfunded** today, and the UI says so |

**The bonus-attempt payment:**
- The server reads the receipt and checks the Transfer event: the token, the sender, the recipient, the amount, and 2 confirmations.
- It claims the transaction hash with an atomic insert so a payment can't be reused.
- There's a limit of 3 payments per day, and a payment older than 24 hours doesn't count.

**Anti-abuse:**
- A raid is flagged if it averages more than 12 moves per second.
- So is the same long move sequence coming from 5 or more wallets.
- So is "Warden farming": 30+ failed raids on a room from 2 or fewer raiders.

## 6. Tech
- Next.js, TypeScript and Canvas.
- viem, plus Reown AppKit for wallets, and Sign-In with Ethereum for sessions.
- Supabase, or a JSON file store.
- A Vercel cron for season snapshots, and a GitHub Action that keeps the server warm.
- **No contracts.** Everything is off-chain except reads of `ownerOf`, `tokenURI` and `balanceOf`, plus the payment check.

---

## 7. What to take for The Chog of Wall Street

| Steal | How it shows up in The Chog of Wall Street |
|---|---|
| **Async defense, the Warden role** | A **Heist** square: raid another Chog's cash. Holders set **guards** that defend while they're offline, and they earn Warden points and fines when a raid fails |
| **A trait → rules table in one config file** | A trait-perk table (capped at about 10%) using the *same real trait values* (laser eyes, heist hats, inmate outfits, gold tooth…) |
| **Tier = difficulty and prestige** | Tier sets base defense against Heists, plus a small rent bonus. Legendary 1/1s become **Landmark Chogs** |
| **A daily featured X, the same for everyone** | A **Daily Hot Street**: rent ×2 on one street a day, picked by a hash of the date |
| **Alerts and replays** | "Your Chog collected 4 rents, 1 Heist failed", in an alert feed |
| **A rebuild nudge** | "Your street is under-defended, add a guard?" plus a suggested action |
| **Honest $CHOG pool UI** | Show the pot's real on-chain balance. Never imply guaranteed payouts |
| **Hash-claim for payments** | The same receipt-verification pattern for "proof-of-visit" dapp quests (see the The Chog of Wall Street plan) |
| **Anti-abuse thresholds** | Flags for sybil Heists and rent wash trading |

## 8. Weaknesses we can beat
- **$CHOG is cosmetic.** "Nothing is gated." That's safe, but it scores low on the "meaningful $CHOG integration" bonus. **In The Chog of Wall Street, $CHOG is the economy.**
- **The NFT doesn't gain value from playing.** A heavily defended room isn't worth more on the market, and no value lives inside the Chog.
- **It's entirely off-chain.** There are no contracts, so the outcomes aren't verifiable on-chain.
- **Raiders don't need a Chog**, so demand for the NFT only comes from holders.
