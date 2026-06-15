const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0x713d435AE624Ab68650Ba21E9891477f2f5175d2";

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
