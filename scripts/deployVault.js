const hre = require("hardhat");

async function main() {
  const ORACLE_ADDRESS = "0xDF24C30541B08cFd1E81c35CbBd7a90c9EE33EbE";
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
