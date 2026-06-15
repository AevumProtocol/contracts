const hre = require("hardhat");

async function main() {
  const AgentIdentity = await hre.ethers.getContractFactory("AgentIdentity");
  const contract = await AgentIdentity.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("AgentIdentity deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
