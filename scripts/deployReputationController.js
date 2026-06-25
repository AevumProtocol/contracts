const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";
  const [deployer] = await hre.ethers.getSigners();

  const ORACLE_1 = deployer.address;
  const ORACLE_2 = "0x000000000000000000000000000000000000dEaD";

  const ReputationController = await hre.ethers.getContractFactory("ReputationController");
  const controller = await ReputationController.deploy(
    AGENT_IDENTITY_ADDRESS,
    ORACLE_1,
    ORACLE_2
  );
  await controller.waitForDeployment();
  const address = await controller.getAddress();
  console.log("ReputationController deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
