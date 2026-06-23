const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0x1288C40b12C40bAEc19e4E8982b96034b9091040";

  const AgentMarketplace = await hre.ethers.getContractFactory("AgentMarketplace");
  const marketplace = await AgentMarketplace.deploy(ORACLE_ADDRESS);
  await marketplace.waitForDeployment();
  const address = await marketplace.getAddress();
  console.log("AgentMarketplace deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
