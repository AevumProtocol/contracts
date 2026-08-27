/**
 * commitWithAtlas.js — VBO v2 strategy commitment with Atlas Oracle pull price
 * 
 * Atlas pull mode: fetches signed BTC/USD price payload from Atlas API,
 * appends it to transaction calldata. VBO v2 inherits PullOracleConsumerStandard
 * which verifies the Atlas signature on-chain.
 * 
 * Calldata format: [function selector + params] + [payload] + [signature] + [magicMarker]
 * 
 * Run: npx hardhat run scripts/commitWithAtlas.js --network sepolia
 */

require('dotenv').config();
const hre = require("hardhat");
const { ethers } = hre;

const VBO_V2_ADDRESS = "DEPLOY_VBO_V2_FIRST"; // Update after deploying VBO v2
const ATLAS_API_KEY = process.env.ATLAS_API_KEY;
const BTC_USD_FEED_ID = "626"; // Atlas feed #626, confirmed by Leonarda Aug 25 2026

const STRATEGY_DESCRIPTION = `BTC Smart DCA Bot v2 — Atlas Price Attested
Exchange: Coinbase Advanced Trade
Asset: BTC-USD
Signal: Dynamic DCA with volatility-adjusted position sizing
Window: 7 days
Version: 2.0`;

const FORWARD_WINDOW_DAYS = 7;

async function fetchAtlasPayload() {
  console.log("Fetching Atlas BTC/USD signed price payload...");
  const response = await fetch('https://api.atlasoracle.io/report/v1/price/latest', {
    method: 'POST',
    headers: { 'X-API-KEY': ATLAS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedIds: [BTC_USD_FEED_ID], signed: true })
  });
  const data = await response.json();
  if (data.status.error_code !== "0") throw new Error(`Atlas API error: ${data.status.error_message}`);
  
  const { payload, signature, magicMarker, parsedPayload, consensusScores } = data.data;
  const parsed = JSON.parse(parsedPayload)[0];
  const price = Number(parsed.price) / 1e18;
  const cs = consensusScores[0];
  
  console.log(`BTC/USD: $${price.toFixed(2)}`);
  console.log(`ConsensusScore: ${cs.consensusScore} (${cs.consensusStatus})`);
  console.log(`Timestamp: ${new Date(Number(parsed.timestampSeconds) * 1000).toISOString()}`);

  // Assemble Atlas calldata suffix: payload + signature + magicMarker
  // Strip 0x from each and concatenate
  const atlasSuffix = payload.slice(2) + signature.slice(2) + magicMarker.slice(2);
  return { atlasSuffix, price, consensusScore: cs.consensusScore };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Committing from:", deployer.address);
  console.log("Network:", hre.network.name);

  const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(STRATEGY_DESCRIPTION));
  console.log("Strategy hash:", strategyHash);

  const { atlasSuffix, price, consensusScore } = await fetchAtlasPayload();

  const VBO_ABI = [
    "function commitStrategy(bytes32 strategyHash, uint256 forwardWindowDays) external payable returns (uint256)",
    "function commitmentBond() view returns (uint256)",
  ];

  const vbo = new ethers.Contract(VBO_V2_ADDRESS, VBO_ABI, deployer);
  const bond = await vbo.commitmentBond();

  // Encode the function call
  const iface = new ethers.Interface(VBO_ABI);
  const encodedCall = iface.encodeFunctionData("commitStrategy", [strategyHash, FORWARD_WINDOW_DAYS]);

  // Append Atlas signed price payload to calldata
  const fullCalldata = encodedCall + atlasSuffix;

  console.log("\nSending transaction with Atlas price appended to calldata...");
  const tx = await deployer.sendTransaction({
    to: VBO_V2_ADDRESS,
    data: fullCalldata,
    value: bond,
  });

  const receipt = await tx.wait();
  console.log("\n✓ Strategy committed with Atlas price attestation");
  console.log("Tx:", tx.hash);
  console.log("Block:", receipt.blockNumber);
  console.log("BTC/USD at commit: $" + price.toFixed(2));
  console.log("ConsensusScore:", consensusScore);
  console.log("Strategy hash:", strategyHash);
  console.log("Window closes:", new Date(Date.now() + FORWARD_WINDOW_DAYS * 86400 * 1000).toISOString());
  console.log("\nSave this strategy description — needed for attestation:\n");
  console.log(STRATEGY_DESCRIPTION);
}

main().catch(console.error);
