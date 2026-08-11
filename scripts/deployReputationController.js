const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";
  const ORACLE_1 = "0x7Ba97591b0D50D093c41aE2898f44b32d0A97769"; // deployer = oracle 1
  const ORACLE_2 = "0xb57dC33a8E2B54ed025C28ef2080648f35875a2E"; // old wallet = oracle 2

  const ReputationController = await hre.ethers.getContractFactory("ReputationController");
  const controller = await ReputationController.deploy(AGENT_IDENTITY, ORACLE_1, ORACLE_2);
  await controller.waitForDeployment();
  const address = await controller.getAddress();
  console.log("ReputationController deployed to:", address);
}

main().catch(console.error);
