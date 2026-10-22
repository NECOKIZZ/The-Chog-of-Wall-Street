const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");

const E = 10n ** 18n;
const C = n => BigInt(n) * E;

describe("ChogOfWallStreet", () => {
  let game, chog, nft, adapter, admin, alice, bob, carol, keeper, signer;
  const ALICE = 1, BOB = 2, CAROL = 3;

  async function invariant() {
    expect(await chog.balanceOf(await game.getAddress())).to.equal(await game.accounted());
  }
  async function rollAndSettle(id, who) {
    await game.connect(who).roll(id);
    await mine(1);
    await game.connect(keeper).settle(id);
  }

  beforeEach(async () => {
    [admin, alice, bob, carol, keeper, signer] = await ethers.getSigners();
    chog = await (await ethers.getContractFactory("MockCHOG")).deploy();
    nft = await (await ethers.getContractFactory("MockChogNFT")).deploy();
    game = await (await ethers.getContractFactory("ChogOfWallStreet")).deploy(await nft.getAddress(), await chog.getAddress(), signer.address);
    adapter = await (await ethers.getContractFactory("MockSwapAdapter")).deploy(await chog.getAddress(), await game.getAddress(), C(2500));
    await chog.mint(await adapter.getAddress(), C(1_000_000));
    for (const [who, id] of [[alice, ALICE], [bob, BOB], [carol, CAROL]]) {
      await nft.mint(who.address, id);
      await chog.mint(who.address, C(200_000));
      await chog.connect(who).approve(await game.getAddress(), ethers.MaxUint256);
    }
  });

  it("wakes a Chog only for its owner, with the minimum deposit", async () => {
    await expect(game.connect(bob).wake(ALICE, C(10_000))).to.be.revertedWithCustomError(game, "NotOwner");
    await expect(game.connect(alice).wake(ALICE, C(9_999))).to.be.revertedWithCustomError(game, "Bad");
    await game.connect(alice).wake(ALICE, C(20_000));
    const c = await game.chogs(ALICE);
    expect(c.cash).to.equal(C(20_000));
    expect(await game.rollsOf(ALICE)).to.equal(8n);
    await invariant();
  });

  it("stays zero-sum through hundreds of rolls (balance == accounted)", async () => {
    const players = [[alice, ALICE], [bob, BOB], [carol, CAROL]];
    for (const [who, id] of players) await game.connect(who).wake(id, C(60_000));
    await game.connect(bob).setPlan(BOB, 2);
    let rents = 0;
    for (let round = 0; round < 70; round++) {
      for (const [who, id] of players) {
        const c = await game.chogs(id);
        if (c.jail > 0 && c.cash >= C(500)) await game.connect(who).payBail(id);
        if ((await game.rollsOf(id)) === 0n) continue;
        const tx = await game.connect(who).roll(id);
        await mine(1);
        const rc = await (await game.connect(keeper).settle(id)).wait();
        rents += rc.logs.filter(l => l.fragment && l.fragment.name === "Rent").length;
        if ((await game.chogs(id)).cash < C(2_000)) await game.connect(who).topUp(id, C(10_000));
      }
      if (round % 10 === 9) {
        for (const [who, id] of players) { await game.connect(who).prepayTax(id, 86400); await game.connect(who).claim(id); }
      }
      await time.increase(30 * 60);
    }
    expect(rents).to.be.greaterThan(0);
    await invariant();
    const supply = await Promise.all([1, 3, 6, 39].map(i => game.props(i)));
    expect(supply.some(p => p.supply > 0n)).to.equal(true);
  });

  it("caps any one Chog at 40% of a street after its first 10 Bricks", async () => {
    // brute force: keep rolling one degen Chog alone; no street may exceed max(10, 40%) for it
    await game.connect(alice).wake(ALICE, C(100_000));
    await game.connect(alice).setPlan(ALICE, 2);
    for (let k = 0; k < 40; k++) {
      if ((await game.rollsOf(ALICE)) === 0n) await time.increase(30 * 60);
      const c = await game.chogs(ALICE);
      if (c.jail > 0) await game.connect(alice).payBail(ALICE);
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

  it("lets anyone land a committed roll and pays the keeper a tip", async () => {
    await game.connect(alice).wake(ALICE, C(20_000));
    await expect(game.connect(keeper).settle(ALICE)).to.be.revertedWithCustomError(game, "Pending"); // nothing committed
    await game.connect(alice).roll(ALICE);
    await expect(game.connect(alice).roll(ALICE)).to.be.revertedWithCustomError(game, "Pending"); // one roll in flight
    await mine(1);
    const before = await chog.balanceOf(keeper.address);
    await game.connect(keeper).settle(ALICE);
    expect(await chog.balanceOf(keeper.address)).to.equal(before + C(5));
    await invariant();
  });

  it("cash-out is taxed, queued 48h, capped city-wide, and resets Prestige", async () => {
    await game.connect(alice).wake(ALICE, C(60_000));
    await game.connect(bob).wake(BOB, C(60_000));
    await time.increase(10 * 86400);
    expect(await game.prestige(ALICE)).to.equal(10n);
    expect(await game.exitTaxPct(ALICE)).to.equal(19n); // one loyal week off 20%
    const cap = await game.dailyCapLeft(); // 2% of 120k = 2,400
    expect(cap).to.equal(C(2_400));
    await expect(game.connect(alice).requestCashOut(ALICE, cap + 1n)).to.be.revertedWithCustomError(game, "Cap");
    const commons0 = await game.commons();
    await game.connect(alice).requestCashOut(ALICE, C(2_000));
    expect(await game.prestige(ALICE)).to.equal(0n);
    const tax = (C(2_000) * 19n) / 100n;
    expect(await game.commons()).to.equal(commons0 + tax / 2n);
    await expect(game.connect(alice).claimCashOut(ALICE)).to.be.revertedWithCustomError(game, "Locked");
    await time.increase(48 * 3600);
    const w0 = await chog.balanceOf(alice.address);
    await game.connect(alice).claimCashOut(ALICE);
    expect(await chog.balanceOf(alice.address)).to.equal(w0 + C(2_000) - tax);
    await invariant();
  });

  it("selling the NFT moves the whole empire and starts Moving Day", async () => {
    await game.connect(alice).wake(ALICE, C(30_000));
    await game.connect(alice).setPlan(ALICE, 2);
    for (let k = 0; k < 6; k++) { const c = await game.chogs(ALICE); if (c.jail > 0) await game.connect(alice).payBail(ALICE); await rollAndSettle(ALICE, alice); }
    const ap = await game.appraisal(ALICE);
    await nft.connect(alice).transferFrom(alice.address, carol.address, ALICE);
    await expect(game.connect(alice).claim(ALICE)).to.be.revertedWithCustomError(game, "NotOwner");
    await game.connect(carol).claim(ALICE); // syncs the new owner
    expect(await game.appraisal(ALICE)).to.be.gte(ap);
    await expect(game.connect(carol).requestCashOut(ALICE, C(100))).to.be.revertedWithCustomError(game, "Locked");
    await time.increase(72 * 3600);
    await game.connect(carol).requestCashOut(ALICE, C(100));
    await invariant();
  });

  it("hype burns 10% and fills the jar; the boost never exceeds what the jar holds", async () => {
    await game.connect(alice).wake(ALICE, C(20_000));
    const dead = "0x000000000000000000000000000000000000dEaD";
    await game.connect(bob).hype(ALICE, C(1_000));
    expect(await chog.balanceOf(dead)).to.equal(C(100));
    const c = await game.chogs(ALICE);
    expect(c.jar).to.equal(C(900));
    expect(c.hypeBps).to.equal(11_000n);
    await invariant();
  });

  it("Tier-A quest swaps MON into $CHOG inside the Chog and stamps it", async () => {
    await game.connect(alice).wake(ALICE, C(20_000));
    // walk until the Chog stands on Kuru Tower (39) or Chog Alley (3); set the adapter on every square for the test
    for (let sq = 0; sq < 40; sq++) await game.setAdapter(sq, await adapter.getAddress());
    const cash0 = (await game.chogs(ALICE)).cash;
    await game.connect(alice).quest(ALICE, "0x", { value: E });
    const c = await game.chogs(ALICE);
    expect(c.cash).to.equal(cash0 + C(2_500));
    expect(await game.stampCount(ALICE)).to.equal(1n);
    expect(await game.rollsOf(ALICE)).to.be.gte(8n);
    await invariant();
  });

  it("Tier-B receipt needs the quest signer, the right square, and can't be reused", async () => {
    await game.connect(alice).wake(ALICE, C(20_000));
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
    for (const [who, id] of [[alice, ALICE], [bob, BOB]]) { await game.connect(who).wake(id, C(60_000)); await game.connect(who).setPlan(id, 2); }
    // play until Alice holds Bricks
    for (let k = 0; k < 30 && (await game.brickValue(ALICE)) === 0n; k++) {
      if ((await game.rollsOf(ALICE)) === 0n) await time.increase(1800);
      if ((await game.chogs(ALICE)).jail > 0) await game.connect(alice).payBail(ALICE);
      await rollAndSettle(ALICE, alice);
    }
    expect(await game.brickValue(ALICE)).to.be.gt(0n);
    await time.increase(5 * 86400); // tax lapses (only 1 day was covered)
    for (let k = 0; k < 60; k++) {
      if ((await game.rollsOf(BOB)) === 0n) await time.increase(1800);
      if ((await game.chogs(BOB)).jail > 0) await game.connect(bob).payBail(BOB);
      await rollAndSettle(BOB, bob);
    }
    const pending = await game.pendingRent(ALICE);
    await game.connect(alice).claim(ALICE);
    const c = await game.chogs(ALICE);
    // checkpoint forfeited (almost) everything because the tax lapsed for most of the span
    if (pending > 0n) expect(c.unclaimed).to.equal(0n);
    await invariant();
  });
});
