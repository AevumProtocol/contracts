/**
 * deployMainnet.js — September 4, 2026 ETHOnline Launch
 * Deploys only the 4 contracts VBO v2 requires:
 * 1. AgentIdentity
 * 2. ReputationOracle v2
 * 3. ReputationController v2
 * 4. VBO v2 (with Atlas Oracle pull mode)
 *
 * Post-funding deploys (separate script):
 * - AEVToken, TokenVesting, AevumDAO, AgentVault, AgentMarketplace
 *
 * Run: npx hardhat run scripts/deployMainnet.js --network mainnet
 */

require('dotenv').config();
const { ethers } = require("hardhat");

const delay = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("═══════════════════════════════════════════════");
  console.log("  Aevum Protocol — Mainnet Deploy (VBO Core)  ");
  console.log("═══════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("═══════════════════════════════════════════════\n");

  if (ethers.formatEther(balance) < 0.01) {
    throw new Error("Insufficient ETH — need at least 0.01 ETH for gas");
  }

  const addresses = {};

  // ── 1. AgentIdentity ────────────────────────────────────────────────────────
  console.log("1/4 Deploying AgentIdentity...");
  const AgentIdentity = await ethers.getContractFactory("AgentIdentity");
  const agentIdentity = await AgentIdentity.deploy();
  await agentIdentity.waitForDeployment();
  addresses.AgentIdentity = await agentIdentity.getAddress();
  console.log("   ✓ AgentIdentity:", addresses.AgentIdentity);
  await delay(5000); // wait for tx to confirm

  // ── 2. ReputationOracle v2 ───────────────────────────────────────────────────
  console.log("2/4 Deploying ReputationOracle v2...");
  const ReputationOracle = await ethers.getContractFactory("ReputationOracle");
  const reputationOracle = await ReputationOracle.deploy(addresses.AgentIdentity);
  await reputationOracle.waitForDeployment();
  addresses.ReputationOracle = await reputationOracle.getAddress();
  console.log("   ✓ ReputationOracle v2:", addresses.ReputationOracle);
  await delay(5000);

  // ── 3. ReputationController v2 ───────────────────────────────────────────────
  console.log("3/4 Deploying ReputationController v2...");
  const ReputationController = await ethers.getContractFactory("ReputationController");
  // ReputationController requires 2 distinct oracle addresses for bootstrap
  // Using deployer as oracle1 and ReputationOracle contract as oracle2
  const reputationController = await ReputationController.deploy(
    addresses.AgentIdentity,
    deployer.address,
    addresses.ReputationOracle
  );
  await reputationController.waitForDeployment();
  addresses.ReputationController = await reputationController.getAddress();
  console.log("   ✓ ReputationController v2:", addresses.ReputationController);
  await delay(5000);

  // ── 4. VBO v2 (Atlas Oracle pull mode) ──────────────────────────────────────
  console.log("4/4 Deploying VBO v2 with Atlas Oracle...");
  const VBO = await ethers.getContractFactory("VerifiableBacktestOracleV2");
  const vbo = await VBO.deploy(addresses.AgentIdentity);
  await vbo.waitForDeployment();
  addresses.VBO = await vbo.getAddress();
  console.log("   ✓ VBO v2:", addresses.VBO);
  await delay(5000);

  // ── Setup ────────────────────────────────────────────────────────────────────
  console.log("\nConfiguring contracts...");

  // Set ReputationController on AgentIdentity
  await (await agentIdentity.setReputationController(addresses.ReputationController)).wait();
  console.log("   ✓ ReputationController set on AgentIdentity");
  await delay(5000);

  // Approve VBO as cert issuer on AgentIdentity
  await (await agentIdentity.setApprovedCertIssuer(addresses.VBO, true)).wait();
  console.log("   ✓ VBO approved as cert issuer on AgentIdentity");


  // ── Gas report ───────────────────────────────────────────────────────────────
  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log("\n═══════════════════════════════════════════════");
  console.log("  Deployment Complete                          ");
  console.log("═══════════════════════════════════════════════");
  console.log("AgentIdentity:        ", addresses.AgentIdentity);
  console.log("ReputationOracle v2:  ", addresses.ReputationOracle);
  console.log("ReputationController: ", addresses.ReputationController);
  console.log("VBO v2:               ", addresses.VBO);
  console.log("Gas used:             ", ethers.formatEther(gasUsed), "ETH");
  console.log("Remaining balance:    ", ethers.formatEther(finalBalance), "ETH");
  console.log("═══════════════════════════════════════════════");

  // Save addresses to file
  const fs = require('fs');
  const output = {
    network: "mainnet",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: addresses,
    gasUsed: ethers.formatEther(gasUsed),
  };
  fs.writeFileSync('mainnet-addresses.json', JSON.stringify(output, null, 2));
  console.log("\n✓ Addresses saved to mainnet-addresses.json");
  console.log("\nNext steps:");
  console.log("1. Verify contracts on Etherscan");
  console.log("2. Update frontend CONTRACTS with mainnet addresses");
  console.log("3. Update aevum-subgraph with mainnet addresses");
  console.log("4. Submit ETHOnline at 7:30 AM PDT");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
