// Deploy The Chog of Wall Street on Monad mainnet with REAL $CHOG, REAL Chog Genesis and real dapp adapters.
//   DEPLOYER_KEY=0x... npx hardhat run scripts/deploy-mainnet.js --network monad
// Dry run on a fork first:  FORK=1 npx hardhat run scripts/deploy-mainnet.js
const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");
const M = require("../config/monad-mainnet");

const E = 10n ** 18n;
const MAX_DEPOSIT = 250_000n * E; // guarded launch: a Chog can hold at most 250k $CHOG of deposits (raise later)
// square → adapter
const WIRING = [
  [1, "nad"], [3, "nad"],            // nad.fun Lane, Chog Alley: buy real $CHOG into the Chog
  [5, "shMON"], [25, "aprMON"], [35, "sMON"], // FastLane, aPriori, Kintsu stations
  [37, "uni"],                        // Uniswap Boardwalk: MON → USDC
];

async function main() {
  if (process.env.FORK) {
    const bn = await new ethers.JsonRpcProvider(M.rpc).getBlockNumber();
    await network.provider.request({ method: "hardhat_reset", params: [{ forking: { jsonRpcUrl: M.rpc, blockNumber: bn - 3 } }] });
    await network.provider.send("hardhat_mine", ["0x1"]);
  }
  const { chainId } = await ethers.provider.getNetwork();
  if (Number(chainId) !== 143 && !process.env.FORK) throw new Error(`refusing: chain ${chainId} is not Monad mainnet`);
  const [me] = await ethers.getSigners();
  console.log(`deployer ${me.address} · ${ethers.formatEther(await ethers.provider.getBalance(me.address))} MON${process.env.FORK ? " (fork)" : ""}`);
  const wait = async tx => (await tx).wait();

  const game = await (await ethers.getContractFactory("ChogOfWallStreet")).deploy(M.CHOG_GENESIS, M.CHOG, me.address);
  await game.waitForDeployment();
  const g = await game.getAddress();
  console.log("ChogOfWallStreet", g);
  const F = n => ethers.getContractFactory(n);
  const adapters = {
    nad: await (await F("NadFunChogAdapter")).deploy(g, M.CHOG_GENESIS, M.NADFUN_DEX_ROUTER, M.CHOG),
    shMON: await (await F("LstAdapter")).deploy(g, M.CHOG_GENESIS, M.shMON, 0),
    aprMON: await (await F("LstAdapter")).deploy(g, M.CHOG_GENESIS, M.aprMON, 0),
    sMON: await (await F("LstAdapter")).deploy(g, M.CHOG_GENESIS, M.sMON, 2),
    uni: await (await F("UniswapUsdcAdapter")).deploy(g, M.CHOG_GENESIS, M.UNI_SWAP_ROUTER02, M.WMON, M.USDC, M.UNI_WMON_USDC_FEE),
  };
  const out = { network: process.env.FORK ? "monad-fork" : "monad", chainId: 143, deployer: me.address, deployedAt: new Date().toISOString(), game: g, chogToken: M.CHOG, chogNft: M.CHOG_GENESIS, questSigner: me.address, maxDeposit: ethers.formatEther(MAX_DEPOSIT), adapters: {}, squares: {} };
  for (const [k, a] of Object.entries(adapters)) { await a.waitForDeployment(); out.adapters[k] = await a.getAddress(); console.log("adapter", k, out.adapters[k]); }
  for (const [sq, k] of WIRING) { await wait(game.setAdapter(sq, out.adapters[k])); out.squares[sq] = k; }
  await wait(game.setMaxDeposit(MAX_DEPOSIT));
  console.log("wired squares", out.squares, "maxDeposit", out.maxDeposit);

  const file = path.join(__dirname, "..", "deployments", `${out.network}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log("saved", path.relative(process.cwd(), file));
}
main().catch(e => { console.error(e); process.exit(1); });
