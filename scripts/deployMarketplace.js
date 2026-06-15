const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0x73e4B7CE13D679085ee74deb73539760A63dFFA7";

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
