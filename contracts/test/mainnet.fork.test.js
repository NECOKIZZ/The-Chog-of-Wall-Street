// Runs every real mainnet adapter against a fork of Monad mainnet. Opt-in: FORK=1 npx hardhat test test/mainnet.fork.test.js
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const M = require("../config/monad-mainnet");

const E = 10n ** 18n;
const run = process.env.FORK ? describe : describe.skip;

const USD = n => BigInt(Math.round(n * 1e6)); // USDC base units
const USDC_WHALE = "0x659bD0BC4167BA25c62E05656F78043E7eD4a9da"; // the WMON/USDC Uniswap v3 pool (fork only)
const DEAD = "0x000000000000000000000000000000000000dEaD";

run("Mainnet fork: real USDC, real $CHOG, real Chog Genesis, real dapps", function () {
  this.timeout(600_000);
  let game, chog, usdc, nft, owner, ownerAddr, admin;
  const TOKEN = 1n;

  before(async () => {
    const bn = await new ethers.JsonRpcProvider(M.rpc).getBlockNumber();
    await network.provider.request({ method: "hardhat_reset", params: [{ forking: { jsonRpcUrl: M.rpc, blockNumber: bn - 3 } }] });
    await network.provider.send("hardhat_mine", ["0x1"]); // calls run on a local block, not the remote fork block
    [admin] = await ethers.getSigners();
    chog = await ethers.getContractAt("IERC20", M.CHOG);
    nft = await ethers.getContractAt("IERC721", M.CHOG_GENESIS);
    ownerAddr = await nft.ownerOf(TOKEN);
    await network.provider.request({ method: "hardhat_impersonateAccount", params: [ownerAddr] });
    await network.provider.request({ method: "hardhat_setBalance", params: [ownerAddr, "0x" + (1000n * E).toString(16)] });
    owner = await ethers.getSigner(ownerAddr);
    // give the real Chog owner real $CHOG and real USDC from pool balances (fork only)
    for (const [who, token, amt] of [[M.NADFUN_CHOG_POOL, M.CHOG, 100_000n * E], [USDC_WHALE, M.USDC, USD(100)]]) {
      await network.provider.request({ method: "hardhat_impersonateAccount", params: [who] });
      await network.provider.request({ method: "hardhat_setBalance", params: [who, "0x" + (10n * E).toString(16)] });
      await (await ethers.getContractAt("IERC20", token)).connect(await ethers.getSigner(who)).transfer(ownerAddr, amt);
    }
    usdc = await ethers.getContractAt("IERC20", M.USDC);

    game = await (await ethers.getContractFactory("ChogOfWallStreet")).deploy(M.CHOG_GENESIS, M.USDC, M.CHOG);
    await usdc.connect(owner).approve(await game.getAddress(), ethers.MaxUint256);
    await chog.connect(owner).approve(await game.getAddress(), ethers.MaxUint256);
    await game.connect(owner).wake(TOKEN, USD(20));
  });

  async function adapterAtSquare0(name, ...args) {
    const a = await (await ethers.getContractFactory(name)).deploy(await game.getAddress(), M.CHOG_GENESIS, ...args);
    await game.setAdapter((await game.chogs(TOKEN)).pos, await a.getAddress());
    return a;
  }

  const balanced = async () => expect(await usdc.balanceOf(await game.getAddress())).to.equal(await game.accounted());

  it("wakes a real Chog Genesis NFT with $20 of real USDC", async () => {
    expect((await game.chogs(TOKEN)).cash).to.equal(USD(20));
    await balanced();
  });

  it("$CHOG utility: an extra roll burns 100 real $CHOG", async () => {
    const d0 = await chog.balanceOf(DEAD);
    await game.connect(owner).buyExtraRoll(TOKEN);
    expect(await chog.balanceOf(DEAD)).to.equal(d0 + 100n * E);
  });

  it("nad.fun: buys real $CHOG with MON and holds it for the Chog (quoted by nad.fun Lens)", async () => {
    const lens = new ethers.Contract(M.NADFUN_LENS, ["function getAmountOut(address,uint256,bool) view returns (address,uint256)"], admin);
    const [router, quote] = await lens.getAmountOut(M.CHOG, E, true);
    expect(router.toLowerCase()).to.equal(M.NADFUN_DEX_ROUTER.toLowerCase());
    const a = await adapterAtSquare0("NadFunChogAdapter", M.NADFUN_DEX_ROUTER, M.CHOG);
    const minOut = (quote * 97n) / 100n;
    await game.connect(owner).quest(TOKEN, ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [minOut]), { value: E });
    const got = await a.held(TOKEN, M.CHOG);
    console.log("      1 MON →", ethers.formatEther(got), "$CHOG held for the Chog (quote", ethers.formatEther(quote), ")");
    expect(got).to.be.gte(minOut);
    expect((await game.chogs(TOKEN)).stamps).to.not.equal(0n);
    await balanced();
  });

  it("Uniswap: swaps MON → USDC on Uniswap v3 straight into the Chog's cash", async () => {
    await adapterAtSquare0("UniswapUsdcAdapter", M.UNI_SWAP_ROUTER02, M.WMON, M.USDC, M.UNI_WMON_USDC_FEE);
    const cash0 = (await game.chogs(TOKEN)).cash;
    await game.connect(owner).quest(TOKEN, "0x", { value: 50n * E });
    const got = (await game.chogs(TOKEN)).cash - cash0;
    console.log("      50 MON →", Number(got) / 1e6, "USDC of cash");
    expect(got).to.be.gt(0n);
    await balanced();
  });

  it("buyback: fee USDC → WMON (Uniswap) → $CHOG (nad.fun) → burned", async () => {
    await game.connect(owner).requestCashOut(TOKEN, USD(0.4)); // a quarter of the exit tax goes to the buyback pot
    const pot = await game.buybackPot();
    expect(pot).to.be.gt(0n);
    const bb = await (await ethers.getContractFactory("ChogBuybackAdapter")).deploy(await game.getAddress(), M.UNI_SWAP_ROUTER02, M.NADFUN_DEX_ROUTER, M.USDC, M.WMON, M.CHOG, M.UNI_WMON_USDC_FEE);
    await game.setBuybackAdapter(await bb.getAddress());
    const d0 = await chog.balanceOf(DEAD);
    await game.buyback(1);
    const burnt = (await chog.balanceOf(DEAD)) - d0;
    console.log("     ", Number(pot) / 1e6, "USDC of fees → burned", ethers.formatEther(burnt), "$CHOG");
    expect(burnt).to.be.gt(0n);
    expect(await game.buybackPot()).to.equal(0n);
    await balanced();
  });

  it("Savings desk: parks real USDC in the Morpho vault (Hyperithm USDC Apex) for the Chog and withdraws it", async () => {
    const sav = await (await ethers.getContractFactory("ChogSavings")).deploy(M.CHOG_GENESIS, M.USDC, M.MORPHO_USDC_VAULT);
    await usdc.connect(owner).approve(await sav.getAddress(), ethers.MaxUint256);
    await sav.connect(owner).deposit(TOKEN, USD(10));
    const v = await sav.savedValue(TOKEN);
    console.log("      $10 saved → worth", Number(v) / 1e6, "USDC in Morpho");
    expect(v).to.be.gte(USD(9.99));
    const w0 = await usdc.balanceOf(ownerAddr);
    await sav.connect(owner).withdraw(TOKEN, ethers.MaxUint256);
    expect((await usdc.balanceOf(ownerAddr)) - w0).to.be.gte(USD(9.99));
  });

  for (const [name, addr, kind] of [["shMON", M.shMON, 0], ["aprMON", M.aprMON, 0], ["sMON", M.sMON, 2]]) {
    it(`Station: stakes MON into ${name} and holds it for the Chog`, async () => {
      const a = await adapterAtSquare0("LstAdapter", addr, kind);
      await game.connect(owner).quest(TOKEN, "0x", { value: E });
      const h = await a.held(TOKEN, addr);
      console.log(`      1 MON → ${ethers.formatEther(h)} ${name}`);
      expect(h).to.be.gt(0n);
    });
  }

  it("only the current Chog holder can withdraw a position, after 7 days", async () => {
    const a = await adapterAtSquare0("LstAdapter", M.shMON, 0);
    await game.connect(owner).quest(TOKEN, "0x", { value: E });
    await expect(a.connect(owner).withdraw(TOKEN, M.shMON)).to.be.revertedWithCustomError(a, "Locked");
    await expect(a.connect(admin).withdraw(TOKEN, M.shMON)).to.be.revertedWithCustomError(a, "NotOwner");
    await time.increase(7 * 86400 + 1);
    const lst = await ethers.getContractAt("IERC20", M.shMON);
    const b0 = await lst.balanceOf(ownerAddr);
    await a.connect(owner).withdraw(TOKEN, M.shMON);
    expect(await lst.balanceOf(ownerAddr)).to.be.gt(b0);
  });
});
