const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0x9461631974af003Bf28F278970E0562c1B503caF";

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
