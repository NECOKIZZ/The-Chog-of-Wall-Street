// Monad mainnet (chain 143) addresses used by The Chog of Wall Street.
// Every address below was checked on-chain (code, symbol, wiring) and exercised in test/mainnet.fork.test.js.
module.exports = {
  chainId: 143,
  rpc: "https://rpc.monad.xyz",
  explorer: "https://monadvision.com",
  CHOG: "0x350035555E10d9AfAF1566AaebfCeD5BA6C27777", // $CHOG, 18 decimals, ~1B supply (launched on nad.fun)
  CHOG_GENESIS: "0xc96d31f8626c6d03fae5dcd3d61e3fb9f4a73763", // Chog Genesis ERC-721, ids 1-1969
  WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
  USDC: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603", // 6 decimals
  NADFUN_DEX_ROUTER: "0x0B79d71AE99528D1dB24A4148b5f4F865cc2b137", // buy({amountOutMin, token, to, deadline}) payable
  NADFUN_LENS: "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea", // getAmountOut(token, amountIn, isBuy)
  NADFUN_CHOG_POOL: "0x116e7d070f1888b81e1e0324f56d6746b2d7d8f1", // CHOG/WMON 1%, main $CHOG liquidity
  UNI_SWAP_ROUTER02: "0xfe31f71c1b106eac32f1a19239c9a9a72ddfb900",
  UNI_QUOTER_V2: "0x661e93cca42afacb172121ef892830ca3b70f08d",
  UNI_WMON_USDC_FEE: 3000, // pool 0x659bD0BC4167BA25c62E05656F78043E7eD4a9da (deepest)
  // Not wired (verified on a fork): Kuru v1 order books have no bids (MarketStateError); Kuru Flow needs its off-chain quote API.
  shMON: "0x1B68626dCa36c7fE922fD2d55E4f631d962dE19c", // FastLane, ERC-4626 native deposit(uint256,address)
  gMON: "0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081", // Magma. Not wired: deposit() and deposit(uint256,address) revert on mainnet
  aprMON: "0x0c65A0BC65a5D819235B71F554D210D3F80E0852", // aPriori, ERC-4626 native deposit(uint256,address)
  sMON: "0xA3227C5969757783154C60bF0bC1944180ed81B9", // Kintsu, deposit(uint96 minShares, address receiver) payable
};
