const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0x713d435AE624Ab68650Ba21E9891477f2f5175d2";

  const ReputationController = await hre.ethers.getContractFactory("ReputationController");
  const controller = await ReputationController.deploy(AGENT_IDENTITY_ADDRESS);
  await controller.waitForDeployment();
  const address = await controller.getAddress();
  console.log("ReputationController deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
