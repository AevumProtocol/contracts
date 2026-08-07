const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const VBO_ADDRESS = "0x9dBC2f11E11C64810922B4c68d55DFf1BCA4Dc8d";
  const COMMITMENT_ID = 1;

  // ─────────────────────────────────────────────
  // FILL THESE IN ON AUGUST 8 FROM BOT LOGS
  // ─────────────────────────────────────────────

  // Return in basis points: e.g. 523 = +5.23%, -312 = -3.12%
  // Calculate: ((final_btc_value_usd - starting_usd_spent) / starting_usd_spent) * 10000
  const RETURN_BPS = 693; // +6.93% over 7-day forward window

  // Regime during the window: 0=Bull, 1=Bear, 2=Chop, 3=Mixed, 4=Unknown
  // Based on what the bot reported as current_regime during July 31 - Aug 8
  const REGIME = 1; // 1=Bear — confirmed from logs, opportunity buys skipped all week due to bear regime

  // Results hash: keccak256 of the full results JSON
  // Will be computed below from RESULTS_JSON
  const RESULTS_JSON = JSON.stringify({
    window_start: "2026-07-31T03:15:13Z",
    window_end: "2026-08-08T03:15:13Z",
    strategy: "BTC Smart DCA Bot v1",
    strategy_hash: "0xc821a9df9167e94053beaf3d68055dcf2f1516c58b43807ba30806ce9a6fc4f7",
    return_bps: 693,
    regime: ["Bull","Bear","Chop","Mixed","Unknown"][REGIME],
    // FILL FROM BOT LOGS:
    buys: [], // list of {date, amount_usd, btc_price, decision, btc_bought}
    starting_position: {
      btc_held: 0.011450,
      avg_buy_price: 66073,
      total_usd_spent: 756.58,
      cycles: 25,
    },
    ending_position: {
      btc_held: 0.011807518360696224,
      avg_buy_price: 65981.69,
      total_usd_spent: 779.08,
      cycles: 27,
    },
    attestor: "Jonathan Quintero, Aevum Protocol Inc.",
    attestation_type: "founder-attested, permissioned phase v1",
    note: "First VBO certificate issued on Aevum Protocol. Forward window enforced on-chain. Results deterministically reproducible from DCA bot logs."
  });

  // Pre-computed results hash — matches vbo_cert_001_results.json
  const resultsHash = '0x75bf4a215481bb1c560ae7b8ae30dcc73ca785f517c58821364817ef49cd3366';
  // const resultsHash = ethers.keccak256(ethers.toUtf8Bytes(RESULTS_JSON)); // uncomment to recompute
  console.log("Results hash:", resultsHash);
  console.log("Return BPS:", RETURN_BPS, `(${(RETURN_BPS/100).toFixed(2)}%)`);
  console.log("Regime:", ["Bull","Bear","Chop","Mixed","Unknown"][REGIME]);

  // IPFS/Arweave URI for full results — upload RESULTS_JSON to IPFS first
  // Use https://web3.storage or https://nft.storage (free)
  const METADATA_URI = "ipfs://bafkreiakt7o3woifp3tc3viokfp7kqalcryzk7vri7vg4btma5vtrd6p4i";

  const ATTESTATION_NOTE = "Founder-attested, permissioned phase v1. First VBO certificate on Aevum Protocol. Strategy hash committed on-chain July 31 2026 before forward window. Results deterministically reproducible from bot logs.";

  const [deployer] = await ethers.getSigners();
  console.log("\nAttesting from:", deployer.address);

  const VBO = await ethers.getContractAt("VerifiableBacktestOracle", VBO_ADDRESS);

  // Verify window is closed
  const commitment = await VBO.getCommitment(COMMITMENT_ID);
  const windowEnd = Number(commitment.windowEnd);
  const now = Math.floor(Date.now() / 1000);
  if (now < windowEnd) {
    console.error(`Window not closed yet. Closes at ${new Date(windowEnd * 1000).toISOString()}`);
    console.error(`Time remaining: ${Math.floor((windowEnd - now) / 3600)}h ${Math.floor(((windowEnd - now) % 3600) / 60)}m`);
    process.exit(1);
  }

  console.log("\nWindow confirmed closed. Calling revealAndAttest...");

  const tx = await VBO.revealAndAttest(
    COMMITMENT_ID,
    resultsHash,
    RETURN_BPS,
    REGIME,
    METADATA_URI,
    ATTESTATION_NOTE
  );

  console.log("Tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("Confirmed at block:", receipt.blockNumber);
  console.log("\n✅ Certificate #001 issued on-chain!");
  console.log("Results hash:", resultsHash);
  console.log("View on Etherscan:", `https://sepolia.etherscan.io/tx/${tx.hash}`);
}

main().catch(console.error);
