const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0x5A9c8e15eBc628F438c54213224b5Fd3552a9F92";

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
