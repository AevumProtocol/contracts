# Aevum Protocol — Known Limitations & Design Decisions
**Prepared for:** Hexens (Kasper Zwijsen)  
**Date:** July 20, 2026 (updated)
**Legal entity:** Aevum Protocol Inc., Delaware C-corp, incorporated July 20, 2026  
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


### 11. Oracle trust concentration — V1 reputation scores are ADVISORY
**This is the most important framing clarification before Hexens kickoff.**

V1 reputation scores are advisory, not trustless. At launch there is a single trusted operator (the deployer). The `ReputationController` multi-oracle architecture exists and is correctly implemented, but with only 2 oracles (deployer + dead address on testnet), the system is operationally centralized.

Do NOT use "multi-oracle consensus" language in marketing or external docs until the operator set genuinely decentralizes. Hexens should evaluate this contract in the context of a single-operator trust model, not a decentralized consensus model.

**V1→V2 transition trigger uses AND logic, not OR.** Multi-oracle consensus only activates when ALL THREE conditions are met simultaneously:
- (a) 3+ independent operators onboarded
- (b) Quorum set to require 2-of-3 minimum agreement
- (c) Each operator active for 30+ days

Time alone cannot trigger the transition. A 6-month timer hitting before operators are onboarded would change the label without changing the reality. The contract is correct — this is an operational framing issue, not a code issue.

### 12. AgentVault exposure cap recommendation
Until the oracle operator set genuinely distributes beyond a single trusted party, per-agent vault exposure should be treated as carrying concentrated trust risk. Recommended: cap individual agent vault exposure at 1 ETH until V2 oracle decentralization is live.

This limits blast radius if the trust assumption breaks. Flagged to Hexens as a pre-kickoff risk reduction consideration — not a missing feature, just a safety bound appropriate for the V1 trust model.

**Status:** Under evaluation — may add as a configurable owner-settable cap before audit kickoff.

### 13. Sybil resistance gap
Current `ReputationOracle` accrues score from interaction history without sufficient cost to fake interactions. A stake deposit is necessary but not sufficient — a slashable bond or economically expensive-to-counterfeit activity proof is needed to make sybil farming irrational rather than just expensive.

There is no clean V1 answer to this. The gap is:
- Stake deposit creates cost to register
- But repeated self-interactions can inflate score without real counterparty risk
- Slashable bond (V2) is the correct fix — reputation is only worth what it costs to fake

Flagged explicitly for Hexens as a known architectural gap. V2 roadmap item.

### 14. Oracle operator fail-safe
`ReputationController` has quorum requirements but no automatic manipulation detection. Manual pause via owner `AccessControl` exists but is reactive, not preventive. If the operator set is small enough that collusion is cheap (as it is in V1 with 2 oracles), quorum alone is insufficient protection against coordinated reputation manipulation.

Mitigating factors in V1: single operator means collusion is moot (there is no second party to collude with). This becomes a real concern at 2-3 operators before genuine decentralization.

### 15. Stake deposit governance-adjustability
Needs verification: if stake deposit is hardcoded in `AgentIdentity.sol` rather than governance-adjustable, this should be flagged as a V2 addition. A hardcoded deposit amount cannot respond to ETH price changes or evolving sybil resistance requirements.

**Action item:** Verify with `grep -i "stake\|deposit" contracts/AgentIdentity.sol` before Hexens kickoff.

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
6. **Oracle trust concentration** — V1 is single-operator in practice. Evaluate all reputation-gated paths under this assumption, not multi-oracle consensus.
7. **Sybil resistance** — stake deposit alone does not prevent score inflation via self-interactions. No clean V1 fix. Evaluate blast radius if score is gamed.

---

## Out of Scope

- Gas optimization (V2)
- Gas abstraction layer (whitepaper item, V2)
- Frontend/off-chain components
- Deployment scripts

---

*Aevum Protocol — github.com/AevumProtocol/contracts*

### 17. AgentVault v1 is a shared treasury, not isolated per-agent capital pools
AgentVault v1 operates as a reputation-gated shared treasury, not isolated per-agent capital pools. There is no `agentBalance` mapping — agents draw from a shared pool subject to per-transaction limits (`agentWithdrawLimits`), lifetime cumulative withdrawal caps (`agentTotalWithdrawn`), and the `maxAgentExposure` ceiling. Outstanding exposure per agent is not tracked — withdrawn ETH has no settlement or repayment path back to an agent's account. True per-agent balance isolation with deposit assignment, outstanding exposure tracking, and settlement paths is a v2 architectural upgrade. Any marketing language describing "isolated capital pools per agent" reflects the intended v2 design, not current v1 contract behavior.

### 18. Operator independence not cryptographically enforced (addendum to #11)
Operator independence is not cryptographically enforced in v1. The 2-of-3 quorum security assumption depends entirely on operators being genuinely independent entities. Three keys controlled by the same party collapses to single-operator trust with false decentralization optics. Verification of independence is operational not technical at this stage.

### 19. Sybil shotgun attack on pre-commitment (VBO)
The pre-commitment hash prevents post-hoc modification of a single strategy but does not prevent committing 1000 variations, surfacing the winner, and burying the rest. Each commitment costs gas and ties to a registered AgentIdentity — creating a cost floor and a permanent on-chain record of every commitment that identity ever made, including the ones never surfaced. A sophisticated verifier could examine full commitment history rather than just the certificate being presented. However, cost-of-gas is a weak deterrent at scale, and placing the burden of history-checking back on the verifier undermines the system's core value proposition.

Real fix: commitment fee + slashing mechanism — post a bond at commitment time, burn or slash if multiple variations from the same identity are submitted within a scoring window. V2 research item alongside the hybrid reputation model.

### 20. Silent abandonment / survivorship bias via non-reveal
An identity that pre-commits multiple strategies can observe the forward window going against some of them and simply never reveal or settle those variants. If reveal is optional, survivorship bias re-enters through a side door — no detection needed, no double-dip required. Slashing on non-reveal-by-deadline closes this without requiring adversarial proof: bond burns automatically on expiry regardless of whether a violation is proven. Not yet implemented — v2 research item, priority addition to VBO spec.

### 21. VBO Certificate return methodology — TWR vs simple return
Certificate #001 was originally attested with a raw return of +6.93% (693 bps). This figure includes $22.50 of new capital injected during the measurement window, which inflates returns for any accumulation/DCA strategy — any bot that keeps depositing shows green even through a drawdown.

The correct metric is Time-Weighted Return (TWR), which eliminates the effect of external cash flows so the figure reflects actual strategy performance. TWR for Certificate #001 is +3.82% (382 bps), versus BTC buy-and-hold of +3.72% over the same window — alpha of approximately 10 basis points.

Going forward, all VBO certificates will report TWR as the primary metric alongside: (1) raw value change in USD, (2) capital deployed during window, and (3) net alpha over BTC buy-and-hold. TWR is the institutional standard used by allocators to compare strategies fairly. The on-chain attested results hash reflects the original raw calculation — methodology corrections are applied at the display layer.

Additionally: the window for Certificate #001 ran 8 days (July 31 → August 8), not 7 as labeled. The regime was classified as Neutral (BTC +3.72% during window) rather than Bear — the bot's internal regime state was Bear based on the 200-day MA, but market action during the window was positive.
