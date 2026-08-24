# VBO Integration Guide
## Verifiable Backtest Oracle — Third-Party Developer Integration

**Aevum Protocol Inc.**
Version: 1.0 — August 2026
Contract: VerifiableBacktestOracleV2

---

## Overview

The Verifiable Backtest Oracle (VBO) allows any platform to issue on-chain certificates proving a trading strategy was defined before its forward test window — eliminating look-ahead bias and cherry-picking from strategy performance claims.

**The pipeline:**
1. **Commit** — strategy hash + Atlas price locked on-chain before window opens
2. **Forward window** — strategy runs on live market data (7-90 days)
3. **Attest** — results submitted after window closes with Atlas-verified end price
4. **Certificate** — permanent on-chain record with TWR, regime, and verified prices

---

## Contract Addresses

| Network | Address |
|---|---|
| Ethereum Sepolia (testnet) | `0x9dBC2f11E11C64810922B4c68d55DFf1BCA4Dc8d` (VBO v1) |
| Ethereum Mainnet | TBD — September 4, 2026 |

**ABI:** Available at [github.com/AevumProtocol/contracts](https://github.com/AevumProtocol/contracts)

---

## Step 1 — Committing a Strategy

### What to hash

The strategy hash is `keccak256` of a plain-text strategy description. The description should be specific enough to prove the strategy was defined — include signals, rules, entry/exit logic, exchange, asset, and position sizing.

```javascript
const { ethers } = require("ethers");

const strategyDescription = `
  Strategy: BTC Moving Average Crossover v1
  Exchange: Coinbase Advanced Trade API
  Asset: BTC-USD
  Entry: Buy when 20-day MA crosses above 50-day MA
  Exit: Sell when 20-day MA crosses below 50-day MA
  Position size: $500 per signal
  Stop loss: -8% from entry
  Version: 1.0.0
  Author: [your identifier]
  Timestamp: 2026-09-01
`;

const strategyHash = ethers.keccak256(ethers.toUtf8Bytes(strategyDescription));
console.log("Strategy hash:", strategyHash);
// Save strategyDescription — you'll need it for verification later
```

### Calling commitStrategy

```javascript
const VBO_ADDRESS = "0x9dBC2f11E11C64810922B4c68d55DFf1BCA4Dc8d";
const VBO_ABI = [
  "function commitStrategy(bytes32 strategyHash, uint256 forwardWindowDays, bytes calldata atlasPriceUpdate) external payable returns (uint256)",
  "function commitmentBond() view returns (uint256)",
];

const provider = new ethers.JsonRpcProvider(YOUR_RPC_URL);
const signer = new ethers.Wallet(YOUR_PRIVATE_KEY, provider);
const vbo = new ethers.Contract(VBO_ADDRESS, VBO_ABI, signer);

const bond = await vbo.commitmentBond(); // 0.001 ETH

// atlasPriceUpdate: pass empty bytes if Atlas not yet integrated
// Pass signed Atlas update bytes if integrated (see Atlas section below)
const atlasPriceUpdate = "0x";

const tx = await vbo.commitStrategy(
  strategyHash,
  7,              // forward window in days (7-90)
  atlasPriceUpdate,
  { value: bond }
);

const receipt = await tx.wait();
console.log("Commitment tx:", receipt.hash);
console.log("Commitment block:", receipt.blockNumber);

// The commitmentId is emitted in the StrategyCommitted event
const event = receipt.logs.find(l => l.topics[0] === ethers.id("StrategyCommitted(uint256,address,bytes32,uint256,uint256,int256,uint256)"));
// Parse event for commitmentId
```

### Important

- Save the `strategyDescription` text — it's never stored on-chain. You'll need it to prove the hash matches during verification.
- The bond (0.001 ETH) is returned when you attest results. It's burned if you never attest.
- Maximum 3 commitments per wallet per 30-day window (anti-shotgun protection).

---

## Step 2 — Attesting Results

After the forward window closes, submit your results:

```javascript
const VBO_ABI_ATTEST = [
  "function revealAndAttest(uint256 commitmentId, bytes32 resultsHash, int256 returnBps, uint8 regime, string calldata metadataURI, string calldata attestationNote, bytes calldata atlasPriceUpdate) external payable returns (uint256)",
];

// Build results object
const results = {
  window_start: "2026-09-01T00:00:00Z",
  window_end: "2026-09-08T00:00:00Z",
  strategy_hash: strategyHash,
  twr_pct: "3.45",      // Time-Weighted Return %
  return_bps: 345,       // TWR in basis points
  btc_hold_pct: "2.10", // BTC buy-and-hold benchmark
  alpha_pct: "1.35",    // Alpha over benchmark
  regime: "Neutral",    // Bull / Bear / Chop / Neutral / Unknown
  capital_deployed_usd: 500,
  // ... full results
};

// Upload results JSON to IPFS (use Pinata, web3.storage, etc.)
const metadataURI = "ipfs://YOUR_CID_HERE";

const resultsHash = ethers.keccak256(
  ethers.toUtf8Bytes(JSON.stringify(results))
);

// Regime enum: 0=Bull, 1=Bear, 2=Chop, 3=Neutral, 4=Unknown
const regime = 3; // Neutral

const atlasPriceUpdate = "0x"; // or signed Atlas update

const tx = await vbo.revealAndAttest(
  commitmentId,
  resultsHash,
  345,            // returnBps
  regime,
  metadataURI,
  "Strategy ran as committed. TWR calculated per Modified Dietz method.",
  atlasPriceUpdate
);

const receipt = await tx.wait();
console.log("Certificate issued:", receipt.hash);
```

---

## Step 3 — Reading Certificate Data

```javascript
const VBO_ABI_READ = [
  "function getCertificate(uint256 certId) view returns (tuple(uint256 id, uint256 commitmentId, address agent, uint256 agentId, bytes32 strategyHash, bytes32 resultsHash, uint256 windowStart, uint256 windowEnd, uint256 issuedAt, uint8 regime, int256 returnBps, int256 priceAtCommit, int256 priceAtWindowEnd, uint256 consensusScoreAtCommit, uint256 consensusScoreAtWindowEnd, uint256 submissionCount, string metadataURI, string attestationNote, bool revoked))",
  "function getCommitment(uint256 commitmentId) view returns (tuple(address submitter, bytes32 strategyHash, uint256 commitBlock, uint256 commitTimestamp, uint256 windowStart, uint256 windowEnd, uint256 bondAmount, int256 priceAtCommit, uint256 priceAtCommitTimestamp, uint256 consensusScoreAtCommit, uint8 status, uint256 certificateId))",
  "function certificateCount() view returns (uint256)",
];

const provider = new ethers.JsonRpcProvider(YOUR_RPC_URL);
const vbo = new ethers.Contract(VBO_ADDRESS, VBO_ABI_READ, provider);

// Read a certificate
const cert = await vbo.getCertificate(1);
console.log({
  strategyHash: cert.strategyHash,
  returnBps: Number(cert.returnBps),  // divide by 100 for %
  regime: ["Bull","Bear","Chop","Neutral","Unknown"][cert.regime],
  priceAtCommit: Number(cert.priceAtCommit) / 1e8,  // Atlas 8 decimals
  priceAtWindowEnd: Number(cert.priceAtWindowEnd) / 1e8,
  consensusScoreAtCommit: Number(cert.consensusScoreAtCommit),
  issuedAt: new Date(Number(cert.issuedAt) * 1000).toISOString(),
  revoked: cert.revoked,
});

// Get total certificate count
const count = await vbo.certificateCount();
console.log("Total certificates:", count.toString());
```

---

## Step 4 — Atlas Oracle Price Integration (v2)

Atlas Oracle provides verified BTC/USD prices at commit and attest time, making the certificate fully trustless — no one has to trust the attestor's reported prices.

### Fetching Atlas price updates (off-chain)

```javascript
// Fetch signed price update from Atlas API
// Atlas will provide the endpoint after whitelisting your contract
async function getAtlasPriceUpdate(feedId) {
  const response = await fetch(
    `https://api.atlasoracle.io/v1/price-update?feedId=${feedId}&contract=${VBO_ADDRESS}`
  );
  const data = await response.json();
  return data.updateBytes; // hex-encoded signed price update
}

// Usage at commit time
const atlasPriceUpdate = await getAtlasPriceUpdate("BTC-USD");
const updateFee = await vbo.getUpdateFee([atlasPriceUpdate]);

const tx = await vbo.commitStrategy(
  strategyHash,
  7,
  atlasPriceUpdate,
  { value: bond + updateFee }
);
```

### What gets stored on-chain with Atlas

- `priceAtCommit` — BTC/USD price at the moment of commitment (8 decimals)
- `priceAtWindowEnd` — BTC/USD price when results are attested (8 decimals)
- `consensusScoreAtCommit` — Atlas confidence score 0-100 at commit
- `consensusScoreAtWindowEnd` — Atlas confidence score 0-100 at attestation
- Minimum ConsensusScore accepted: 70

---

## Platform Integration Example

For platforms integrating VBO at the protocol level (AlgoChains-style):

```javascript
class VBOPlatformIntegration {
  constructor(vboAddress, rpcUrl, attestorKey) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.attestor = new ethers.Wallet(attestorKey, this.provider);
    this.vbo = new ethers.Contract(vboAddress, VBO_ABI_FULL, this.attestor);
  }

  // Called when a user submits a strategy on your platform
  async certifyStrategy(userId, strategyDescription, windowDays = 7) {
    const strategyHash = ethers.keccak256(
      ethers.toUtf8Bytes(strategyDescription)
    );

    const bond = await this.vbo.commitmentBond();
    const tx = await this.vbo.commitStrategy(
      strategyHash, windowDays, "0x", { value: bond }
    );
    const receipt = await tx.wait();

    // Store in your database: userId, strategyDescription, commitmentId, windowEnd
    return {
      commitmentId: this.parseCommitmentId(receipt),
      strategyHash,
      windowEnd: new Date(Date.now() + windowDays * 86400 * 1000),
    };
  }

  // Called after forward window closes
  async issueCertificate(commitmentId, results, metadataURI) {
    const resultsHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(results))
    );

    const tx = await this.vbo.revealAndAttest(
      commitmentId,
      resultsHash,
      results.return_bps,
      results.regime,
      metadataURI,
      "Platform-attested via " + YOUR_PLATFORM_NAME,
      "0x"
    );

    const receipt = await tx.wait();
    return this.parseCertificateId(receipt);
  }
}
```

---

## Revenue Share Model

Platforms integrating VBO at the protocol level pay **20% revenue share** on certificate revenue generated through their platform.

| Certificate Tier | Price | Platform Share | Aevum Share |
|---|---|---|---|
| Basic | $500 | $400 (80%) | $100 (20%) |
| Professional | $1,500 | $1,200 (80%) | $300 (20%) |
| Institutional | $5,000 | $4,000 (80%) | $1,000 (20%) |

To discuss platform integration, contact: jonathan@aevumprotocol.io

---

## Events

Listen for these events to track VBO activity:

```javascript
// New strategy committed
vbo.on("StrategyCommitted", (commitmentId, submitter, strategyHash, windowEnd, bond, priceAtCommit, consensusScore) => {
  console.log("New commitment:", { commitmentId, submitter, windowEnd });
});

// Certificate issued
vbo.on("CertificateIssued", (certId, commitmentId, agent, strategyHash, returnBps, regime, priceAtCommit, priceAtWindowEnd) => {
  console.log("Certificate issued:", { certId, returnBps, regime });
});
```

---

## Querying via The Graph

All VBO events are indexed at:
```
https://api.studio.thegraph.com/query/1757640/aevum-protocol/v0.0.1
```

```graphql
# Get all issued certificates
{
  vBOCertificates(orderBy: issuedAt, orderDirection: desc) {
    id
    certificateId
    strategyHash
    returnBps
    regime
    issuedAt
    agent {
      owner
      reputationScore
    }
  }
}

# Get all pending commitments
{
  vBOCommitments(where: { certificate: null }) {
    id
    commitmentId
    submitter {
      owner
    }
    strategyHash
    windowEnd
    bondAmount
  }
}
```

---

## Support

- GitHub: [github.com/AevumProtocol/contracts](https://github.com/AevumProtocol/contracts)
- Email: jonathan@aevumprotocol.io
- Website: [aevumprotocol.io](https://aevumprotocol.io)
- Demo: [aevum-frontend.vercel.app](https://aevum-frontend.vercel.app)
