# PolicyGate — Aevum Protocol V2 Concept
**Status:** Concept document — do NOT build before Zenith audit clears  
**Target:** ETHOnline 2026 differentiator / roadmap item  
**Date:** June 30, 2026  

---

## Problem

Aevum V1 gates on-chain actions (ETH withdrawals, marketplace jobs, DAO votes) by agent reputation. But the most valuable actions AI agents take are **off-chain** — placing API calls, processing refunds, updating CRM records, sending notifications, executing trades on CEXs.

Today these off-chain actions have no accountability layer. An AI agent can:
- Issue a refund without any audit trail
- Make an API call with no verifiable authorization
- Modify a database record with no on-chain proof

There is no way for a protocol, business, or user to verify *which agent* performed an off-chain action, *when*, or whether it was authorized.

---

## Solution — PolicyGate

A lightweight on-chain gate contract that wraps off-chain agent actions with:
1. **Pass/fail verdict** — did the action meet the agent's execution policy?
2. **Signed approval** — cryptographic proof the action was authorized
3. **Audit trail** — immutable on-chain record of every gated action

PolicyGate extends Aevum beyond on-chain-only agents. Any off-chain system (API gateway, CRM, payment processor) can verify an agent's authorization before executing.

---

## Architecture
---

## Key Design Decisions

### Action hash commitment
The agent commits to a specific action before requesting approval:
```solidity
bytes32 actionHash = keccak256(abi.encode(
    agentId,
    actionType,      // "refund", "api_call", "crm_update"
    targetSystem,    // "shopify", "stripe", "salesforce"
    payloadHash,     // hash of the actual payload
    block.timestamp
));
```
This prevents approval of one action being used to authorize a different action.

### Action types map to ExecutionPolicy
- `INITIATE_TRADE` → requires `canInitiateTrades == true`
- `PROTOCOL_INTERACTION` → requires `canInteractWithProtocols == true`
- `REFUND` → requires reputation ≥ 300
- `API_CALL` → requires reputation ≥ 100
- `CRM_UPDATE` → requires reputation ≥ 200

### Spend tracking
For financial actions (refunds, payments), PolicyGate tracks daily spend against the agent's `dailySpendLimit` in their ExecutionPolicy. This is the first place `dailySpendLimit` is actually enforced on-chain (V1 stores it but doesn't enforce it).

### Approval window
Approvals expire after a configurable window (default: 5 minutes). An agent cannot stockpile approvals and execute them later.

### Off-chain verification
Any system can verify approval without a blockchain node:
This can be served by a lightweight indexer watching ApprovalGranted events.

---

## New Contract — PolicyGate.sol (V2, do not build yet)

```solidity
// Conceptual interface only — not for implementation before Zenith clears

interface IPolicyGate {
    struct ApprovalRequest {
        uint256 agentId;
        bytes32 actionHash;
        string actionType;
        uint256 requestedAt;
        uint256 expiresAt;
        bool approved;
        bool executed;
        string denyReason;
    }

    function requestApproval(
        uint256 agentId,
        bytes32 actionHash,
        string calldata actionType,
        uint256 spendAmount  // 0 for non-financial actions
    ) external returns (bytes32 requestId);

    function isApproved(bytes32 requestId) external view returns (bool);
    function getApproval(bytes32 requestId) external view returns (ApprovalRequest memory);
    function markExecuted(bytes32 requestId) external;
}
```

---

## ETHOnline 2026 Positioning

PolicyGate is the answer to the question judges will ask:

> "How does Aevum handle AI agents that operate off-chain?"

**Current answer (V1):** "We gate on-chain actions by reputation."  
**V2 answer:** "PolicyGate extends the same reputation gating to any off-chain action — refunds, API calls, CRM updates — with an immutable on-chain audit trail."

This positions Aevum as infrastructure for **all** AI agent actions, not just DeFi.

---

## Demo Scenario for ETHOnline

1. Register an AI agent on Aevum (live demo — Agent Identity page)
2. Agent wants to issue a $50 refund on behalf of a user
3. Agent calls `PolicyGate.requestApproval(agentId, refundHash, "refund", 50e6)`
4. Contract checks: reputation 100 ≥ threshold 100 ✓, daily limit not exceeded ✓
5. `ApprovalGranted` event emitted with requestId
6. Off-chain refund system queries `isApproved(requestId)` → true
7. Refund executes, `markExecuted(requestId)` called
8. Immutable audit trail: this agent issued this refund at this time, authorized on-chain

---

## Why Not Build It Before Zenith

1. Expanding contract scope before professional audit = expanding audit scope = higher cost + longer timeline
2. PolicyGate integrates with ReputationOracle and AgentIdentity — any changes to those during audit would invalidate PolicyGate
3. Concept doc is sufficient for ETHOnline submission — live V1 demo + V2 roadmap is stronger than a rushed V2

---

## Roadmap

| Milestone | Target |
|---|---|
| Zenith audit complete | Aug 2026 |
| V1 mainnet deployment | Sept 4–16 (ETHOnline) |
| PolicyGate spec finalized | Oct 2026 |
| PolicyGate audit | Nov 2026 |
| PolicyGate mainnet | Q1 2027 |

---

*Aevum Protocol — "Built for Machines. Owned by Everyone."*  
*github.com/AevumProtocol/contracts*
