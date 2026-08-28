/**
 * commitWithAtlas.js — VBO v2 strategy commitment with Atlas Oracle pull price
 * Uses the official @atlas-oracle/pull-oracle-consumer-sdk
 * 
 * Run: npx hardhat run scripts/commitWithAtlas.js --network sepolia
 */

require('dotenv').config();
const hre = require("hardhat");
const { ethers } = hre;
const { PullOracleConsumerClient } = require('@atlas-oracle/pull-oracle-consumer-sdk');

const VBO_V2_ADDRESS = "0xEfFa92f77424d733b0f0FFD03caF98D01583cd05";
const ATLAS_API_KEY = process.env.ATLAS_API_KEY;
const BTC_USD_FEED_ID = "626"; // Atlas feed #626 — confirmed by Leonarda Aug 25 2026

const STRATEGY_DESCRIPTION = `BTC Smart DCA Bot v2 — Atlas Price Attested
Exchange: Coinbase Advanced Trade
Asset: BTC-USD
Signal: Dynamic DCA with volatility-adjusted position sizing
Window: 7 days
Version: 2.0`;

const FORWARD_WINDOW_DAYS = 7;

// ethers string ABI for contract reads
const VBO_ABI_ETHERS = [
  "function commitStrategy(bytes32 strategyHash, uint256 forwardWindowDays) external payable returns (uint256)",
  "function commitmentBond() view returns (uint256)",
];

// viem-compatible ABI for Atlas SDK
const VBO_ABI = [
  {
    name: "commitStrategy",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "strategyHash", type: "bytes32" },
      { name: "forwardWindowDays", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Committing from:", deployer.address);
  console.log("Network:", hre.network.name);

  const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(STRATEGY_DESCRIPTION));
  console.log("Strategy hash:", strategyHash);

  // Initialize Atlas SDK
  const client = new PullOracleConsumerClient({
    http: { apiKey: ATLAS_API_KEY },
    validate: true,
    maxDelay: 300,
    maxFutureDrift: 60,
    maxPackageCount: 10,
  });

  // Fetch Atlas signed price payload
  console.log("\nFetching Atlas BTC/USD signed price payload...");
  const priceData = await client.fetchPrices([BTC_USD_FEED_ID]);
  console.log("Atlas extraData received:", priceData.extraData.slice(0, 20) + "...");

  // Parse price for logging
  const vbo = new ethers.Contract(VBO_V2_ADDRESS, VBO_ABI_ETHERS, deployer);
  const bond = await vbo.commitmentBond();

  // Build calldata using SDK
  const calldata = client.buildCalldata({
    abi: VBO_ABI,
    functionName: "commitStrategy",
    args: [strategyHash, BigInt(FORWARD_WINDOW_DAYS)],
    extraData: priceData.extraData,
  });

  console.log("\nSending transaction with Atlas price appended to calldata...");

  // Send transaction with Atlas extraData appended
  const chainAdapter = {
    async sendTransaction({ to, data, value }) {
      const tx = await deployer.sendTransaction({ to, data, value: value ?? 0n });
      return tx.hash;
    }
  };

  const txHash = await client.sendTransaction({
    to: VBO_V2_ADDRESS,
    data: calldata,
    chainAdapter,
    value: bond,
  });

  console.log("\n✓ Strategy committed with Atlas price attestation");
  console.log("Tx:", txHash);
  console.log("Strategy hash:", strategyHash);
  console.log("Window closes:", new Date(Date.now() + FORWARD_WINDOW_DAYS * 86400 * 1000).toISOString());
  console.log("\nSave this strategy description — needed for attestation:\n");
  console.log(STRATEGY_DESCRIPTION);
}

main().catch(console.error);
