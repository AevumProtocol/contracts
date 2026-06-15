const hre = require("hardhat");

async function main() {
  const AEV_TOKEN_ADDRESS = "0x8EB57eeDa655d46A01d54F4359E392c9be1F7F2C";

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
