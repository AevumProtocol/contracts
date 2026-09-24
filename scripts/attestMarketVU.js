/**
 * attestMarketVU.js — one-time on-chain attestation of the MarketVU ETH research commitment.
 *
 * Commitment ID 4 · strategyHash 0x1e3e2b9f…d614e1 · commit tx 0xd9b19465…2dddac (block 26,044,348)
 * Allowed window: after Oct 24 2026 02:28 UTC (windowEnd) and BEFORE ~Nov 23 2026 (windowEnd + 30d, slashable).
 *
 * This is a RESEARCH commitment, not a trading return: returnBps = 0, regime = Unknown, with an explicit note.
 * Grading of the six cycles happens off-chain (aevum-internal/certificates/marketvu/grade.py).
 *
 * DRY RUN (default — checks everything, sends nothing):
 *   npx hardhat run scripts/attestMarketVU.js --network mainnet
 * SEND:
 *   SEND=1 npx hardhat run scripts/attestMarketVU.js --network mainnet
 */
require('dotenv').config();
const hre = require("hardhat");
const { ethers } = hre;
const { PullOracleConsumerClient } = require('@atlas-oracle/pull-oracle-consumer-sdk');

const VBO_V2_ADDRESS = "0xEd3309a515CA607c4687f096D6E60E639e03D793";
const COMMITMENT_ID = 4;
const EXPECTED_STRATEGY_HASH = "0x1e3e2b9fee569b08b5c93325dd4914a6c2bb8627ad6667adf927934dd6d614e1";
const WINDOW_END = 1792808927; // from StrategyCommitted event
const BTC_USD_FEED_ID = "626";  // VBO v2 requires an Atlas payload; it reads BTC/USD only

// Public page with the full commitment text + grading schedule (confirm Sumit OK'd publishing first)
const METADATA_URI = process.env.MARKETVU_METADATA_URI || "https://aevumprotocol.io/research/marketvu-eth-2026-09-23";
const ATTESTATION_NOTE =
  "Research commitment (MarketVU ETH stock-cycle report, V4, 2026-09-23). Not a trading return: returnBps and regime are placeholders. " +
  "Six future cycles (2026-10-06 to 2029-02-06) are graded off-chain on Coinbase ETH-USD daily closes (UTC) per the committed criteria.";

const REVEAL = {
  type: "research-commitment-reveal",
  commitmentId: COMMITMENT_ID,
  strategyHash: EXPECTED_STRATEGY_HASH,
  commitTx: "0xd9b1946592cc7e475a0bc9ad810564b2cef5a3d0af1ac63c7666825fde2dddac",
  reportSha256: "466364ca450031256b2c30c0472ef861e0c4bc471c0ffde6c7ffdf31af17950e",
  grading: "off-chain per cycle; Coinbase ETH-USD daily close (UTC)",
  gradeDates: ["2026-12-09", "2027-05-01", "2027-10-01", "2028-04-01", "2028-08-09", "2029-02-07"],
  metadataURI: METADATA_URI,
};

const ABI = [
  "function revealAndAttest(uint256 commitmentId, bytes32 resultsHash, int256 returnBps, uint8 regime, string metadataURI, string attestationNote) returns (uint256)",
  "function approvedAttestors(address) view returns (bool)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  console.log("Signer:", signer.address, "| chainId:", net.chainId.toString());
  if (net.chainId !== 1n) throw new Error("Not mainnet — aborting.");

  const now = Math.floor(Date.now() / 1000);
  if (now < WINDOW_END) throw new Error(`Window still open. Opens ${new Date(WINDOW_END * 1000).toISOString()}`);
  if (now > WINDOW_END + 30 * 86400) console.warn("WARNING: past windowEnd + 30 days — commitment may already be slashed.");

  const vbo = new ethers.Contract(VBO_V2_ADDRESS, ABI, signer);
  let approved = null;
  try { approved = await vbo.approvedAttestors(signer.address); } catch (_) {}
  console.log("Approved attestor:", approved);
  if (approved === false) throw new Error("Signer is not an approved attestor (owner can addAttestor).");

  const resultsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(REVEAL)));
  console.log("resultsHash:", resultsHash);

  const client = new PullOracleConsumerClient({
    http: { apiKey: process.env.ATLAS_API_KEY }, validate: true, maxDelay: 300, maxFutureDrift: 60, maxPackageCount: 10,
  });
  const priceData = await client.fetchPrices([BTC_USD_FEED_ID]);

  const iface = new ethers.Interface(ABI);
  const base = iface.encodeFunctionData("revealAndAttest", [
    COMMITMENT_ID, resultsHash, 0n, 4 /* Unknown */, METADATA_URI, ATTESTATION_NOTE,
  ]);
  const data = base + priceData.extraData.replace(/^0x/, "");

  // Simulate first — reverts here cost nothing
  const gas = await ethers.provider.estimateGas({ from: signer.address, to: VBO_V2_ADDRESS, data });
  console.log("Simulation OK. Estimated gas:", gas.toString());

  if (process.env.SEND !== "1") {
    console.log("\nDRY RUN — nothing sent. Re-run with SEND=1 to attest.");
    console.log("Reveal JSON (save to aevum-internal/certificates/marketvu/attestation-reveal.json):\n" + JSON.stringify(REVEAL, null, 2));
    return;
  }
  const tx = await signer.sendTransaction({ to: VBO_V2_ADDRESS, data, gasLimit: (gas * 12n) / 10n });
  console.log("Sent:", tx.hash);
  const rc = await tx.wait();
  console.log("Confirmed in block", rc.blockNumber, "status", rc.status);
}

main().catch((e) => { console.error(e); process.exit(1); });
