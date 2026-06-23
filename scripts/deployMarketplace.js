const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0xAC903E27b11355b31aB8966AE6ad3701F0331105";

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
