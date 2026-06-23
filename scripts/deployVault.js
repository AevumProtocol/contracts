const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0x1288C40b12C40bAEc19e4E8982b96034b9091040";
  const DEFAULT_WITHDRAW_LIMIT = hre.ethers.parseEther("0.1");

  const AgentVault = await hre.ethers.getContractFactory("AgentVault");
  const vault = await AgentVault.deploy(ORACLE_ADDRESS, DEFAULT_WITHDRAW_LIMIT);
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  console.log("AgentVault deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
