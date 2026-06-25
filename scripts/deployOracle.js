const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";

  const ReputationOracle = await hre.ethers.getContractFactory("ReputationOracle");
  const oracle = await ReputationOracle.deploy(AGENT_IDENTITY_ADDRESS);
  await oracle.waitForDeployment();
  const address = await oracle.getAddress();
  console.log("ReputationOracle deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
