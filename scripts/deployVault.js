const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0x1d1afA835D5258EbDA86cf7f9c272AaCe8b77477";

  const AgentVault = await hre.ethers.getContractFactory("AgentVault");
  const vault = await AgentVault.deploy(ORACLE_ADDRESS);
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  console.log("AgentVault deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
