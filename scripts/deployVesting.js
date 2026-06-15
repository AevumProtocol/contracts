const hre = require("hardhat");

async function main() {
  const AEV_TOKEN_ADDRESS = "0x7Bb412e4DEe3C89Ae50c143dc352eE801d429131";

  const TokenVesting = await hre.ethers.getContractFactory("TokenVesting");
  const vesting = await TokenVesting.deploy(AEV_TOKEN_ADDRESS);
  await vesting.waitForDeployment();
  const address = await vesting.getAddress();
  console.log("TokenVesting deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
