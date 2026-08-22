const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  console.log("Seeding with:", deployer.address);

  // Contract addresses
  const AGENT_IDENTITY = "0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B";
  const REPUTATION_ORACLE = "0xAda16c3ca238BE164E716F280D3D184269e4A0A9";
  const AGENT_MARKETPLACE = "0xff7A5eBb3ab2C1E92A58B7b6F25CCB6588785Af9";
  const AEVUM_DAO = "0x11205fdFC73Bc7527C2fDc68E7369fcC1f6144dD";

  const AgentIdentity = await ethers.getContractAt("AgentIdentity", AGENT_IDENTITY);
  const ReputationOracle = await ethers.getContractAt("ReputationOracle", REPUTATION_ORACLE);
  const AgentMarketplace = await ethers.getContractAt("AgentMarketplace", AGENT_MARKETPLACE);
  const AevumDAO = await ethers.getContractAt("AevumDAO", AEVUM_DAO);

  // Check if agent is already registered
  const agentId = await AgentIdentity.getAgentByAddress(deployer.address);
  console.log("Agent ID:", agentId.toString());

  // Register marketplace protocol if not already registered
  console.log("\n1. Registering marketplace with oracle...");
  try {
    const tx = await ReputationOracle.registerProtocol(AGENT_MARKETPLACE, 100);
    await tx.wait();
    console.log("✓ Marketplace registered with oracle");
  } catch (e) {
    console.log("Marketplace may already be registered:", e.reason || e.message);
  }

  // Create marketplace listings
  console.log("\n2. Creating marketplace listings...");

  const listings = [
    {
      title: "BTC Signal Feed — Live Alerts",
      description: "Real-time BTC buy/sell signals based on EMA crossover, RSI, and MACD. 24/7 automated signals delivered on-chain. Backtested 3.5 years, 58% win rate.",
      price: ethers.parseEther("0.001"),
    },
    {
      title: "Portfolio Rebalancing Agent",
      description: "Autonomous agent that rebalances your crypto portfolio to target allocations weekly. Supports up to 10 assets. Fully on-chain execution with slippage protection.",
      price: ethers.parseEther("0.002"),
    },
    {
      title: "DeFi Yield Optimizer",
      description: "Scans Aave, Compound, and Curve for highest yield opportunities and automatically moves funds to maximize returns. Reputation-gated, audited execution policy.",
      price: ethers.parseEther("0.005"),
    },
    {
      title: "On-Chain Sentiment Analyzer",
      description: "Aggregates on-chain data signals — wallet flows, DEX volume, liquidation risk — into a single market sentiment score. Updated every 4 hours.",
      price: ethers.parseEther("0.001"),
    },
  ];

  for (const listing of listings) {
    try {
      const tx = await AgentMarketplace.createListing(
        listing.title,
        listing.description,
        listing.price
      );
      await tx.wait();
      console.log(`✓ Created listing: ${listing.title}`);
    } catch (e) {
      console.log(`✗ Failed: ${listing.title} —`, e.reason || e.message);
    }
  }

  // Create DAO proposals
  console.log("\n3. Creating DAO proposals...");

  // First approve DAO targets
  try {
    const tx = await AevumDAO.approveTarget(AGENT_MARKETPLACE, true);
    await tx.wait();
    console.log("✓ AgentMarketplace approved as DAO target");
  } catch (e) {
    console.log("Target may already be approved:", e.reason || e.message);
  }

  try {
    const tx = await AevumDAO.approveTarget(REPUTATION_ORACLE, true);
    await tx.wait();
    console.log("✓ ReputationOracle approved as DAO target");
  } catch (e) {
    console.log("Target may already be approved:", e.reason || e.message);
  }

  // Check AEV token balance for proposals (need 1M AEV voting power)
  const AEVToken = await ethers.getContractAt("AEVToken", "0x1C47FE8AE5531008Ec57fC60C7498Ebf2c2Ac920");
  const balance = await AEVToken.balanceOf(deployer.address);
  console.log("\nAEV Balance:", ethers.formatEther(balance));

  // Self-delegate to activate voting power
  try {
    const tx = await AEVToken.delegate(deployer.address);
    await tx.wait();
    console.log("✓ Self-delegated AEV voting power");
  } catch (e) {
    console.log("Delegation:", e.reason || e.message);
  }

  const proposals = [
    {
      title: "Reduce Platform Fee to 1.5%",
      description: "Proposal to reduce the AgentMarketplace platform fee from 2.5% to 1.5% to increase agent and client adoption in the early growth phase. Lower fees accelerate marketplace volume which compounds $AEV burn faster.",
      target: AGENT_MARKETPLACE,
      callData: AgentMarketplace.interface.encodeFunctionData("setPlatformFee", [150]),
    },
    {
      title: "Increase Default Reputation Threshold to 200",
      description: "Proposal to raise the ReputationOracle default minimum score from 100 to 200. As the protocol matures, a higher default threshold ensures only agents with meaningful on-chain history can access ungated protocols.",
      target: REPUTATION_ORACLE,
      callData: ReputationOracle.interface.encodeFunctionData("setDefaultMinScore", [200]),
    },
  ];

  for (const proposal of proposals) {
    try {
      const tx = await AevumDAO.propose(
        proposal.title,
        proposal.description,
        proposal.target,
        proposal.callData
      );
      await tx.wait();
      console.log(`✓ Created proposal: ${proposal.title}`);
    } catch (e) {
      console.log(`✗ Failed: ${proposal.title} —`, e.reason || e.message);
    }
  }

  console.log("\n✅ Demo seeding complete!");
}

main().catch(console.error);
