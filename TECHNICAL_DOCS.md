# Aevum Protocol — Technical Documentation
**Version:** 1.0  
**Date:** June 30, 2026  
**Network:** Ethereum Sepolia (testnet) — mainnet pending Zenith audit  

---

## Overview

Aevum Protocol is a blockchain infrastructure layer for autonomous AI agents. It provides on-chain identity, reputation scoring, economic primitives, and governance — purpose-built for AI agents operating autonomously across DeFi and Web3 protocols.

---

## Contract Stack

### 1. AgentIdentity.sol
**Address:** `0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B`  
**Purpose:** On-chain identity registry for AI agents.

**Key state:**
- `_agents` — mapping of agentId → AgentRecord struct
- `_ownerToAgentId` — mapping of wallet → agentId (one agent per wallet)
- `reputationController` — address authorized to call `updateReputation()`
- `approvedCertIssuers` — addresses allowed to issue performance certificates

**Key functions:**
- `registerAgent(bytes32 strategyHash, string metadataURI, ExecutionPolicy policy)` — registers a new agent, agentId starts at 1, 0 is sentinel
- `updateReputation(uint256 agentId, uint256 newScore)` — only callable by `reputationController`
- `addPerformanceCert(uint256 agentId, bytes32 certHash, string metadataURI)` — only callable by approved cert issuers
- `deactivateAgent(uint256 agentId)` — clears both `_agents[id].owner` and `_ownerToAgentId[wallet]`
- `getAgentByAddress(address)` — returns 0 if not registered

**Access control:** Owner sets `reputationController` and `approvedCertIssuers`. One agent per wallet enforced.

---

### 2. ReputationOracle.sol
**Address:** `0xAda16c3ca238BE164E716F280D3D184269e4A0A9`  
**Purpose:** Read-only gateway that other protocols query to check agent authorization.

**Key state:**
- `defaultMinScore` — score floor for unregistered protocols (default: 100)
- `protocolMinScores` — per-protocol score thresholds
- `registeredProtocols` — whitelist of protocols with custom thresholds

**Key functions:**
- `isAgentAuthorizedView(address agent, address protocol)` — view function, returns bool, used by AgentVault and AgentMarketplace
- `isAgentAuthorized(address agent, address protocol)` — state-changing version, emits events
- `checkScore(address agent)` — returns 0 for unregistered agents (does not revert)
- `registerProtocol(address, uint256 minScore)` — requires minScore > 0
- `deregisterProtocol(address)` — removes protocol from registry
- `setDefaultMinScore(uint256)` — requires > 0

**Note:** Both AgentVault and AgentMarketplace use `isAgentAuthorizedView` (view) not `isAgentAuthorized` (state-changing) to avoid reentrancy vectors.

---

### 3. ReputationController.sol
**Address:** `0x09D6D8Bb81140E8395Af7b6bc954b0Ab053dd121`  
**Purpose:** Multi-oracle consensus system for updating agent reputation scores.

**Key state:**
- `authorizedOracles` — mapping of oracle addresses
- `oracleCount` — current oracle count (minimum 2 enforced)
- `proposalExpiry` — proposals expire after 7 days (default)
- `minVotingWindow` — minimum 1 hour before execution after creation
- `MAX_SCORE_DELTA` — 200 points maximum change per proposal

**Key functions:**
- `proposeReputationUpdate(uint256 agentId, uint256 newScore)` — creates proposal, auto-approves by proposer
- `approveProposal(uint256 proposalId)` — oracle approval, executes when threshold met
- `cancelProposal(uint256 proposalId)` — owner or any oracle can cancel
- `requiredApprovals()` — dynamic: `(oracleCount / 2) + 1`

**Consensus logic:** Proposals auto-execute when `approvals >= requiredApprovals()` AND `block.timestamp >= createdAt + minVotingWindow`. Score delta capped at 200 points per update.

---

### 4. AgentVault.sol
**Address:** `0x58B0f345212c147eC67697609aE00ddee951C47c`  
**Purpose:** ETH treasury gated by reputation. Authorized agents can withdraw up to their limit per cooldown period.

**Key state:**
- `totalDeposited` — tracks all intentional deposits (deposit() + receive())
- `defaultWithdrawLimit` — per-tx ETH ceiling for agents without custom limit
- `cooldownPeriod` — time between withdrawals (default: 1 day, minimum: 1 hour)
- `agentInitialized` — tracks whether an agent has ever withdrawn (cooldown bypass on first withdrawal is intentional)
- `blacklistedAgentIds` — agentId-based blacklist (in addition to address-based)

**Key functions:**
- `deposit()` / `receive()` — both increment `totalDeposited`
- `withdraw(uint256 amount)` — checks oracle authorization, limit, cooldown
- `rescueETH()` — owner only, sends `address(this).balance - totalDeposited` (surplus only)
- `getSurplusETH()` — returns 0 if balance <= totalDeposited (no underflow)

**Accounting invariant:** `totalDeposited` always equals sum of all deposits minus sum of all withdrawals. ETH sent via SELFDESTRUCT lands in surplus bucket (rescuable without touching agent funds).

---

### 5. AgentMarketplace.sol
**Address:** `0xff7A5eBb3ab2C1E92A58B7b6F25CCB6588785Af9`  
**Purpose:** On-chain service marketplace. Agents list services, clients pay in ETH, escrow held in contract.

**Key state:**
- `platformFeeBps` — fee in basis points (default: 250 = 2.5%, min: 50, max: 1000)
- `pendingFees` — pull payment mapping for owner fees
- `maxJobDuration` — constant 90 days (emergency cancel threshold)
- `minCancelDelay` — configurable (default: 7 days)
- `minJobDuration` — configurable (default: 1 hour)

**Job lifecycle:** `InProgress` → `Completed` | `Disputed` | `Cancelled`

**Key functions:**
- `createListing()` — requires oracle authorization at listing time
- `hireAgent()` — checks oracle authorization again at hire time (agent could be de-authorized between listing and hire)
- `completeJob()` — client confirms completion, fee goes to `pendingFees[owner]`
- `disputeJob()` — client raises dispute, starts `maxDisputeWindow` timer
- `resolveDispute(bool favorAgent)` — owner resolves, fee goes to `pendingFees[owner]`
- `claimExpiredDispute()` — agent claims after `maxDisputeWindow` if unresolved
- `cancelJob()` — client cancels after `minCancelDelay`, full refund, no fee
- `emergencyCancel()` — owner cancels stuck jobs after `maxJobDuration`
- `withdrawFees()` — owner claims accumulated fees

**Fee flow:** All payment paths (completeJob, resolveDispute, claimExpiredDispute) use pull pattern for owner fees. Agent/client payments are push (immediate ETH transfer).

---

### 6. AEVToken.sol
**Address:** `0x1C47FE8AE5531008Ec57fC60C7498Ebf2c2Ac920`  
**Purpose:** Native protocol token. Inherits OpenZeppelin ERC20Votes for governance snapshot voting.

**Key state:**
- `MAX_SUPPLY` — 1,000,000,000 × 10^18 (hard cap, enforced in `_mintVotes`)
- `BURN_BPS` — 5000 (50% of fees burned)
- `transfersEnabled` — false at deployment
- `paused` — emergency pause (independent of transfersEnabled)
- `isExcludedFromFee` — fee exclusion (does NOT grant transfer permission)
- `isWhitelisted` — transfer permission before `enableTransfers()` (separate from fee exclusion)

**Fee math (two independent calculations, not chained):**
**Token allocations at deployment:**
- 30% Ecosystem — `_ecosystemWallet`
- 20% DAO Treasury — `_daoTreasuryWallet`
- 15% Community — `_communityWallet`
- 15% Team — `_teamWallet`
- 10% Liquidity — `_liquidityWallet`
- 10% Investors — `_investorWallet`

**ERC20Votes:** Inherits OpenZeppelin v5 ERC20Votes. Users must self-delegate (`delegate(address)`) to activate voting power. Snapshot at `block.number - 1` at proposal creation time.

---

### 7. TokenVesting.sol
**Address:** `0x482C01015E7a845BBd923d18eF627D90448b9d2c`  
**Purpose:** Time-locked vesting for team and investor token allocations.

**Key constraints:**
- `MAX_VESTING_DURATION` — 4 years (constant)
- Cliff must be ≤ vesting duration
- `revoke()` sends vested-but-unreleased tokens to beneficiary, remaining to owner

**CEI pattern:** Both `release()` and `revoke()` update state before external transfers. `schedule.revoked = true` and `schedule.released += releasable` set before any `aevToken.transfer()` calls.

**Key functions:**
- `createSchedule()` — owner only, checks contract has sufficient token balance
- `release()` — beneficiary claims vested tokens
- `revoke()` — owner cancels schedule, distributes proportionally
- `changeBeneficiary()` — beneficiary or owner can update beneficiary address

---

### 8. AevumDAO.sol
**Address:** `0x11205fdFC73Bc7527C2fDc68E7369fcC1f6144dD`  
**Purpose:** Token-holder governance with snapshot voting and timelock execution.

**Key parameters:**
- `MIN_PROPOSAL_TOKENS` — 1,000,000 AEV voting power (past votes, not live balance)
- `MIN_QUORUM` — 10,000,000 AEV (constant floor, `setQuorum` enforces this minimum)
- `votingPeriod` — 7 days (default)
- `timelockDelay` — 48 hours (default, minimum 24 hours)
- `executionDeadline` — 30 days (queued proposals expire after this)
- `approvedTargets` — whitelist of contracts that can be called via governance

**Proposal lifecycle:** `Active` → `Queued` | `Failed` → `Executed` | `Expired` | `Cancelled`

**Flash loan protection:** `propose()` uses `getPastVotes(msg.sender, block.number - 1)`. Flash loans cannot affect past block balances.

**Cancel restrictions:** Only proposer can cancel `Queued` proposals. Owner OR proposer can cancel `Active` proposals. Owner cannot veto passed proposals.

**Execution:** State set to `Executed` and event emitted BEFORE `target.call(callData)`. Target must be in `approvedTargets`.

---

## Deployment Order (Dependency Graph)
**Post-deploy setup required:**
- `AgentIdentity.setReputationController(ReputationController.address)`

---

## Technology Stack

| Component | Version |
|---|---|
| Solidity | ^0.8.28 |
| EVM Target | Cancun (required for OZ v5 ERC20Votes `mcopy` opcode) |
| OpenZeppelin | v5 (ERC20Votes, EIP712) |
| Hardhat | 2.22 |
| Optimizer | 200 runs, viaIR: true |
| Node.js | v26.0.0 |

---

## External Dependencies

- **OpenZeppelin v5** — ERC20Votes, EIP712 (AEVToken only). All other contracts are dependency-free vanilla Solidity.
- **Alchemy** — Sepolia RPC for deployment and frontend
- **Etherscan** — source verification (all 8 contracts verified)

---

*Aevum Protocol — github.com/AevumProtocol/contracts*  
*Zenith Security audit in progress — Mario Poneder + adriro*
