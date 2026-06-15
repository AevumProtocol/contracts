const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const DEPLOYER = deployer.address;

  console.log("Deploying with:", DEPLOYER);

  const AEVToken = await hre.ethers.getContractFactory("AEVToken");
  const token = await AEVToken.deploy(
    DEPLOYER, // ecosystem
    DEPLOYER, // DAO treasury
    DEPLOYER, // community
    DEPLOYER, // team
    DEPLOYER, // liquidity
    DEPLOYER  // investors
  );
  await token.waitForDeployment();
  const address = await token.getAddress();
  console.log("AEVToken deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
