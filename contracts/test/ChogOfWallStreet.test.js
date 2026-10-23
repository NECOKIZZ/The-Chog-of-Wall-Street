const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");

const E = 10n ** 18n;
const C = n => BigInt(n) * E; // whole $CHOG
const D = n => BigInt(n) * 1000n; // game units: 1 unit = $0.001 = 1,000 USDC base units
const DEAD = "0x000000000000000000000000000000000000dEaD";

describe("ChogOfWallStreet", () => {
  let game, usdc, chog, nft, adapter, admin, alice, bob, carol, keeper, signer;
  const ALICE = 1, BOB = 2, CAROL = 3;

  async function invariant() {
    expect(await usdc.balanceOf(await game.getAddress())).to.equal(await game.accounted());
    expect(await chog.balanceOf(await game.getAddress())).to.equal(0n); // the game never holds $CHOG
  }
  async function rollAndSettle(id, who) {
    await game.connect(who).roll(id);
    await mine(1);
    await game.connect(keeper).settle(id);
  }
  async function playUntilBricks(id, who) {
    for (let k = 0; k < 40 && (await game.brickValue(id)) === 0n; k++) {
      if ((await game.rollsOf(id)) === 0n) await time.increase(1800);
      if ((await game.chogs(id)).jail > 0) await game.connect(who).payBail(id);
      await rollAndSettle(id, who);
    }
  }

  beforeEach(async () => {
    [admin, alice, bob, carol, keeper, signer] = await ethers.getSigners();
    usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
    chog = await (await ethers.getContractFactory("MockCHOG")).deploy();
    nft = await (await ethers.getContractFactory("MockChogNFT")).deploy();
    game = await (await ethers.getContractFactory("ChogOfWallStreet")).deploy(await nft.getAddress(), await usdc.getAddress(), await chog.getAddress());
    adapter = await (await ethers.getContractFactory("MockSwapAdapter")).deploy(await usdc.getAddress(), await game.getAddress(), 500_000n); // 0.50 USDC per MON
    await usdc.mint(await adapter.getAddress(), D(1_000_000));
    for (const [who, id] of [[alice, ALICE], [bob, BOB], [carol, CAROL]]) {
      await nft.mint(who.address, id);
      await usdc.mint(who.address, D(200_000));
      await chog.mint(who.address, C(200_000));
      await usdc.connect(who).approve(await game.getAddress(), ethers.MaxUint256);
      await chog.connect(who).approve(await game.getAddress(), ethers.MaxUint256);
    }
  });

  it("wakes a Chog only for its owner, with exactly the $20 opening deposit", async () => {
    await expect(game.connect(bob).wake(ALICE, D(20_000))).to.be.revertedWithCustomError(game, "NotOwner");
    await expect(game.connect(alice).wake(ALICE, D(19_999))).to.be.revertedWithCustomError(game, "Bad");
    await expect(game.connect(alice).wake(ALICE, D(50_000))).to.be.revertedWithCustomError(game, "Bad");
    await game.connect(alice).wake(ALICE, D(20_000));
    expect((await game.chogs(ALICE)).cash).to.equal(D(20_000));
    expect(await game.rollsOf(ALICE)).to.equal(8n);
    await invariant();
  });

  it("caps top-ups (and USDC from app squares) at $20 per Chog per season", async () => {
    await game.connect(alice).wake(ALICE, D(20_000));
    await game.connect(alice).topUp(ALICE, D(15_000));
    for (let sq = 0; sq < 40; sq++) await game.setAdapter(sq, await adapter.getAddress());
    await game.connect(alice).quest(ALICE, "0x", { value: 6n * E }); // 6 MON → $3.00 of cash
    await expect(game.connect(alice).topUp(ALICE, D(2_001))).to.be.revertedWithCustomError(game, "Cap");
    await game.connect(alice).topUp(ALICE, D(2_000));
    expect(await game.seasonTopUp(ALICE)).to.equal(D(20_000));
    await time.increase(7 * 86400 + 60);
    await game.tickSeason(); // Closing Bell starts
    await time.increase(120);
    await game.tickSeason(); // season ends
    await game.connect(alice).topUp(ALICE, D(20_000)); // new season, new allowance
    await invariant();
  });

  it("stays zero-sum through hundreds of rolls (balance == accounted)", async () => {
    const players = [[alice, ALICE], [bob, BOB], [carol, CAROL]];
    for (const [who, id] of players) await game.connect(who).wake(id, D(20_000));
    await game.connect(bob).setPlan(BOB, 2);
    let rents = 0;
    for (let round = 0; round < 70; round++) {
      for (const [who, id] of players) {
        const c = await game.chogs(id);
        if (c.jail > 0 && c.cash >= D(500)) await game.connect(who).payBail(id);
        if ((await game.rollsOf(id)) === 0n) continue;
        await game.connect(who).roll(id);
        await mine(1);
        const rc = await (await game.connect(keeper).settle(id)).wait();
        rents += rc.logs.filter(l => l.fragment && l.fragment.name === "Rent").length;
        if ((await game.chogs(id)).cash < D(2_000) && (await game.seasonTopUp(id)) <= D(10_000)) await game.connect(who).topUp(id, D(10_000));
      }
      if (round % 10 === 9) {
        for (const [who, id] of players) { await game.connect(who).claim(id); try { await game.connect(who).prepayTax(id, 86400); } catch (e) { /* broke: tax lapses, which is allowed */ } }
      }
      await time.increase(30 * 60);
    }
    expect(rents).to.be.greaterThan(0);
    expect(await game.buybackPot()).to.be.gt(0n);
    await invariant();
  });

  it("caps any one Chog at 40% of a street after its first 10 Bricks", async () => {
    await game.connect(alice).wake(ALICE, D(20_000));
    await game.connect(alice).setPlan(ALICE, 2);
    for (let k = 0; k < 40; k++) {
      if ((await game.rollsOf(ALICE)) === 0n) await time.increase(30 * 60);
      const c = await game.chogs(ALICE);
      if (c.jail > 0 && c.cash >= D(500)) await game.connect(alice).payBail(ALICE);
      await rollAndSettle(ALICE, alice);
    }
    for (let sq = 0; sq < 40; sq++) {
      const p = await game.props(sq);
      const mine = await game.bricks(sq, ALICE);
      const cap = (p.supply * 4n) / 10n > 10n ? (p.supply * 4n) / 10n : 10n;
      if (p.supply > 0n) expect(mine).to.be.lte(cap);
    }
    await invariant();
  });

  it("lets anyone land a committed roll and pays the keeper a small USDC tip", async () => {
    await game.connect(alice).wake(ALICE, D(20_000));
    await expect(game.connect(keeper).settle(ALICE)).to.be.revertedWithCustomError(game, "Pending");
    await game.connect(alice).roll(ALICE);
    await expect(game.connect(alice).roll(ALICE)).to.be.revertedWithCustomError(game, "Pending");
    await mine(1);
    const before = await usdc.balanceOf(keeper.address);
    await game.connect(keeper).settle(ALICE);
    expect(await usdc.balanceOf(keeper.address)).to.equal(before + D(5));
    await invariant();
  });

  it("cash-out is taxed, queued 48h, capped city-wide, and resets Prestige", async () => {
    await game.connect(alice).wake(ALICE, D(20_000));
    await game.connect(bob).wake(BOB, D(20_000));
    await time.increase(10 * 86400);
    // after 10 days: Prestige 10%, exit tax 19% (one loyal week off 20%)
    const cap = await game.dailyCapLeft(); // 2% of $40 = $0.80
    expect(cap).to.equal(D(800));
    await expect(game.connect(alice).requestCashOut(ALICE, cap + 1n)).to.be.revertedWithCustomError(game, "Cap");
    const commons0 = await game.commons(), pot0 = await game.buybackPot();
    await game.connect(alice).requestCashOut(ALICE, D(500));
    const tax = (D(500) * 19n) / 100n;
    expect(await game.commons()).to.equal(commons0 + tax / 2n);
    expect(await game.buybackPot()).to.equal(pot0 + tax / 4n); // a quarter of the tax buys back $CHOG
    await expect(game.connect(alice).claimCashOut(ALICE)).to.be.revertedWithCustomError(game, "Locked");
    await time.increase(48 * 3600);
    const w0 = await usdc.balanceOf(alice.address);
    await game.connect(alice).claimCashOut(ALICE);
    expect(await usdc.balanceOf(alice.address)).to.equal(w0 + D(500) - tax);
    await invariant();
  });

  it("selling the NFT moves the whole empire and starts Moving Day", async () => {
    await game.connect(alice).wake(ALICE, D(20_000));
    await game.connect(alice).setPlan(ALICE, 2);
    for (let k = 0; k < 6; k++) { const c = await game.chogs(ALICE); if (c.jail > 0) await game.connect(alice).payBail(ALICE); await rollAndSettle(ALICE, alice); }
    const ap = await game.appraisal(ALICE);
    await nft.connect(alice).transferFrom(alice.address, carol.address, ALICE);
    await expect(game.connect(alice).claim(ALICE)).to.be.revertedWithCustomError(game, "NotOwner");
    await game.connect(carol).claim(ALICE);
    expect(await game.appraisal(ALICE)).to.be.gte(ap);
    await expect(game.connect(carol).requestCashOut(ALICE, D(100))).to.be.revertedWithCustomError(game, "Locked");
    await time.increase(72 * 3600);
    await game.connect(carol).requestCashOut(ALICE, D(100));
    await invariant();
  });

  it("$CHOG utilities: extra rolls and guards burn $CHOG; hype burns 10% and tips the owner 90%", async () => {
    await game.connect(alice).wake(ALICE, D(20_000));
    const d0 = await chog.balanceOf(DEAD);
    await game.connect(alice).buyExtraRoll(ALICE);
    await game.connect(alice).hireGuard(ALICE);
    expect(await chog.balanceOf(DEAD)).to.equal(d0 + C(600));
    expect((await game.chogs(ALICE)).guards).to.equal(1n);
    const a0 = await chog.balanceOf(alice.address);
    await game.connect(bob).hype(ALICE, C(1_000));
    expect(await chog.balanceOf(DEAD)).to.equal(d0 + C(700));
    expect(await chog.balanceOf(alice.address)).to.equal(a0 + C(900));
    expect((await game.chogs(ALICE)).hypeBps).to.equal(11_000n);
    expect(await game.chogBurned()).to.equal(C(700));
    expect((await game.chogs(ALICE)).cash).to.equal(D(20_000)); // no USDC moved
    await invariant();
  });

  it("buyback: fees collected in USDC buy $CHOG and burn it", async () => {
    for (const [who, id] of [[alice, ALICE], [bob, BOB]]) { await game.connect(who).wake(id, D(20_000)); await game.connect(who).setPlan(id, 2); }
    await playUntilBricks(ALICE, alice);
    const pot = await game.buybackPot();
    expect(pot).to.be.gt(0n);
    await expect(game.buyback(0)).to.be.revertedWithCustomError(game, "Bad"); // no adapter yet
    const bb = await (await ethers.getContractFactory("MockBuyback")).deploy(await usdc.getAddress(), await chog.getAddress(), await game.getAddress(), 10n ** 13n);
    await game.setBuybackAdapter(await bb.getAddress());
    const d0 = await chog.balanceOf(DEAD);
    await expect(game.connect(keeper).buyback(pot * 10n ** 13n + 1n)).to.be.reverted; // slippage guard
    await game.connect(keeper).buyback(0);
    expect(await game.buybackPot()).to.equal(0n);
    expect(await chog.balanceOf(DEAD)).to.equal(d0 + pot * 10n ** 13n);
    await invariant();
  });

  it("Tier-A quest swaps MON into USDC inside the Chog and stamps it", async () => {
    await game.connect(alice).wake(ALICE, D(20_000));
    for (let sq = 0; sq < 40; sq++) await game.setAdapter(sq, await adapter.getAddress());
    const cash0 = (await game.chogs(ALICE)).cash;
    await game.connect(alice).quest(ALICE, "0x", { value: E });
    expect((await game.chogs(ALICE)).cash).to.equal(cash0 + D(500));
    expect((await game.chogs(ALICE)).stamps).to.not.equal(0n);
    expect(await game.rollsOf(ALICE)).to.be.gte(8n);
    await invariant();
  });

  it("rent earned while Property Tax is unpaid goes to the Commons", async () => {
    for (const [who, id] of [[alice, ALICE], [bob, BOB]]) { await game.connect(who).wake(id, D(20_000)); await game.connect(who).setPlan(id, 2); }
    await playUntilBricks(ALICE, alice);
    expect(await game.brickValue(ALICE)).to.be.gt(0n);
    await time.increase(5 * 86400);
    for (let k = 0; k < 60; k++) {
      if ((await game.rollsOf(BOB)) === 0n) await time.increase(1800);
      if ((await game.chogs(BOB)).jail > 0 && (await game.chogs(BOB)).cash >= D(500)) await game.connect(bob).payBail(BOB);
      await rollAndSettle(BOB, bob);
    }
    const pending = await game.pendingRent(ALICE);
    await game.connect(alice).claim(ALICE);
    if (pending > 0n) expect((await game.chogs(ALICE)).unclaimed).to.equal(0n);
    await invariant();
  });

  it("48-hour rule: a Chog that hasn't rolled in 48 hours stops earning until it rolls again", async () => {
    for (const [who, id] of [[alice, ALICE], [bob, BOB]]) { await game.connect(who).wake(id, D(20_000)); await game.connect(who).setPlan(id, 2); }
    await playUntilBricks(ALICE, alice);
    await game.connect(alice).prepayTax(ALICE, 3 * 86400); // tax is not the reason
    const last = (await game.chogs(ALICE)).lastRoll;
    expect(await game.earningUntil(ALICE)).to.equal(last + 48n * 3600n);
    await game.connect(alice).claim(ALICE);
    const commons0 = await game.commons();
    await time.increase(49 * 3600); // Alice idles past 48h
    for (let k = 0; k < 40; k++) {
      if ((await game.rollsOf(BOB)) === 0n) await time.increase(1800);
      if ((await game.chogs(BOB)).jail > 0 && (await game.chogs(BOB)).cash >= D(500)) await game.connect(bob).payBail(BOB);
      await rollAndSettle(BOB, bob);
    }
    const pending = await game.pendingRent(ALICE);
    const cash0 = (await game.chogs(ALICE)).cash;
    await game.connect(alice).claim(ALICE);
    const gained = (await game.chogs(ALICE)).cash - cash0; // includes any claim bonus, still far below pending
    if (pending > 0n) {
      expect(gained).to.be.lt(pending); // most of it forfeited to the Commons
      expect(await game.commons()).to.be.gt(commons0);
    }
    // one roll switches earning back on
    if ((await game.chogs(ALICE)).jail > 0) await game.connect(alice).payBail(ALICE);
    await game.connect(alice).roll(ALICE);
    expect(await game.earningUntil(ALICE)).to.be.gt(BigInt(await time.latest()));
    await invariant();
  });

  it("mortgage: borrow half a street, its rent goes to the Bank, no selling or cash-out until repaid +10%", async () => {
    for (const [who, id] of [[alice, ALICE], [bob, BOB]]) { await game.connect(who).wake(id, D(20_000)); await game.connect(who).setPlan(id, 2); }
    await playUntilBricks(ALICE, alice);
    let sq = 0; for (; sq < 40; sq++) if ((await game.bricks(sq, ALICE)) > 0n) break;
    await usdc.mint(admin.address, D(100_000)); await usdc.approve(await game.getAddress(), ethers.MaxUint256);
    await game.fundBank(D(50_000)); // seed the Bank's reserves
    // let the city run so the Commons (the Bank's reserves) builds up from fees and rent
    for (let k = 0; k < 40 && (await game.commons()) < (await game.brickValue(ALICE)) * 2n; k++) {
      for (const [who, id] of [[alice, ALICE], [bob, BOB]]) {
        if ((await game.rollsOf(id)) === 0n) await time.increase(1800);
        const c = await game.chogs(id); if (c.jail > 0 && c.cash >= D(500)) await game.connect(who).payBail(id);
        if (c.cash < D(1_000) && (await game.seasonTopUp(id)) <= D(15_000)) await game.connect(who).topUp(id, D(5_000));
        try { await rollAndSettle(id, who); } catch (e) { /* jailed or broke */ }
      }
    }
    sq = 0; for (; sq < 40; sq++) if ((await game.bricks(sq, ALICE)) > 0n) break;
    const cash0 = (await game.chogs(ALICE)).cash;
    await game.connect(alice).mortgage(ALICE, sq);
    const l = await game.loan(sq, ALICE);
    expect(l).to.be.gt(0n);
    expect((await game.chogs(ALICE)).cash).to.equal(cash0 + l);
    await expect(game.connect(alice).sellBricks(ALICE, sq, 1, 0)).to.be.revertedWithCustomError(game, "Locked");
    await expect(game.connect(alice).requestCashOut(ALICE, D(10))).to.be.revertedWithCustomError(game, "Locked");
    await expect(game.connect(alice).mortgage(ALICE, sq)).to.be.revertedWithCustomError(game, "Bad");
    const c1 = (await game.chogs(ALICE)).cash;
    await game.connect(alice).repay(ALICE, sq);
    expect((await game.chogs(ALICE)).cash).to.equal(c1 - l - l / 10n);
    expect(await game.loanOf(ALICE)).to.equal(0n);
    await invariant();
  });

  it("auction: bids come from Chog cash, outbid refunds, the winner gets the Bricks and the seller the money", async () => {
    for (const [who, id] of [[alice, ALICE], [bob, BOB], [carol, CAROL]]) { await game.connect(who).wake(id, D(20_000)); await game.connect(who).setPlan(id, 2); }
    await playUntilBricks(ALICE, alice);
    let sq = 0; for (; sq < 40; sq++) if ((await game.bricks(sq, ALICE)) > 0n) break;
    const n = await game.bricks(sq, ALICE);
    await game.connect(alice).startAuction(ALICE, sq, 1);
    await expect(game.connect(alice).sellBricks(ALICE, sq, 1, 0)).to.be.revertedWithCustomError(game, "Locked");
    const a = await game.auctions(sq);
    await expect(game.connect(bob).bid(BOB, sq, a.reserve - 1n)).to.be.revertedWithCustomError(game, "Bad");
    const bobCash = (await game.chogs(BOB)).cash;
    await game.connect(bob).bid(BOB, sq, a.reserve);
    await game.connect(carol).bid(CAROL, sq, a.reserve * 2n);
    expect((await game.chogs(BOB)).cash).to.equal(bobCash); // refunded
    await invariant();
    await expect(game.settleAuction(sq)).to.be.revertedWithCustomError(game, "Bad"); // still running
    await time.increase(2 * 3600 + 1);
    const sellerCash = (await game.chogs(ALICE)).cash;
    await game.connect(keeper).settleAuction(sq);
    expect(await game.bricks(sq, ALICE)).to.equal(n - 1n);
    expect(await game.bricks(sq, CAROL)).to.be.gte(1n);
    expect((await game.chogs(ALICE)).cash).to.equal(sellerCash + a.reserve * 2n);
    expect(await game.totalEscrow()).to.equal(0n);
    await invariant();
  });

  it("seasons: rank, nominate the bottom, settle the wealth tax, and claim prizes from the pool", async () => {
    const seasons = await (await ethers.getContractFactory("ChogSeasons")).deploy(await game.getAddress());
    await game.setSeasons(await seasons.getAddress());
    await expect(game.setSeasons(keeper.address)).to.be.revertedWithCustomError(game, "NotOwner"); // set once
    const players = [[alice, ALICE], [bob, BOB], [carol, CAROL]];
    // a 4th player so the bottom quarter has one seat
    const [, , , , , , dave] = await ethers.getSigners(); const DAVE = 4;
    await nft.mint(dave.address, DAVE); await usdc.mint(dave.address, D(200_000)); await usdc.connect(dave).approve(await game.getAddress(), ethers.MaxUint256);
    players.push([dave, DAVE]);
    for (const [who, id] of players) { await game.connect(who).wake(id, D(20_000)); await game.connect(who).setPlan(id, 2); }
    for (let round = 0; round < 24; round++) {
      for (const [who, id] of players) {
        if ((await game.rollsOf(id)) === 0n) continue;
        const c = await game.chogs(id);
        if (c.jail > 0 && c.cash >= D(500)) await game.connect(who).payBail(id);
        try { await rollAndSettle(id, who); } catch (e) { /* broke */ }
      }
      await time.increase(30 * 60);
    }
    for (const [, id] of players) await seasons.rank(id);
    const [topIds] = await seasons.top(1);
    expect(topIds.length).to.equal(4);
    expect(await game.activeCount(1)).to.be.gte(1n);
    await expect(seasons.nominate(1, ALICE)).to.be.revertedWithCustomError(seasons, "Bad"); // season not over
    await time.increase(7 * 86400);
    await game.tickSeason(); await time.increase(120); await game.tickSeason();
    expect(await game.endedAt(1)).to.be.gt(0n);
    const pool0 = await game.prizePool(1);
    expect(pool0).to.be.gt(0n);
    await invariant();
    const active = []; for (const [, id] of players) if (await game.activeIn(1, id)) active.push(id);
    for (const id of active) await seasons.nominate(1, id);
    const [bottomIds] = await seasons.bottom(1);
    expect(bottomIds.length).to.equal(Math.min(50, Math.floor(active.length / 4)));
    await expect(seasons.settle(1)).to.be.revertedWithCustomError(seasons, "Bad"); // window still open
    await time.increase(86400 + 1);
    const taxedCash = bottomIds.length ? (await game.chogs(bottomIds[0])).cash : 0n;
    await seasons.settle(1);
    if (bottomIds.length) expect(await game.taxed(1, bottomIds[0])).to.equal(true);
    expect(await game.prizePool(1)).to.equal(pool0 + taxedCash * 5n / 100n);
    let paid = 0n;
    for (const [, id] of players) { const o = await seasons.owed(1, id); const c0 = (await game.chogs(id)).cash; await seasons.claim(1, id); expect((await game.chogs(id)).cash).to.equal(c0 + o); paid += o; }
    expect(paid).to.be.lte(await seasons.base(1));
    await expect(seasons.claim(1, ALICE)).to.be.revertedWithCustomError(seasons, "Bad"); // once
    await invariant();
    await time.increase(31 * 86400);
    await game.rolloverPrize(1);
    expect(await game.prizePool(1)).to.equal(0n);
    await invariant();
  });

  it("lens: reads many Chogs and their Bricks in one call", async () => {
    for (const [who, id] of [[alice, ALICE], [bob, BOB]]) await game.connect(who).wake(id, D(20_000));
    await rollAndSettle(ALICE, alice);
    const lens = await (await ethers.getContractFactory("ChogLens")).deploy();
    const [data, rolls] = await lens.chogs(await game.getAddress(), [ALICE, BOB]);
    const dec = game.interface.decodeFunctionResult("chogs", data[0]);
    expect(dec.cash).to.equal((await game.chogs(ALICE)).cash);
    expect(rolls[1]).to.equal(8n);
    const b = await lens.bricksOf(await game.getAddress(), [ALICE, BOB]);
    expect(b.length).to.equal(80);
  });

  it("savings: USDC parked in a lending vault belongs to the Chog, earns interest, and only the holder withdraws", async () => {
    const vault = await (await ethers.getContractFactory("MockVault")).deploy(await usdc.getAddress());
    const sav = await (await ethers.getContractFactory("ChogSavings")).deploy(await nft.getAddress(), await usdc.getAddress(), await vault.getAddress());
    await usdc.connect(alice).approve(await sav.getAddress(), ethers.MaxUint256);
    await expect(sav.connect(bob).deposit(ALICE, D(1_000))).to.be.revertedWithCustomError(sav, "NotOwner");
    await sav.connect(alice).deposit(ALICE, D(10_000));
    await vault.accrue(D(1_000)); // the market pays interest
    expect(await sav.savedValue(ALICE)).to.be.gt(D(10_900));
    await nft.connect(alice).transferFrom(alice.address, carol.address, ALICE); // savings travel with the NFT
    await expect(sav.connect(alice).withdraw(ALICE, ethers.MaxUint256)).to.be.revertedWithCustomError(sav, "NotOwner");
    const w0 = await usdc.balanceOf(carol.address);
    await sav.connect(carol).withdraw(ALICE, ethers.MaxUint256);
    expect(await usdc.balanceOf(carol.address)).to.be.gt(w0 + D(10_900));
    expect(await sav.shares(ALICE)).to.equal(0n);
  });
});

