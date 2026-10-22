# Teardown 4: Hoodopoly (hoodopoly.fun)

**Checked:** 2026-10-22
**Status of this teardown: ⚠️ incomplete, because the site was unreachable.**

## 1. What happened when we tried to open it
| Attempt | Result |
|---|---|
| `https://hoodopoly.fun/` from our container | TLS reset. Our proxy gave **503: "upstream connect error … remote connection failure"**. The DNS name resolves to `138.124.117.129`. |
| An external renderer (r.jina.ai, a headless Chrome) | **`net::ERR_CONNECTION_REFUSED`** on hoodopoly.fun, so the server is refusing connections from outside too, not just from us. |
| Wayback Machine and archive.ph | Rate-limited or behind a CAPTCHA. No snapshot retrieved. |
| Web search, three variants (incl. "Robinhood chain") | No results for hoodopoly.fun. The only "Hoodopoly" hits are a 2003 banned board-game spin-off (unrelated) and an unrelated private X account, @Hoodopoly. |
| `hoodopoly.vercel.app` | **A HOODOPOLY page exists here**, but the deployment serves a **broken, truncated 2 KB fragment**: the page's HTML is wrapped in a JSON object and cut off. See §2. |

**Conclusion:** hoodopoly.fun was down or blocking visitors while we worked. **Action for the team:** paste screenshots or text from the site, or a docs or X link, and we'll finish this teardown. Until then, this file holds what can be confirmed, plus the closest documented analogue.

## 2. What we could confirm (from the hoodopoly.vercel.app fragment)
- The title is **HOODOPOLY**. We can't confirm it's the same team as hoodopoly.fun.
- The fonts are **Luckiest Guy** (a chunky cartoon display font) and **Nunito**.
- The palette: sky blue `#74c8ee`, grass green `#179c58`, yellow `#ffd32a`, red `#e33127`, navy `#102d61`. It's a bright, toy-like board-game look.
- Structure:
  - A full-screen **`<canvas>` game**.
  - A **`#select` screen** (a sky-and-grass scene, likely **pawn or character select**).
  - A big "HOODOPOLY" title with a tagline.
  - An `.info` card (a rules or how-to panel with a red Luckiest Guy heading).
  - Green and red "pills" (status tags).
- The rest of the page (the game logic) is cut off.

## 3. Reading it from the name and the market (inference)
- **"Hood"** is the nickname of **Robinhood Chain**: its ticker is HOOD, there's a "hood" memecoin scene, and both Fomopoly and $MONO launched there.
- So Hoodopoly is very likely **a Monopoly-style board game on Robinhood Chain**, the same wave as **$MONO / monopoly.land**, which we tore down in full in [`00-mono-monopoly-land.md`](00-mono-monopoly-land.md).
- In that genre, the mechanics are:
  - an async shared board, where nobody waits for a turn;
  - **property tiles backed by tokenized stocks**;
  - fractional shares on a curve (price = liquidity ÷ shares, with a 2% spread);
  - rent split 90% to shareholders and 10% to the treasury, claimable hourly;
  - a Free Parking pot paid from taxes;
  - AI agents as players;
  - a practice table with play money.

## 4. What to take for The Chog of Wall Street (from the genre, until we can see the real site)
| Idea | How it shows up in The Chog of Wall Street |
|---|---|
| **A bright cartoon board with pawn select** | **Your Chog is the pawn.** "Pawn select" becomes "pick which of your Chogs to send into the city". Toy-box art |
| **Real assets behind the tiles** (stocks on Hood) | On Monad, **tiles are backed by real Monad dapps.** Landing on one does something real: an LST stake, a $CHOG swap on Kuru or Uniswap, a nad.fun buy, a lending deposit |
| **Async table, fractional ownership** | The same, but **the shares belong to Chog NFTs, not wallets** |
| **The Free Parking pot** | **The Nad Lounge pot**, funded by Gas and MEV taxes, bail and extra-roll fees |

## 5. Open items
- [ ] Get screenshots or text of hoodopoly.fun from the team.
- [ ] Confirm the chain, token and mechanics, then update §3 and §4.
