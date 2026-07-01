# Aevum Protocol — Known Limitations & Design Decisions
**Prepared for:** Zenith Security (Mario Poneder, adriro)  
**Date:** June 30, 2026  
**Commit:** See SOW commit hash 63f7d568bf814ae23f07559990e0d7f7cb96adc0

---

## Intentional Design Decisions

### 1. Single EOA deployer wallet
All 8 contracts are currently owned by deployer wallet `0xb57dC33a8E2B54ed025C28ef2080648f35875a2E`. 
This is a known risk for mainnet. Before mainnet deployment, ownership will be transferred to a Gnosis Safe multisig. The mainnet deployment runbook includes this step explicitly.

### 2. Dead oracle address in ReputationController
The constructor requires 2 oracle addresses. On Sepolia testnet, `oracle2` is set to `0x000000000000000000000000000000000000dEaD`. This is intentional for testnet demonstration purposes. On mainnet, both oracles will be real addresses controlled by trusted parties.

### 3. ReputationController dynamic majority
`requiredApprovals()` returns `(oracleCount / 2) + 1`. With 2 oracles this means both must approve. This is intentional — unanimous consent at the minimum oracle count is the most conservative possible threshold.

### 4. AevumDAO target whitelist
`propose()` requires `approvedTargets[target] == true`. No targets are whitelisted on testnet deployment. This is intentional — governance proposals can only execute against pre-approved contracts. On mainnet, the 8 protocol contracts will be approved targets.

### 5. AEVToken transfers disabled by default
`transfersEnabled = false` at deployment. Only whitelisted addresses (allocation wallets) can transfer. This is intentional — prevents speculation before the protocol is live. `enableTransfers()` is called by owner at TGE.

### 6. ERC20Votes snapshot voting
`vote()` uses `getPastVotes(voter, proposal.snapshotBlock)` where `snapshotBlock = block.number - 1` at proposal creation. This is the standard OpenZeppelin Votes pattern. Users must self-delegate before the snapshot block to have voting power.

### 7. AgentIdentity `reputationController` post-deploy setup
`reputationController` starts as `address(0)` and must be set via `setReputationController()` after deployment. Until set, `updateReputation()` reverts. The deployment script sets this atomically. This is a known deployment dependency, not a vulnerability.

### 8. Per-transaction withdraw limit in AgentVault
`agentWithdrawLimits` is a per-transaction ceiling, not a daily reset. `agentTotalWithdrawn` accumulates lifetime. This is intentional — the semantics are documented. If daily limits are needed, this is flagged as a V2 feature.

### 9. Cooldown bypass on first withdrawal
First-time withdrawers bypass the cooldown check because `agentInitialized[address]` defaults to false. After the first withdrawal, `agentInitialized` is set to true and cooldown enforced on all subsequent withdrawals. This is intentional — the first withdrawal establishes the baseline timestamp.

### 10. AgentMarketplace pull payment for owner fees
Platform fees accumulate in `pendingFees[owner]` and require a separate `withdrawFees()` call. This is intentional — prevents fee payment failure from bricking job completions.

---

## Accepted Deferrals (V2)

These were raised during internal review and explicitly deferred:

| ID | Contract | Finding | Disposition |
|---|---|---|---|
| LOW-02 | ReputationOracle | `defaultMinScore = 100` equals genesis agent score | V2: raise default |
| LOW-03 | AgentVault | Withdraw limit is per-tx, semantics unclear | Documented above |
| LOW-05 | AgentMarketplace | No cap on listings per agent | V2: add cap |
| LOW-06 | ReputationController | No proposal expiry window | V2: add expiry |
| INFO | TokenVesting | `revoke()` transfer returns not checked | Low risk: AEVToken reverts on failure |
| INFO | AgentMarketplace | `cancelJob` refunds full amount (no fee) | Intentional |
| INFO | AevumDAO | Snapshot at `block.number - 1` | Standard OZ pattern |

---

## Known Attack Surfaces (Auditor Focus Areas)

1. **ReputationController consensus** — can a single oracle manipulate reputation with minimum oracle count?
2. **AevumDAO execution** — arbitrary `target.call(callData)` after timelock. Approved target whitelist is the primary guard.
3. **AgentVault accounting** — `totalDeposited` tracking correctness across deposit/withdraw/rescueETH paths.
4. **AEVToken fee math** — two-step fee calculation: `fee = (amount * feeBps) / 10000` then `burnAmount = (fee * BURN_BPS) / 10000`. Slither flags as divide-before-multiply but these are independent calculations, not chained.
5. **ERC20Votes integration** — `_update()` override correctness, `getPastVotes()` snapshot consistency.

---

## Out of Scope

- Gas optimization (V2)
- Gas abstraction layer (whitepaper item, V2)
- Frontend/off-chain components
- Deployment scripts

---

*Aevum Protocol — github.com/AevumProtocol/contracts*
