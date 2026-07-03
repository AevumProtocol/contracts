# Aevum Protocol — Roadmap

This document outlines the protocol's development phases and the v2 architecture
direction informed by operator and integrator feedback during the v1 audit cycle.

---

## Phase 0 — Current (Q3 2026)

- [x] 8 core contracts deployed and verified on Ethereum Sepolia
- [x] Internal pre-audit hardening (5 manual reviews, 4 Slither passes, 1 deep static analysis)
- [x] Live demo frontend — aevum-frontend.vercel.app
- [x] Technical documentation, known limitations, mainnet runbook published
- [ ] Zenith Security professional audit (contracted, kickoff pending)
- [ ] Audit findings remediation + mitigation review

## Phase 1 — Mainnet (ETHOnline 2026, September 4–16)

- [ ] Gnosis Safe 2-of-3 multisig ownership (replaces single deployer EOA)
- [ ] Hardware wallet signer integration
- [ ] Mainnet deployment per MAINNET_RUNBOOK.md
- [ ] Etherscan verification of all mainnet contracts
- [ ] Wallet connection upgrade — RainbowKit + WalletConnect (removes MetaMask/Chrome dependency)

## Phase 2 — v2 Architecture (Post-Audit)

### Reputation Layer Redesign
Informed by consistent feedback from independent protocol engineers and x402
endpoint operators: **evidence belongs on-chain, scoring belongs off-chain.**

- [ ] **Hybrid reputation model** — on-chain attestations, settlement receipts,
      and content-addressed observation logs as the immutable evidence layer;
      scoring logic moves off-chain and competitive, letting consumers choose
      their scorer the way lenders choose credit bureaus. On-chain scoring
      freezes the definition of trust at deploy time — this unfreezes it.
- [ ] **Slashable reputation bond** — reputation is only worth what it costs to
      fake. Registration bonds become slashable on proven misbehavior, making
      sybil farming economically irrational rather than merely expensive.
- [ ] **Permissionless observation support** — reputation accrual from
      independent observers probing agent endpoints, not only from
      self-registered interaction history.

### Sybil Resistance Hardening
- [ ] Stake deposit governance-adjustable via AevumDAO (verify current state pre-audit)
- [ ] Stake deposit denominated in $AEV (currently ETH)
- [ ] Rate limiting on agent registration
- [ ] Reputation decay for inactive agents

### Vault Hardening
- [ ] Time-bounded vault permissions with expiry
- [ ] Short-notice revoke functions on all approvals
- [ ] ERC20 token support (currently ETH-only)

### PolicyGate (see POLICYGATE_V2.md)
- [ ] Lightweight on-chain gate issuing signed approvals for off-chain agent
      actions (refunds, API calls, CRM updates) — extends Aevum's addressable
      market from on-chain-only agents to any agent taking consequential actions.

### Token Utility (sequenced after real marketplace volume)
- [ ] Reputation score multiplier for $AEV stakers
- [ ] Marketplace access tiers gated by $AEV holdings

## Phase 3 — Ecosystem (2027)

- [ ] Incentivized testnet for oracle operators
- [ ] Third-party oracle operator onboarding (decentralizing consensus)
- [ ] Cross-chain attestation bridges
- [ ] Institutional API

---

*This roadmap is sequenced deliberately: identity and attestation ship first as
neutral infrastructure; token-dependent mechanics activate only after real
economic activity exists to support them. Design inputs credited to the r/ethdev
and r/LangChain review threads, July 2026.*
