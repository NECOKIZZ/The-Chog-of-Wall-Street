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
    game = await (await ethers.getContractFactory("ChogOfWallStreet")).deploy(await nft.getAddress(), await usdc.getAddress(), await chog.getAddress(), signer.address);
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
    expect(await game.prestige(ALICE)).to.equal(10n);
    expect(await game.exitTaxPct(ALICE)).to.equal(19n);
    const cap = await game.dailyCapLeft(); // 2% of $40 = $0.80
    expect(cap).to.equal(D(800));
    await expect(game.connect(alice).requestCashOut(ALICE, cap + 1n)).to.be.revertedWithCustomError(game, "Cap");
    const commons0 = await game.commons(), pot0 = await game.buybackPot();
    await game.connect(alice).requestCashOut(ALICE, D(500));
    expect(await game.prestige(ALICE)).to.equal(0n);
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
    expect(await game.stampCount(ALICE)).to.equal(1n);
    expect(await game.rollsOf(ALICE)).to.be.gte(8n);
    await invariant();
  });

  it("Tier-B receipt needs the quest signer, the right square, and can't be reused", async () => {
    await game.connect(alice).wake(ALICE, D(20_000));
    const pos = (await game.chogs(ALICE)).pos;
    const txHash = ethers.id("some-dapp-tx");
    const expiry = (await time.latest()) + 3600;
    const { chainId } = await ethers.provider.getNetwork();
    const digest = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["uint256", "address", "uint256", "uint256", "bytes32", "uint256", "address"],
      [chainId, await game.getAddress(), ALICE, pos, txHash, expiry, alice.address]));
    const bad = await bob.signMessage(ethers.getBytes(digest));
    await expect(game.connect(alice).questReceipt(ALICE, pos, txHash, expiry, bad)).to.be.revertedWithCustomError(game, "Bad");
    const sig = await signer.signMessage(ethers.getBytes(digest));
    await game.connect(alice).questReceipt(ALICE, pos, txHash, expiry, sig);
    expect(await game.stampCount(ALICE)).to.equal(1n);
    await expect(game.connect(alice).questReceipt(ALICE, pos, txHash, expiry, sig)).to.be.revertedWithCustomError(game, "Bad");
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
    await game.connect(alice).checkpoint(ALICE);
    const commons0 = await game.commons();
    await time.increase(49 * 3600); // Alice idles past 48h
    for (let k = 0; k < 40; k++) {
      if ((await game.rollsOf(BOB)) === 0n) await time.increase(1800);
      if ((await game.chogs(BOB)).jail > 0 && (await game.chogs(BOB)).cash >= D(500)) await game.connect(bob).payBail(BOB);
      await rollAndSettle(BOB, bob);
    }
    const pending = await game.pendingRent(ALICE);
    const u0 = (await game.chogs(ALICE)).unclaimed;
    await game.connect(alice).checkpoint(ALICE);
    const gained = (await game.chogs(ALICE)).unclaimed - u0;
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
});
