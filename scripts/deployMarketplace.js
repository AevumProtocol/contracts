const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0x8CE1bb5a2f2fB6FD3ED285bd633A2bD7eB45263e";

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
