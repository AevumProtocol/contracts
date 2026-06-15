const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0x8CE1bb5a2f2fB6FD3ED285bd633A2bD7eB45263e";
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
