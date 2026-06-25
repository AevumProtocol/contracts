const hre = require("hardhat");

async function main() {
  const AEV_TOKEN_ADDRESS = "0x1C47FE8AE5531008Ec57fC60C7498Ebf2c2Ac920";

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
