const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");

// Atlas Oracle mainnet address — fill when Leonarda sends integration materials
const ATLAS_ORACLE_MAINNET = "0x0000000000000000000000000000000000000000"; // FILL

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  console.log("Network:", hre.network.name);
  console.log("=".repeat(50));

  if (hre.network.name === "mainnet" && ATLAS_ORACLE_MAINNET === "0x0000000000000000000000000000000000000000") {
    console.error("ERROR: Fill in ATLAS_ORACLE_MAINNET address before deploying to mainnet");
    process.exit(1);
  }

  const addresses = {};

  // 1. AgentIdentity
  console.log("\n[1/9] Deploying AgentIdentity...");
  const AgentIdentity = await ethers.getContractFactory("AgentIdentity");
  const agentIdentity = await AgentIdentity.deploy();
  await agentIdentity.waitForDeployment();
  addresses.AgentIdentity = await agentIdentity.getAddress();
  console.log("✓ AgentIdentity:", addresses.AgentIdentity);

  // 2. ReputationOracle v2
  console.log("\n[2/9] Deploying ReputationOracle v2...");
  const ReputationOracle = await ethers.getContractFactory("ReputationOracle");
  const reputationOracle = await ReputationOracle.deploy(addresses.AgentIdentity);
  await reputationOracle.waitForDeployment();
  addresses.ReputationOracle = await reputationOracle.getAddress();
  console.log("✓ ReputationOracle v2:", addresses.ReputationOracle);

  // 3. ReputationController v2
  console.log("\n[3/9] Deploying ReputationController v2...");
  const ReputationController = await ethers.getContractFactory("ReputationController");
  const reputationController = await ReputationController.deploy(
    addresses.AgentIdentity,
    deployer.address,   // oracle 1 — deployer
    deployer.address    // oracle 2 — update to second oracle before mainnet
  );
  await reputationController.waitForDeployment();
  addresses.ReputationController = await reputationController.getAddress();
  console.log("✓ ReputationController v2:", addresses.ReputationController);

  // 4. AgentVault v3
  console.log("\n[4/9] Deploying AgentVault v3...");
  const AgentVault = await ethers.getContractFactory("AgentVault");
  const agentVault = await AgentVault.deploy(
    addresses.ReputationOracle,
    ethers.parseEther("0.1"), // default withdraw limit
    addresses.AgentIdentity
  );
  await agentVault.waitForDeployment();
  addresses.AgentVault = await agentVault.getAddress();
  console.log("✓ AgentVault v3:", addresses.AgentVault);

  // 5. AgentMarketplace
  console.log("\n[5/9] Deploying AgentMarketplace...");
  const AgentMarketplace = await ethers.getContractFactory("AgentMarketplace");
  const agentMarketplace = await AgentMarketplace.deploy(
    addresses.AgentIdentity,
    addresses.ReputationOracle
  );
  await agentMarketplace.waitForDeployment();
  addresses.AgentMarketplace = await agentMarketplace.getAddress();
  console.log("✓ AgentMarketplace:", addresses.AgentMarketplace);

  // 6. AEVToken
  console.log("\n[6/9] Deploying AEVToken...");
  const AEVToken = await ethers.getContractFactory("AEVToken");
  const aevToken = await AEVToken.deploy(deployer.address);
  await aevToken.waitForDeployment();
  addresses.AEVToken = await aevToken.getAddress();
  console.log("✓ AEVToken:", addresses.AEVToken);

  // 7. TokenVesting
  console.log("\n[7/9] Deploying TokenVesting...");
  const TokenVesting = await ethers.getContractFactory("TokenVesting");
  const tokenVesting = await TokenVesting.deploy(addresses.AEVToken);
  await tokenVesting.waitForDeployment();
  addresses.TokenVesting = await tokenVesting.getAddress();
  console.log("✓ TokenVesting:", addresses.TokenVesting);

  // 8. AevumDAO
  console.log("\n[8/9] Deploying AevumDAO...");
  const AevumDAO = await ethers.getContractFactory("AevumDAO");
  const aevumDAO = await AevumDAO.deploy(addresses.AEVToken);
  await aevumDAO.waitForDeployment();
  addresses.AevumDAO = await aevumDAO.getAddress();
  console.log("✓ AevumDAO:", addresses.AevumDAO);

  // 9. VerifiableBacktestOracle v2
  console.log("\n[9/9] Deploying VerifiableBacktestOracle v2...");
  const VBO = await ethers.getContractFactory("VerifiableBacktestOracleV2");
  const vbo = await VBO.deploy(addresses.AgentIdentity, ATLAS_ORACLE_MAINNET);
  await vbo.waitForDeployment();
  addresses.VerifiableBacktestOracle = await vbo.getAddress();
  console.log("✓ VerifiableBacktestOracle v2:", addresses.VerifiableBacktestOracle);

  console.log("\n" + "=".repeat(50));
  console.log("ALL 9 CONTRACTS DEPLOYED");
  console.log("=".repeat(50));

  // Wire contracts
  console.log("\nWiring contracts...");

  // Set ReputationController on AgentIdentity
  const identity = await ethers.getContractAt("AgentIdentity", addresses.AgentIdentity);
  await (await identity.setReputationController(addresses.ReputationController)).wait();
  console.log("✓ ReputationController set on AgentIdentity");

  // Register AgentVault with ReputationOracle
  const oracle = await ethers.getContractAt("ReputationOracle", addresses.ReputationOracle);
  await (await oracle.registerProtocol(addresses.AgentVault, 100)).wait();
  console.log("✓ AgentVault registered with ReputationOracle (min score: 100)");

  // Register AgentMarketplace with ReputationOracle
  await (await oracle.registerProtocol(addresses.AgentMarketplace, 200)).wait();
  console.log("✓ AgentMarketplace registered with ReputationOracle (min score: 200)");

  // Approve VBO as cert issuer on AgentIdentity
  await (await identity.setApprovedCertIssuer(addresses.VerifiableBacktestOracle, true)).wait();
  console.log("✓ VBO approved as cert issuer on AgentIdentity");

  // Save addresses
  const output = {
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: addresses,
  };

  fs.writeFileSync("mainnet-addresses.json", JSON.stringify(output, null, 2));
  console.log("\n✓ Addresses saved to mainnet-addresses.json");

  console.log("\n" + "=".repeat(50));
  console.log("NEXT STEPS:");
  console.log("1. Verify all contracts on Etherscan");
  console.log("2. Share VBO address with Leonarda:", addresses.VerifiableBacktestOracle);
  console.log("3. Update aevum-internal/contracts/addresses.md");
  console.log("4. Update frontend contracts.js with mainnet addresses");
  console.log("5. Deploy mainnet subgraph");
  console.log("=".repeat(50));
}

main().catch(console.error);
