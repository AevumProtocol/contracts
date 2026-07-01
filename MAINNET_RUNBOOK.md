# Aevum Protocol — Mainnet Deployment Runbook
**Status:** Draft — pending Zenith Security audit completion  
**Target:** ETHOnline 2026 (September 4–16)  

---

## Pre-Deployment Checklist

### Security
- [ ] Zenith Security audit complete — all findings resolved
- [ ] Final Slither pass on mainnet-targeted code — 0 HIGH/MEDIUM
- [ ] Code4rena community audit period closed
- [ ] All audit findings documented and responses written

### Infrastructure
- [ ] Gnosis Safe multisig deployed on Ethereum mainnet
  - Recommended: 3-of-5 signers minimum
  - Signers: founder + advisors (not same device)
  - Safe address recorded before deployment begins
- [ ] Mainnet Alchemy RPC endpoint configured
- [ ] Etherscan mainnet API key ready
- [ ] Deployer wallet funded (estimate: ~0.5 ETH for gas)
- [ ] Hardware wallet connected (Ledger/Trezor recommended for mainnet)

### Token
- [ ] All 6 allocation wallet addresses confirmed with recipients
- [ ] Vesting schedules agreed and documented
- [ ] TokenVesting contract funded with team + investor allocations before cliff starts

---

## Gas Estimates (Ethereum Mainnet)

| Contract | Estimated Gas | @ 20 gwei | @ 50 gwei |
|---|---|---|---|
| AgentIdentity | ~800,000 | 0.016 ETH | 0.040 ETH |
| AEVToken | ~2,500,000 | 0.050 ETH | 0.125 ETH |
| ReputationOracle | ~600,000 | 0.012 ETH | 0.030 ETH |
| AgentVault | ~700,000 | 0.014 ETH | 0.035 ETH |
| AgentMarketplace | ~900,000 | 0.018 ETH | 0.045 ETH |
| ReputationController | ~750,000 | 0.015 ETH | 0.038 ETH |
| TokenVesting | ~650,000 | 0.013 ETH | 0.033 ETH |
| AevumDAO | ~800,000 | 0.016 ETH | 0.040 ETH |
| **Total** | **~7,700,000** | **~0.154 ETH** | **~0.386 ETH** |

**Recommendation:** Budget 0.5 ETH for deployment + post-deploy setup transactions.

---

## Deployment Steps

### Step 1 — Deploy AgentIdentity
```bash
npx hardhat run scripts/deploy.js --network mainnet
```
Record address. Do NOT call `setReputationController` yet.

### Step 2 — Deploy AEVToken
```bash
npx hardhat run scripts/deployToken.js --network mainnet
```
Provide all 6 real allocation wallet addresses (NOT deployer wallet).  
**Verify immediately** — token supply is minted in constructor.

### Step 3 — Deploy ReputationOracle
```bash
npx hardhat run scripts/deployOracle.js --network mainnet
```
Constructor arg: AgentIdentity address from Step 1.

### Step 4 — Deploy AgentVault
```bash
npx hardhat run scripts/deployVault.js --network mainnet
```
Constructor args: ReputationOracle address, defaultWithdrawLimit (recommend: 0.1 ETH).

### Step 5 — Deploy AgentMarketplace
```bash
npx hardhat run scripts/deployMarketplace.js --network mainnet
```
Constructor arg: ReputationOracle address.

### Step 6 — Deploy ReputationController
```bash
npx hardhat run scripts/deployReputationController.js --network mainnet
```
Constructor args: AgentIdentity address, oracle1 address, oracle2 address.  
**Both oracle addresses must be real, distinct, non-zero addresses on mainnet.**

### Step 7 — Deploy TokenVesting
```bash
npx hardhat run scripts/deployVesting.js --network mainnet
```
Constructor arg: AEVToken address.

### Step 8 — Deploy AevumDAO
```bash
npx hardhat run scripts/deployDAO.js --network mainnet
```
Constructor args: AEVToken address, quorumVotes (10,000,000 × 10^18 minimum).

---

## Post-Deployment Setup

### Step 9 — Wire AgentIdentity to ReputationController
```bash
# Call AgentIdentity.setReputationController(ReputationController.address)
```
This is the critical wiring step. Until this is done, reputation updates will revert.

### Step 10 — Transfer all ownership to Gnosis Safe
```bash
# Call transferOwnership(GNOSIS_SAFE_ADDRESS) on all 8 contracts
# Order doesn't matter, but complete all 8 before announcing
```
Contracts to transfer:
- AgentIdentity
- ReputationOracle
- AgentVault
- AgentMarketplace
- ReputationController
- TokenVesting
- AevumDAO
- AEVToken (transfer last — verify Safe can call enableTransfers())

### Step 11 — Approve DAO governance targets
```bash
# From Gnosis Safe:
# AevumDAO.approveTarget(AgentIdentity.address, true)
# AevumDAO.approveTarget(ReputationOracle.address, true)
# AevumDAO.approveTarget(AgentVault.address, true)
# AevumDAO.approveTarget(AgentMarketplace.address, true)
# AevumDAO.approveTarget(ReputationController.address, true)
# AevumDAO.approveTarget(AevumDAO.address, true)
```

### Step 12 — Register protocols in ReputationOracle
```bash
# From Gnosis Safe:
# ReputationOracle.registerProtocol(AgentVault.address, 100)
# ReputationOracle.registerProtocol(AgentMarketplace.address, 200)
```

### Step 13 — Fund TokenVesting contract
Transfer team and investor AEV allocations to TokenVesting contract address before creating schedules.

### Step 14 — Create vesting schedules
```bash
# TokenVesting.createSchedule(teamWallet, amount, cliff, duration, "Team")
# TokenVesting.createSchedule(investorWallet, amount, cliff, duration, "Investors")
```

### Step 15 — Verify all 8 contracts on Etherscan
```bash
npx hardhat verify --network mainnet <address> <constructor args>
```

### Step 16 — Enable AEV token transfers
```bash
# From Gnosis Safe:
# AEVToken.enableTransfers()
```
This is the TGE moment. Do not call until all other steps are complete.

---

## Admin Role Structure (Mainnet)

| Role | Held By | Actions |
|---|---|---|
| Contract owner (all 8) | Gnosis Safe multisig | All admin functions |
| ReputationController oracle 1 | Founder wallet (hardware wallet) | Propose/approve reputation updates |
| ReputationController oracle 2 | Trusted advisor wallet | Approve reputation updates |
| AEV fee collector | Gnosis Safe | Receives fee collector share |

---

## Rollback Plan

If a critical issue is discovered post-deployment:

1. **Pause AEVToken** — `pauseTransfers()` from Gnosis Safe
2. **Disable vault withdrawals** — `blacklistAgent` on all agents or set `defaultWithdrawLimit` to 0
3. **Halt marketplace** — `setPlatformFee` to maximum to deter use, or pause via governance
4. **Do NOT self-destruct** — contracts cannot be destroyed, only neutered via owner functions
5. Contact Zenith Security for emergency response guidance

---

## Post-Launch Monitoring

- Monitor `AgentRegistered` events on AgentIdentity
- Monitor `ReputationUpdated` events for anomalous score changes
- Monitor `Withdrawn` events on AgentVault for large withdrawals
- Monitor `JobCreated` and `DisputeResolved` on AgentMarketplace
- Set up Etherscan email alerts on all 8 contract addresses

---

*Aevum Protocol — github.com/AevumProtocol/contracts*
