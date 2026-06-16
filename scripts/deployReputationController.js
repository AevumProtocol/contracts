const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0x713d435AE624Ab68650Ba21E9891477f2f5175d2";
  const [deployer] = await hre.ethers.getSigners();

  // On testnet we use deployer for both oracles
  // On mainnet these must be two distinct trusted addresses
  const ORACLE_1 = deployer.address;
  const ORACLE_2 = "0x000000000000000000000000000000000000dEaD"; // placeholder second oracle

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
