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
  networks: {
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_MAINNET_KEY,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      chainId: 1,
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/8T2fc5U66x3BLNv7oDjR5",
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: "3FTNB5PNSSU84I95T152YIRPFR66FN4A98",
  },
};
