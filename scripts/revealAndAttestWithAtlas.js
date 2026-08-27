/**
 * revealAndAttestWithAtlas.js — VBO v2 attestation with Atlas Oracle pull price
 * 
 * Fetches Atlas-signed BTC/USD price at window end, appends to calldata.
 * VBO v2 verifies Atlas signature on-chain — price is trustless.
 * 
 * Run: npx hardhat run scripts/revealAndAttestWithAtlas.js --network sepolia
 */

require('dotenv').config();
const hre = require("hardhat");
const { ethers } = hre;

// ─── FILL THESE IN ────────────────────────────────────────────────────────────

const VBO_V2_ADDRESS = "0xEfFa92f77424d733b0f0FFD03caF98D01583cd05";
const COMMITMENT_ID = 1; // The commitment ID from commitWithAtlas.js

// Results from the forward window
const RESULTS = {
  twr_pct: "0.00",        // Fill in actual TWR after window closes
  return_bps: 0,           // TWR in basis points (twr_pct * 100)
  btc_hold_pct: "0.00",   // BTC buy-and-hold benchmark during window
  alpha_pct: "0.00",       // Alpha over benchmark
  regime: "Neutral",       // Bull / Bear / Chop / Neutral / Unknown
  window_start: "2026-08-27",
  window_end: "2026-09-03",
  capital_deployed_usd: 100,
  notes: "VBO v2 test — Atlas Oracle price attestation at commit and attest time",
};

const ATLAS_API_KEY = process.env.ATLAS_API_KEY;
const BTC_USD_FEED_ID = "626";

// ──────────────────────────────────────────────────────────────────────────────

async function fetchAtlasPayload() {
  console.log("Fetching Atlas BTC/USD signed price at window end...");
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

  console.log(`BTC/USD at window end: $${price.toFixed(2)}`);
  console.log(`ConsensusScore: ${cs.consensusScore} (${cs.consensusStatus})`);

  const atlasSuffix = payload.slice(2) + signature.slice(2) + magicMarker.slice(2);
  return { atlasSuffix, price, consensusScore: cs.consensusScore };
}

async function uploadToIPFS(results) {
  // For now return a placeholder — replace with Pinata/web3.storage upload
  const resultsJson = JSON.stringify(results, null, 2);
  console.log("\nResults JSON:");
  console.log(resultsJson);
  // TODO: upload to IPFS and return real CID
  return "ipfs://placeholder-upload-to-pinata";
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Attesting from:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Commitment ID:", COMMITMENT_ID);

  const { atlasSuffix, price, consensusScore } = await fetchAtlasPayload();

  // Add Atlas window-end price to results
  const fullResults = {
    ...RESULTS,
    btc_price_at_window_end_usd: price.toFixed(2),
    atlas_consensus_score_at_window_end: consensusScore,
  };

  const metadataURI = await uploadToIPFS(fullResults);
  const resultsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(fullResults)));

  // Regime enum: 0=Bull, 1=Bear, 2=Chop, 3=Neutral, 4=Unknown
  const regimeMap = { Bull: 0, Bear: 1, Chop: 2, Neutral: 3, Unknown: 4 };
  const regime = regimeMap[RESULTS.regime] ?? 3;

  const VBO_ABI = [
    "function revealAndAttest(uint256 commitmentId, bytes32 resultsHash, int256 returnBps, uint8 regime, string calldata metadataURI, string calldata attestationNote) external payable returns (uint256)",
  ];

  const iface = new ethers.Interface(VBO_ABI);
  const encodedCall = iface.encodeFunctionData("revealAndAttest", [
    COMMITMENT_ID,
    resultsHash,
    RESULTS.return_bps,
    regime,
    metadataURI,
    `Atlas Oracle attested. BTC/USD at window end: $${price.toFixed(2)}. ConsensusScore: ${consensusScore}.`,
  ]);

  // Append Atlas signed price payload to calldata
  const fullCalldata = encodedCall + atlasSuffix;

  console.log("\nSending attestation with Atlas price appended to calldata...");
  const [signer] = await ethers.getSigners();
  const tx = await signer.sendTransaction({
    to: VBO_V2_ADDRESS,
    data: fullCalldata,
    value: 0,
  });

  const receipt = await tx.wait();
  console.log("\n✓ Certificate issued with Atlas price attestation");
  console.log("Tx:", tx.hash);
  console.log("Block:", receipt.blockNumber);
  console.log("Results hash:", resultsHash);
  console.log("BTC/USD at window end: $" + price.toFixed(2));
  console.log("ConsensusScore:", consensusScore);
}

main().catch(console.error);
