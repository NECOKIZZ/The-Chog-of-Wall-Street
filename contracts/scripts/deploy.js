// Deploy The Chog of Wall Street.
//   Testnet demo (default): test USDC (the game money), test $CHOG (utility), test Chog Genesis, a stand-in quest adapter
//   (MON → test USDC) on the six app squares and a stand-in buyback (test USDC → burned test $CHOG). Mints demo Chogs
//   #1-#5 to the deployer, then smoke-tests wake → roll → settle on-chain.
//   REUSE=1 keeps the test $CHOG and Chog NFT from deployments/<network>.json (so existing test Chogs keep working).
//
//   DEPLOYER_KEY=0x... [REUSE=1] npx hardhat run scripts/deploy.js --network monadTestnet
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const E = 10n ** 18n;
const USD = n => BigInt(n) * 1_000_000n;

async function main() {
  const [me] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(me.address);
  console.log(`network ${network.name} · deployer ${me.address} · balance ${ethers.formatEther(bal)} MON`);
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const prev = process.env.REUSE && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  const out = { network: network.name, chainId: Number((await ethers.provider.getNetwork()).chainId), deployer: me.address, deployedAt: new Date().toISOString(), mocks: true };
  const wait = async tx => (await tx).wait();
  const F = n => ethers.getContractFactory(n);

  const chog = prev.chogToken ? await ethers.getContractAt("MockCHOG", prev.chogToken) : await (await F("MockCHOG")).deploy();
  const chogNft = prev.chogNft ? await ethers.getContractAt("MockChogNFT", prev.chogNft) : await (await F("MockChogNFT")).deploy();
  const usdc = await (await F("MockUSDC")).deploy();
  for (const c of [chog, chogNft, usdc]) await c.waitForDeployment();
  out.cashToken = await usdc.getAddress(); out.chogToken = await chog.getAddress(); out.chogNft = await chogNft.getAddress(); out.questSigner = me.address;
  console.log("MockUSDC        ", out.cashToken, "\nMockCHOG        ", out.chogToken, prev.chogToken ? "(reused)" : "", "\nMockChogNFT     ", out.chogNft, prev.chogNft ? "(reused)" : "");

  const game = await (await F("ChogOfWallStreet")).deploy(out.chogNft, out.cashToken, out.chogToken, me.address);
  await game.waitForDeployment();
  const gameAddr = out.game = await game.getAddress();
  console.log("ChogOfWallStreet", gameAddr);

  const a = await (await F("MockSwapAdapter")).deploy(out.cashToken, gameAddr, 500_000n); // 0.50 test USDC per MON
  const bb = await (await F("MockBuyback")).deploy(out.cashToken, out.chogToken, gameAddr, 750n * 10n ** 12n); // ~750 $CHOG per USDC
  await a.waitForDeployment(); await bb.waitForDeployment();
  out.swapAdapter = await a.getAddress(); out.buybackAdapter = await bb.getAddress();
  console.log("MockSwapAdapter ", out.swapAdapter, "\nMockBuyback     ", out.buybackAdapter);
  await wait(usdc.mint(out.swapAdapter, USD(1_000_000))); // inventory the quest adapter pays from
  for (const sq of [1, 3, 5, 25, 35, 37]) await wait(game.setAdapter(sq, out.swapAdapter)); // the six app squares
  await wait(game.setBuybackAdapter(out.buybackAdapter));

  // demo assets for the deployer
  await wait(usdc.mint(me.address, USD(1_000)));
  await wait(chog.mint(me.address, 1_000_000n * E));
  for (const id of [1, 2, 3, 4, 5]) { try { await chogNft.ownerOf(id); } catch (e) { await wait(chogNft.mint(me.address, id)); } }
  await wait(usdc.approve(gameAddr, ethers.MaxUint256));
  await wait(chog.approve(gameAddr, ethers.MaxUint256));

  // smoke test: wake #1 with $20, commit a roll, land it from a later block
  await wait(game.wake(1, USD(20)));
  await wait(game.roll(1));
  let landed;
  for (let k = 0; k < 20 && !landed; k++) {
    try { landed = await wait(game.settle(1)); } catch (e) { await new Promise(r => setTimeout(r, 800)); }
  }
  const c = await game.chogs(1);
  const held = await usdc.balanceOf(gameAddr), acc = await game.accounted();
  out.smoke = { woke: c.awake, pos: Number(c.pos), cash: Number(c.cash) / 1e6, settleTx: landed?.hash ?? null, zeroSum: held === acc };
  console.log("smoke", out.smoke);

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log(`saved deployments/${network.name}.json`);
}
main().catch(e => { console.error(e); process.exit(1); });
