require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  remappings: [
    "base/=node_modules/@atlas-oracle/pull-oracle-consumer/src/base/",
    "libraries/=node_modules/@atlas-oracle/pull-oracle-consumer/src/libraries/",
    "interfaces/=node_modules/@atlas-oracle/pull-oracle-consumer/src/interfaces/",
    "constants/=node_modules/@atlas-oracle/pull-oracle-consumer/src/constants/",
  ],
  networks: {
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_MAINNET_KEY,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 1,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_SEPOLIA_KEY,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
