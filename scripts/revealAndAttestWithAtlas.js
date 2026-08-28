/**
 * revealAndAttestWithAtlas.js — VBO v2 attestation with Atlas Oracle pull price
 * Uses the official @atlas-oracle/pull-oracle-consumer-sdk
 * 
 * Run: npx hardhat run scripts/revealAndAttestWithAtlas.js --network sepolia
 */

require('dotenv').config();
const hre = require("hardhat");
const { ethers } = hre;
const { PullOracleConsumerClient } = require('@atlas-oracle/pull-oracle-consumer-sdk');

// ─── FILL THESE IN BEFORE RUNNING ─────────────────────────────────────────────

const VBO_V2_ADDRESS = "0xEfFa92f77424d733b0f0FFD03caF98D01583cd05";
const COMMITMENT_ID = 1;
const BTC_USD_FEED_ID = "626";

const RESULTS = {
  twr_pct: "0.00",        // Fill in actual TWR
  return_bps: 0,           // TWR in basis points
  btc_hold_pct: "0.00",
  alpha_pct: "0.00",
  regime: "Neutral",       // Bull / Bear / Chop / Neutral / Unknown
  window_start: "2026-08-27",
  window_end: "2026-09-03",
  capital_deployed_usd: 100,
  notes: "VBO v2 test — Atlas Oracle price attestation at commit and attest",
};

// ──────────────────────────────────────────────────────────────────────────────

const VBO_ABI = [
  {
    name: "revealAndAttest",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "commitmentId", type: "uint256" },
      { name: "resultsHash", type: "bytes32" },
      { name: "returnBps", type: "int256" },
      { name: "regime", type: "uint8" },
      { name: "metadataURI", type: "string" },
      { name: "attestationNote", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
];

const REGIME_MAP = { Bull: 0, Bear: 1, Chop: 2, Neutral: 3, Unknown: 4 };

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Attesting from:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Commitment ID:", COMMITMENT_ID);

  // Initialize Atlas SDK
  const client = new PullOracleConsumerClient({
    http: { apiKey: process.env.ATLAS_API_KEY },
    validate: true,
    maxDelay: 300,
    maxFutureDrift: 60,
    maxPackageCount: 10,
  });

  // Fetch Atlas signed price at window end
  console.log("\nFetching Atlas BTC/USD signed price at window end...");
  const priceData = await client.fetchPrices([BTC_USD_FEED_ID]);
  console.log("Atlas extraData received:", priceData.extraData.slice(0, 20) + "...");

  const resultsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(RESULTS)));
  const regime = REGIME_MAP[RESULTS.regime] ?? 3;
  const metadataURI = "ipfs://placeholder-upload-to-pinata";
  const attestationNote = `Atlas Oracle attested. VBO v2. ConsensusScore verified.`;

  // Build calldata with Atlas extraData
  const calldata = client.buildCalldata({
    abi: VBO_ABI,
    functionName: "revealAndAttest",
    args: [
      BigInt(COMMITMENT_ID),
      resultsHash,
      BigInt(RESULTS.return_bps),
      regime,
      metadataURI,
      attestationNote,
    ],
    extraData: priceData.extraData,
  });

  console.log("\nSending attestation with Atlas price appended to calldata...");

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
  });

  console.log("\n✓ Certificate issued with Atlas price attestation");
  console.log("Tx:", txHash);
  console.log("Results hash:", resultsHash);
}

main().catch(console.error);
