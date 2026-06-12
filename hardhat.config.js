require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/8T2fc5U66x3BLNv7oDjR5",
      accounts: ["REDACTED_PRIVATE_KEY"],
    },
  },
};
