const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const AGENT_IDENTITY = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";
  const VBO_ADDRESS = "0x9dBC2f11E11C64810922B4c68d55DFf1BCA4Dc8d";

  const [deployer] = await ethers.getSigners();
  console.log("Setting up from:", deployer.address);

  const identity = await ethers.getContractAt("AgentIdentity", AGENT_IDENTITY);

  // Approve VBO as cert issuer on AgentIdentity
  const tx = await identity.setApprovedCertIssuer(VBO_ADDRESS, true);
  console.log("Approving VBO as cert issuer... tx:", tx.hash);
  await tx.wait();
  console.log("✓ VBO approved as cert issuer on AgentIdentity");
}

main().catch(console.error);
