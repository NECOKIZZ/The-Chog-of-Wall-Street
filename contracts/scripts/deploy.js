// Deploy The Chog of Wall Street.
//   Testnet demo (default): deploys mock Chog Genesis + mock $CHOG + a mock Kuru-style swap adapter,
//   mints demo Chogs #1-#5 to the deployer, then smoke-tests wake → roll → settle on-chain.
//   Real assets: CHOG_NFT=0x... CHOG_TOKEN=0x... QUEST_SIGNER=0x... (skips mocks and the smoke test)
//
//   DEPLOYER_KEY=0x... npx hardhat run scripts/deploy.js --network monadTestnet
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const E = 10n ** 18n;

async function main() {
  const [me] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(me.address);
  console.log(`network ${network.name} · deployer ${me.address} · balance ${ethers.formatEther(bal)} MON`);
  const out = { network: network.name, chainId: Number((await ethers.provider.getNetwork()).chainId), deployer: me.address, deployedAt: new Date().toISOString() };
  const wait = async tx => (await tx).wait();

  let nft = process.env.CHOG_NFT, token = process.env.CHOG_TOKEN;
  const signer = process.env.QUEST_SIGNER || me.address;
  const mocks = !nft || !token;
  let chog, chogNft;
  if (mocks) {
    chog = await (await ethers.getContractFactory("MockCHOG")).deploy(); await chog.waitForDeployment();
    chogNft = await (await ethers.getContractFactory("MockChogNFT")).deploy(); await chogNft.waitForDeployment();
    token = await chog.getAddress(); nft = await chogNft.getAddress();
    console.log("MockCHOG        ", token); console.log("MockChogNFT     ", nft);
  }
  out.chogToken = token; out.chogNft = nft; out.questSigner = signer; out.mocks = mocks;

  const game = await (await ethers.getContractFactory("ChogOfWallStreet")).deploy(nft, token, signer);
  await game.waitForDeployment();
  const gameAddr = await game.getAddress();
  out.game = gameAddr;
  console.log("ChogOfWallStreet", gameAddr);

  if (mocks) {
    const a = await (await ethers.getContractFactory("MockSwapAdapter")).deploy(token, gameAddr, 2500n * E);
    await a.waitForDeployment();
    out.swapAdapter = await a.getAddress();
    console.log("MockSwapAdapter ", out.swapAdapter);
    await wait(chog.mint(out.swapAdapter, 10_000_000n * E)); // inventory the adapter pays quests from
    for (const sq of [1, 3, 37, 39]) await wait(game.setAdapter(sq, out.swapAdapter)); // nad.fun Lane, Chog Alley, Uniswap, Kuru

    // demo assets for the deployer
    await wait(chog.mint(me.address, 1_000_000n * E));
    for (const id of [1, 2, 3, 4, 5]) await wait(chogNft.mint(me.address, id));
    await wait(chog.approve(gameAddr, ethers.MaxUint256));

    // smoke test: wake #1, commit a roll, land it from a later block
    await wait(game.wake(1, 20_000n * E));
    await wait(game.roll(1));
    let landed;
    for (let k = 0; k < 20 && !landed; k++) {
      try { landed = await wait(game.settle(1)); } catch (e) { await new Promise(r => setTimeout(r, 800)); }
    }
    const c = await game.chogs(1);
    const held = await chog.balanceOf(gameAddr), acc = await game.accounted();
    out.smoke = { woke: c.awake, pos: Number(c.pos), cash: ethers.formatEther(c.cash), settleTx: landed?.hash ?? null, zeroSum: held === acc };
    console.log("smoke", out.smoke);
  }

  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${network.name}.json`), JSON.stringify(out, null, 2) + "\n");
  console.log(`saved deployments/${network.name}.json`);
}
main().catch(e => { console.error(e); process.exit(1); });
