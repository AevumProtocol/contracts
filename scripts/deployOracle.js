const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0xCCA3C2e6a57d8B1FbDFEf66655d06184bF43C231";

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
