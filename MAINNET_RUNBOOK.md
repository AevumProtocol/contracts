# Aevum Protocol — Mainnet Deployment Runbook

**Status:** Active — September 4, 2026 mainnet launch.
**Network:** Ethereum Mainnet
**Deployer:** 0x7Ba97591b0D50D093c41aE2898f44b32d0A97769

## Contracts deploying September 4 (VBO Core only)

| Contract | Description |
|---|---|
| AgentIdentity | Required by VBO for cert issuance and agent registration |
| ReputationOracle v2 | Required by VBO for agent authorization |
| ReputationController v2 | Required by VBO for reputation management |
| VBO v2 (Atlas Oracle) | Hero product — issues certificates |

## Post-funding deploys (separate runbook)
AEVToken, TokenVesting, AevumDAO, AgentVault, AgentMarketplace — do NOT deploy these on September 4.

---

## Pre-deployment checklist

- [ ] Deployer wallet has at least 0.02 ETH on mainnet
- [ ] Mainnet Alchemy RPC URL in .env as MAINNET_RPC_URL
- [ ] Etherscan API key in .env as ETHERSCAN_API_KEY
- [ ] Atlas API key in .env as ATLAS_API_KEY
- [ ] Internal security review complete

---

## Step 1 — Deploy contracts

```bash
npx hardhat run scripts/deployMainnet.js --network mainnet
```

Save the output — you need all 4 addresses. They are also written to `mainnet-addresses.json`.

---

## Step 2 — Wire the contracts

This step is critical. Without it, every `revealAndAttest` call reverts.

```bash
# Set these from mainnet-addresses.json output
AGENT_IDENTITY=0x...
REPUTATION_ORACLE=0x...
REPUTATION_CONTROLLER=0x...
VBO_V2=0x...

node -e "
require('dotenv').config();
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

async function wire() {
  const agentIdentity = new ethers.Contract('${AGENT_IDENTITY}', [
    'function setReputationController(address) external',
    'function setApprovedCertIssuer(address, bool) external',
    'function registerOracle(address) external',
  ], wallet);

  // 1. Set ReputationController on AgentIdentity
  await (await agentIdentity.setReputationController('${REPUTATION_CONTROLLER}')).wait();
  console.log('✓ ReputationController set');

  // 2. CRITICAL: Approve VBO as cert issuer -- without this revealAndAttest reverts
  await (await agentIdentity.setApprovedCertIssuer('${VBO_V2}', true)).wait();
  console.log('✓ VBO approved as cert issuer');

  // 3. Register ReputationOracle
  await (await agentIdentity.registerOracle('${REPUTATION_ORACLE}')).wait();
  console.log('✓ ReputationOracle registered');

  // 4. Add deployer as attestor on VBO
  const vbo = new ethers.Contract('${VBO_V2}', [
    'function addAttestor(address) external',
  ], wallet);
  await (await vbo.addAttestor(wallet.address)).wait();
  console.log('✓ Deployer added as attestor');
}
wire().catch(console.error);
"
```

---

## Step 3 — Verify on Etherscan

```bash
npx hardhat verify --network mainnet AGENT_IDENTITY_ADDRESS
npx hardhat verify --network mainnet REPUTATION_ORACLE_ADDRESS AGENT_IDENTITY_ADDRESS
npx hardhat verify --network mainnet REPUTATION_CONTROLLER_ADDRESS AGENT_IDENTITY_ADDRESS REPUTATION_ORACLE_ADDRESS
npx hardhat verify --network mainnet VBO_V2_ADDRESS AGENT_IDENTITY_ADDRESS
```

---

## Step 4 — Smoke test

1. Register an agent on AgentIdentity via frontend
2. Go to app.aevumprotocol.io/vbo
3. Use promo code ALGOCHAINS2026
4. Commit a strategy — confirm MetaMask pops up and tx confirms
5. Check leaderboard — commitment appears with countdown
6. Confirm confirmation email arrives at attestation@aevumprotocol.io

---

## Step 5 — Update frontend to mainnet

Update `src/contracts.js` with mainnet addresses:
- Change `SEPOLIA_CHAIN_ID` to `MAINNET_CHAIN_ID = 1`
- Update all contract addresses
- Change `ALCHEMY_RPC` to mainnet URL
- Change `ETHERSCAN_BASE` to `https://etherscan.io`
- Remove SEPOLIA badge — replace with MAINNET

```bash
cd ~/Desktop/aevum_social_bot/aevum-frontend && vercel --prod
```

---

## Step 6 — Send launch announcement

```bash
cd ~/Desktop/aevum_social_bot/aevum-contracts
node scripts/sendLaunchAnnouncement.js
# Type SEND to confirm
```

---

## Emergency procedures

**Pause all withdrawals:** `vbo.setWithdrawPaused(true)` (owner only)
**Revoke a certificate:** `vbo.revokeCertificate(certId, reason)` (owner only)
**Transfer ownership:** `vbo.transferOwnership(newOwner)` then `newOwner.acceptOwnership()` (two-step)

---

## Security notes

- All contracts owned by deployer EOA at launch. Gnosis Safe migration within 30 days.
- Atlas Oracle signer is hardcoded. Key rotation requires contract upgrade.
- No third-party audit completed. Hexens audit restarts at first investment close.
- Known limitations: github.com/AevumProtocol/contracts/blob/main/KNOWN_LIMITATIONS.md
