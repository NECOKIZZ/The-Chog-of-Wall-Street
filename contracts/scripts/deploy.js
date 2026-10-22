// Deploy ChogOfWallStreet. With no env vars it deploys mock Chog NFT + $CHOG + a mock Kuru adapter (testnet demo).
//   CHOG_NFT=0x...  CHOG_TOKEN=0x...  QUEST_SIGNER=0x...  npx hardhat run scripts/deploy.js --network monadTestnet
const { ethers } = require("hardhat");

async function main() {
  const [me] = await ethers.getSigners();
  let nft = process.env.CHOG_NFT, token = process.env.CHOG_TOKEN;
  const signer = process.env.QUEST_SIGNER || me.address;
  if (!nft || !token) {
    const t = await (await ethers.getContractFactory("MockCHOG")).deploy();
    const n = await (await ethers.getContractFactory("MockChogNFT")).deploy();
    token = await t.getAddress(); nft = await n.getAddress();
    console.log("MockCHOG", token, "MockChogNFT", nft);
  }
  const game = await (await ethers.getContractFactory("ChogOfWallStreet")).deploy(nft, token, signer);
  const gameAddr = await game.getAddress();
  console.log("ChogOfWallStreet", gameAddr);
  if (!process.env.CHOG_NFT) {
    const a = await (await ethers.getContractFactory("MockSwapAdapter")).deploy(token, gameAddr, ethers.parseEther("2500"));
    for (const sq of [1, 3, 37, 39]) await game.setAdapter(sq, await a.getAddress()); // nad.fun Lane, Chog Alley, Uniswap, Kuru
    console.log("MockSwapAdapter", await a.getAddress());
  }
}
main().catch(e => { console.error(e); process.exit(1); });
