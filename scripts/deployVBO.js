const hre = require("hardhat");

async function main() {
  const AGENT_IDENTITY_ADDRESS = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";

  const VBO = await hre.ethers.getContractFactory("VerifiableBacktestOracle");
  const vbo = await VBO.deploy(AGENT_IDENTITY_ADDRESS);
  await vbo.waitForDeployment();
  const address = await vbo.getAddress();
  console.log("VerifiableBacktestOracle deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
