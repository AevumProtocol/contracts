const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0xeF1D3A6Eb15E149aee74d26D2753a0a78dafa10A";

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
