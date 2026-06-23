const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0xc9Ae911e21ABaEa8935a1aad9338A34D9AC6447E";

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
