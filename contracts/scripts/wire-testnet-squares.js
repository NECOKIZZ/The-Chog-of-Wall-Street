// Testnet only: route the six branded squares through the mock swap adapter (the stations had none), and unhook square 39,
// which is a plain street on the current board. Usage: DEPLOYER_KEY=… npx hardhat run scripts/wire-testnet-squares.js --network monadTestnet
const hre = require("hardhat");
const d = require("../deployments/monadTestnet.json");
async function main() {
  if ((await hre.ethers.provider.getNetwork()).chainId !== 10143n) throw new Error("testnet only");
  const game = await hre.ethers.getContractAt(["function setAdapter(uint256,address)", "function adapterOf(uint256) view returns (address)"], d.game);
  const want = { 1: d.swapAdapter, 3: d.swapAdapter, 5: d.swapAdapter, 25: d.swapAdapter, 35: d.swapAdapter, 37: d.swapAdapter, 39: hre.ethers.ZeroAddress };
  for (const [sq, a] of Object.entries(want)) {
    if ((await game.adapterOf(sq)).toLowerCase() === a.toLowerCase()) { console.log(sq, "ok"); continue; }
    await (await game.setAdapter(sq, a)).wait(); console.log(sq, "→", a);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
