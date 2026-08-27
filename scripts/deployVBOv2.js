const hre = require("hardhat");
const { ethers } = hre;

const AGENT_IDENTITY = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Network:", hre.network.name);

  console.log("\nDeploying VerifiableBacktestOracleV2...");
  const VBO = await ethers.getContractFactory("VerifiableBacktestOracleV2");
  const vbo = await VBO.deploy(AGENT_IDENTITY);
  await vbo.waitForDeployment();
  const address = await vbo.getAddress();
  console.log("✓ VBO v2 deployed:", address);

  // Approve as cert issuer on AgentIdentity
  const AgentIdentity = await ethers.getContractAt("AgentIdentity", AGENT_IDENTITY);
  await (await AgentIdentity.setApprovedCertIssuer(address, true)).wait();
  console.log("✓ VBO v2 approved as cert issuer on AgentIdentity");

  console.log("\nUpdate commitWithAtlas.js with:");
  console.log("const VBO_V2_ADDRESS =", `"${address}";`);
}

main().catch(console.error);
