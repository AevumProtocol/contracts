const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0x62518F70F7c2C6884AF3DFf7686D501CCEa49135";
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
