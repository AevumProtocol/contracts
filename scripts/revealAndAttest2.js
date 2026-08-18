const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const VBO_ADDRESS = "0x9dBC2f11E11C64810922B4c68d55DFf1BCA4Dc8d";
  const COMMITMENT_ID = 2;

  // ─────────────────────────────────────────────
  // KNOWN DATA (from bot logs Aug 11-13)
  // ─────────────────────────────────────────────
  // Aug 11: HALF_BUY $15.00 @ $63,731.77
  // Aug 12: FULL_BUY $30.00 @ $63,281.03
  // Aug 13: DOUBLE_BUY $60.00 @ $63,822.23
  // Aug 14-17: FILL FROM LOGS after window closes
  //
  // Position at commit (Aug 11):
  // BTC: 0.011807518360696224, USD spent: $779.08, avg: $65,981.69
  //
  // ─────────────────────────────────────────────
  // FILL THESE IN ON AUGUST 18 AFTER 07:15 UTC
  // ─────────────────────────────────────────────

  // Starting BTC price (Aug 11 commit): $63,731.77
  const BTC_AT_COMMIT = 63731.77;

  // BTC price at window end (Aug 18) — fill from Coinbase
  const BTC_AT_WINDOW_END = 64791.005;

  // Starting portfolio value: 0.011807518360696224 * 63731.77
  const STARTING_VALUE_USD = 0.011807518360696224 * BTC_AT_COMMIT;

  // Total capital deployed during window — $105 known + Aug 14-17
  // Fill total after window closes
  const CAPITAL_DEPLOYED = 172.50; // Aug11:$15 + Aug12:$30 + Aug13:$60 + Aug14:$0 + Aug15:$7.5 + Aug16:$0 + Aug17:$30 + Aug18:$30

  // Ending BTC held — starting + all buys during window
  const ENDING_BTC = 0.014506;

  // Ending portfolio value
  const ENDING_VALUE_USD = ENDING_BTC * BTC_AT_WINDOW_END;

  // TWR = (ending value - capital deployed) / starting value - 1
  const TWR_PCT = ((ENDING_VALUE_USD - CAPITAL_DEPLOYED) / STARTING_VALUE_USD - 1) * 100;
  const RETURN_BPS = Math.round(TWR_PCT * 100);

  // BTC buy-and-hold return
  const BTC_HOLD_PCT = ((BTC_AT_WINDOW_END - BTC_AT_COMMIT) / BTC_AT_COMMIT) * 100;

  // Regime — fill from bot logs (current_regime param)
  // 0=Bull, 1=Bear, 2=Chop, 3=Neutral, 4=Unknown
  const REGIME = 3; // Neutral/Sideways — verify from logs

  console.log("=== Certificate #002 — Pre-flight ===");
  console.log("BTC at commit:", BTC_AT_COMMIT);
  console.log("BTC at window end:", BTC_AT_WINDOW_END);
  console.log("Starting value:", STARTING_VALUE_USD.toFixed(2));
  console.log("Capital deployed:", CAPITAL_DEPLOYED);
  console.log("Ending BTC:", ENDING_BTC);
  console.log("Ending value:", ENDING_VALUE_USD.toFixed(2));
  console.log("TWR:", TWR_PCT.toFixed(2) + "%");
  console.log("Return BPS:", RETURN_BPS);
  console.log("BTC hold:", BTC_HOLD_PCT.toFixed(2) + "%");
  console.log("Regime:", ["Bull","Bear","Chop","Neutral","Unknown"][REGIME]);

  if (ENDING_BTC === 0 || BTC_AT_WINDOW_END === 0) {
    console.error("\n⚠️ Fill in ENDING_BTC and BTC_AT_WINDOW_END before running!");
    process.exit(1);
  }

  const RESULTS = {
    window_start: "2026-08-11T07:15:37Z",
    window_end: "2026-08-18T07:15:37Z",
    strategy: "BTC Smart DCA Bot v1",
    strategy_hash: "0x0342a2b633a4229878f4442eeba81ee3c942515876a8e03ca3ebd7b1826b9541",
    twr_pct: TWR_PCT.toFixed(2),
    return_bps: RETURN_BPS,
    btc_hold_pct: BTC_HOLD_PCT.toFixed(2),
    regime: ["Bull","Bear","Chop","Neutral","Unknown"][REGIME],
    btc_at_commit: BTC_AT_COMMIT,
    btc_at_window_end: BTC_AT_WINDOW_END,
    starting_value_usd: STARTING_VALUE_USD.toFixed(2),
    capital_deployed_usd: CAPITAL_DEPLOYED,
    ending_btc: ENDING_BTC,
    ending_value_usd: ENDING_VALUE_USD.toFixed(2),
    daily_decisions: [
      { date: "2026-08-11", decision: "HALF_BUY", amount_usd: 15.00, btc_price: 63731.77 },
      { date: "2026-08-12", decision: "FULL_BUY", amount_usd: 30.00, btc_price: 63281.03 },
      { date: "2026-08-13", decision: "DOUBLE_BUY", amount_usd: 60.00, btc_price: 63822.23 },
      { date: "2026-08-14", decision: "SKIP (log rotated)", amount_usd: 0, btc_price: 0 },
      { date: "2026-08-15", decision: "HALF_BUY", amount_usd: 7.50, btc_price: 62965.75 },
      { date: "2026-08-16", decision: "SKIP", amount_usd: 0, btc_price: 63029.71 },
      { date: "2026-08-17", decision: "FULL_BUY", amount_usd: 30.00, btc_price: 63801.67 },
    ],
    attestor: "Jonathan Quintero, Aevum Protocol Inc.",
    attestation_type: "founder-attested, permissioned phase v1",
    note: "Certificate #002 — BTC Smart DCA Bot v1. TWR methodology per independent technical review. Regime sideways at commit (unconfirmed)."
  };

  const resultsHash = '0x20fb4495c12116e1758d46ca6b2532b35d48b354b3cded2334b9a6712e5df33f';
  console.log("\nResults hash:", resultsHash);

  const METADATA_URI = "ipfs://bafkreiaptwfokfvu4njxbndst7z7l7tme65svd5hx73sa2fdbvurvf3e2u";
  const ATTESTATION_NOTE = "Founder-attested, permissioned phase v1. Certificate #002 on Aevum Protocol. TWR methodology applied. Strategy hash committed block 11464676 before forward window.";

  const [deployer] = await ethers.getSigners();
  console.log("Attesting from:", deployer.address);

  const VBO = await ethers.getContractAt("VerifiableBacktestOracle", VBO_ADDRESS);

  const commitment = await VBO.getCommitment(COMMITMENT_ID);
  const windowEnd = Number(commitment.windowEnd);
  const now = Math.floor(Date.now() / 1000);

  if (now < windowEnd) {
    const h = Math.floor((windowEnd - now) / 3600);
    const m = Math.floor(((windowEnd - now) % 3600) / 60);
    console.error(`\nWindow not closed yet — ${h}h ${m}m remaining`);
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
  console.log("✅ Certificate #002 issued at block:", receipt.blockNumber);
}

main().catch(console.error);
