const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const VBO_ADDRESS = "0x9dBC2f11E11C64810922B4c68d55DFf1BCA4Dc8d"; // fill after deployment

  const STRATEGY_DESCRIPTION = `Aevum VBO Certificate #001 — BTC Smart DCA Bot v1
Author: Jonathan Quintero, Aevum Protocol Inc.
Commit Date: 2026-07-30
Live Since: March 31, 2026

STRATEGY: Multi-Signal Adaptive BTC Dollar Cost Averaging

EXCHANGE: Coinbase Advanced Trade API (BTC-USD)
EXECUTION: Market order (market_market_ioc)
SCHEDULE: Daily at 09:00 AM Mountain Time (MDT)

BUY SIZES:
- DOUBLE_BUY: $60 — high conviction, multiple bullish signals aligned, AI score >= 65
- FULL_BUY: $30 — standard conditions met, moderate conviction
- HALF_BUY: $15 — conflicting signals, elevated RSI, or low AI score
- SKIP: $0 — RSI > 80 in bear regime, volume too low, or insufficient balance
- BASE BUY: $30/day | MAX BUY: $60 (DOUBLE_BUY)

18 ACTIVE SIGNALS (consensus-weighted):
1.  Daily RSI-14
2.  Hourly RSI-14
3.  50-day Moving Average
4.  Fear and Greed Index
5.  Volume Analysis (20-day avg comparison)
6.  Market Regime Detection (200-day MA)
7.  Macro: DXY (US Dollar Index)
8.  Macro: S&P 500 (SPY)
9.  Macro: Gold (GC=F)
10. On-Chain: Mempool transaction count
11. On-Chain: Network hashrate vs 30-day avg
12. On-Chain: Hodling addresses trend
13. Funding Rate Proxy (VWAP deviation + price velocity)
14. Exchange Flows (fee pressure + volume trend)
15. Whale Tracker (large transaction count + active addresses)
16. Order Book Analysis (bid/ask imbalance within 1% of price)
17. Hash Ribbon (30-day vs 60-day hashrate MA crossover)
18. ETF Flows (BlackRock IBIT + total daily BTC ETF flows, 3-day avg)
Additional: Stablecoin Supply Ratio, BTC Dominance, Coinbase Premium Index, Overbought Protection, AI Score

AI LAYER: XGBoost classifier
- Status: Active (105 trades trained)
- CV Accuracy: 60.0%
- Top feature: onchain
- Score >= 65: upgrades buy size one level
- Score < 35: downgrades buy size one level

OPPORTUNITY BUY: Extra buy when hourly RSI < 25, after 12PM MDT, once per day, balance > $30

PRICE DROP BUY: Extra buy when price drops >3% from yesterday close AND hourly RSI < 45 AND F&G < 45, after 10AM MDT, once per day, balance > $30

SELL RULES:
- Take Profit: +30% avg buy (Bear) | +50% (Sideways) | +100% (Bull)
- Stop Loss: -6% avg buy (Bear) | -8% (Sideways) | -10% (Bull)
- Trailing Stop: activates at +3% from avg, trails at -3% from peak
- Stop loss checks every 15 minutes (not just at 09:00)

REGIME DETECTION (200-day MA):
- BEAR (current): TP 30% | SL 6%
- SIDEWAYS: TP 50% | SL 8%
- BULL: TP 100% | SL 10%
- Regime change requires manual YES confirmation via Telegram

COMPOUNDING: 20% of realized profits reinvested into base buy amount

LIVE POSITION AT COMMIT:
- BTC held: 0.011450 BTC
- Avg buy price: $66,073
- Total USD spent: $756.58
- Cycles completed: 25
- Live since: March 31, 2026`;

  const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(STRATEGY_DESCRIPTION));
  console.log("Strategy hash:", strategyHash);
  console.log("Strategy length:", STRATEGY_DESCRIPTION.length, "chars");
  console.log("\nSave this hash and strategy description for certificate verification.");
  console.log("Forward window: 7 days");
  console.log("Bond: 0.001 ETH");

  const [deployer] = await ethers.getSigners();
  console.log("\nCommitting from:", deployer.address);

  const VBO = await ethers.getContractAt("VerifiableBacktestOracle", VBO_ADDRESS);

  const FORWARD_WINDOW_DAYS = 7;
  const BOND = ethers.parseEther("0.001");

  const tx = await VBO.commitStrategy(strategyHash, FORWARD_WINDOW_DAYS, { value: BOND });
  console.log("\nCommit tx:", tx.hash);
  const receipt = await tx.wait();
  console.log("Confirmed at block:", receipt.blockNumber);

  const windowEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  console.log("\nForward window closes:", windowEnd.toISOString());
  console.log("Call revealAndAttest() after:", windowEnd.toISOString());
}

main().catch(console.error);
