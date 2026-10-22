require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 1 }, viaIR: true, evmVersion: "cancun" },
  },
  networks: {
    hardhat: {
      // lets tests fork Monad mainnet (chain 143) and testnet (10143)
      hardfork: "cancun",
      chains: {
        143: { hardforkHistory: { berlin: 0, london: 0, merge: 0, shanghai: 0, cancun: 0 } },
        10143: { hardforkHistory: { berlin: 0, london: 0, merge: 0, shanghai: 0, cancun: 0 } },
      },
    },
    monad: {
      url: process.env.MONAD_MAINNET_RPC_URL || "https://rpc.monad.xyz",
      chainId: 143,
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
    },
    monadTestnet: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      accounts: process.env.DEPLOYER_KEY ? [process.env.DEPLOYER_KEY] : [],
    },
  },
};
