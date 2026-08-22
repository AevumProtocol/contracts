const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const AGENT_IDENTITY = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";
  const [deployer] = await ethers.getSigners();
  console.log("Registering agent for:", deployer.address);

  const identity = await ethers.getContractAt("AgentIdentity", AGENT_IDENTITY);
  const strategyHash = ethers.keccak256(ethers.toUtf8Bytes("Aevum Protocol VBO Attestor v1"));
  const policy = [BigInt(500000), BigInt("1000000000000000000"), true, true];
  
  const tx = await identity.registerAgent(strategyHash, "https://aevumprotocol.io", policy);
  console.log("Tx:", tx.hash);
  await tx.wait();
  
  const agentId = await identity.getAgentByAddress(deployer.address);
  console.log("✓ Agent registered — ID:", agentId.toString());
}

main().catch(console.error);
