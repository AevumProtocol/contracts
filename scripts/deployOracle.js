const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0xC3128B98b5abB0789aF6283A01244Cf05DcEDB87";

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
