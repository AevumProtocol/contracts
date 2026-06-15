require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/8T2fc5U66x3BLNv7oDjR5",
      accounts: ["REDACTED_PRIVATE_KEY"],
    },
  },
  etherscan: {
    apiKey: "3FTNB5PNSSU84I95T152YIRPFR66FN4A98",
  },
};
