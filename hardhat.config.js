require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/8T2fc5U66x3BLNv7oDjR5",
      accounts: ["0xe380971a27aafc78bb6b218d9d5283d58a7a6e1f70190ec4f6effa76754e5860"],
    },
  },
};
