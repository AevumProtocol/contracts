const hre = require("hardhat");

async function main() {
  const AEVToken = await hre.ethers.getContractFactory("AEVToken");
  const token = await AEVToken.deploy();
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log("AEVToken deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
