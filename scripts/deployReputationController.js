const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0xc9Ae911e21ABaEa8935a1aad9338A34D9AC6447E";
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
