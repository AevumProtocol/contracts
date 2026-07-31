const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0xAda16c3ca238BE164E716F280D3D184269e4A0A9";
  const AGENT_IDENTITY_ADDRESS = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";
  const DEFAULT_WITHDRAW_LIMIT = hre.ethers.parseEther("0.1");

  const AgentVault = await hre.ethers.getContractFactory("AgentVault");
  const vault = await AgentVault.deploy(ORACLE_ADDRESS, DEFAULT_WITHDRAW_LIMIT, AGENT_IDENTITY_ADDRESS);
  await vault.waitForDeployment();
  const address = await vault.getAddress();
  console.log("AgentVault deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
