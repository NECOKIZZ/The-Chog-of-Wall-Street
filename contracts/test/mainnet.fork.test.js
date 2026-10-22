// Runs every real mainnet adapter against a fork of Monad mainnet. Opt-in: FORK=1 npx hardhat test test/mainnet.fork.test.js
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const M = require("../config/monad-mainnet");

const E = 10n ** 18n;
const run = process.env.FORK ? describe : describe.skip;

run("Mainnet fork: real $CHOG, real Chog Genesis, real dapps", function () {
  this.timeout(600_000);
  let game, chog, nft, owner, ownerAddr, admin;
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
    // give the real Chog owner some real $CHOG from the nad.fun pool's balance (fork only)
    await network.provider.request({ method: "hardhat_impersonateAccount", params: [M.NADFUN_CHOG_POOL] });
    await network.provider.request({ method: "hardhat_setBalance", params: [M.NADFUN_CHOG_POOL, "0x" + (10n * E).toString(16)] });
    await chog.connect(await ethers.getSigner(M.NADFUN_CHOG_POOL)).transfer(ownerAddr, 100_000n * E);

    game = await (await ethers.getContractFactory("ChogOfWallStreet")).deploy(M.CHOG_GENESIS, M.CHOG, admin.address);
    await chog.connect(owner).approve(await game.getAddress(), ethers.MaxUint256);
    await game.connect(owner).wake(TOKEN, 20_000n * E);
  });

  async function adapterAtSquare0(name, ...args) {
    const a = await (await ethers.getContractFactory(name)).deploy(await game.getAddress(), M.CHOG_GENESIS, ...args);
    await game.setAdapter((await game.chogs(TOKEN)).pos, await a.getAddress());
    return a;
  }

  it("wakes a real Chog Genesis NFT with real $CHOG", async () => {
    expect((await game.chogs(TOKEN)).cash).to.equal(20_000n * E);
    expect(await chog.balanceOf(await game.getAddress())).to.equal(await game.accounted());
  });

  it("nad.fun: buys real $CHOG with MON into the Chog's cash (quoted by nad.fun Lens)", async () => {
    const lens = new ethers.Contract(M.NADFUN_LENS, ["function getAmountOut(address,uint256,bool) view returns (address,uint256)"], admin);
    const [router, quote] = await lens.getAmountOut(M.CHOG, E, true);
    expect(router.toLowerCase()).to.equal(M.NADFUN_DEX_ROUTER.toLowerCase());
    await adapterAtSquare0("NadFunChogAdapter", M.NADFUN_DEX_ROUTER, M.CHOG);
    const minOut = (quote * 97n) / 100n;
    const cash0 = (await game.chogs(TOKEN)).cash;
    await game.connect(owner).quest(TOKEN, ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [minOut]), { value: E });
    const got = (await game.chogs(TOKEN)).cash - cash0;
    console.log("      1 MON →", ethers.formatEther(got), "$CHOG (quote", ethers.formatEther(quote), ")");
    expect(got).to.be.gte(minOut);
    expect(await game.stampCount(TOKEN)).to.equal(1n);
    expect(await chog.balanceOf(await game.getAddress())).to.equal(await game.accounted());
  });

  it("Uniswap: swaps MON → USDC on Uniswap v3 and holds it for the Chog", async () => {
    const a = await adapterAtSquare0("UniswapUsdcAdapter", M.UNI_SWAP_ROUTER02, M.WMON, M.USDC, M.UNI_WMON_USDC_FEE);
    await game.connect(owner).quest(TOKEN, "0x", { value: 50n * E });
    const h = await a.held(TOKEN, M.USDC);
    console.log("      50 MON →", Number(h) / 1e6, "USDC");
    expect(h).to.be.gt(0n);
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
