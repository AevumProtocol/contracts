const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0xDF24C30541B08cFd1E81c35CbBd7a90c9EE33EbE";

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
