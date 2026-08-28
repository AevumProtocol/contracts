# Aevum Protocol — Roadmap

This document outlines the protocol's development phases and the v2 architecture
direction informed by operator and integrator feedback during the v1 audit cycle.

---

## Phase 0 — Current (Q3 2026)

- [x] 8 core contracts deployed and verified on Ethereum Sepolia
- [x] Internal pre-audit hardening (5 manual reviews, 4 Slither passes, 1 deep static analysis)
- [x] Live demo frontend — aevum-frontend.vercel.app
- [x] Technical documentation, known limitations, mainnet runbook published
- [ ] Hexens professional audit (contracted, Kasper Zwijsen Head of Audits — audited EigenLayer, Lido, LayerZero — restarts at first investment check)
- [ ] Audit findings remediation + mitigation review

## Deployed — Ethereum Sepolia (Live)

- [x] **Agent Identity Layer** — on-chain identity for AI agents. Reputation scoring, execution policies, performance certificates. Contract: `0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B`
- [x] **Verifiable Backtest Oracle (VBO)** — cryptographic proof that a trading strategy was defined before its forward test window. Atlas Oracle pull mode integration. Contract: `0x9dBC2f11E11C64810922B4c68d55DFf1BCA4Dc8d`
- [x] **Reputation Oracle v2** — multi-oracle consensus, diminishing returns per counterparty. Contract: `0xa1d354A6f0960d394da6E5f68Bdb8BE4cfE543A7`
- [x] **Agent Vault v3** — reputation-gated shared treasury, rolling withdrawal cap, blacklist. Contract: `0x86D741407E2Df0400AbE2BB8E8E5075BA10E409d`
- [x] **Agent Marketplace** — permissionless marketplace, escrow, dispute resolution. Contract: `0xff7A5eBb3ab2C1E92A58B7b6F25CCB6588785Af9`
- [x] **$AEV Token** — ERC-20, 1B hard cap. Contract: `0x1C47FE8AE5531008Ec57fC60C7498Ebf2c2Ac920`
- [x] **Token Vesting** — founder vesting 4yr/1yr cliff. Contract: `0x482C01015E7a845BBd923d18eF627D90448b9d2c`
- [x] **AevumDAO** — governance. Contract: `0x11205fdFC73Bc7527C2fDc68E7369fcC1f6144dD`
- [x] **VBO v2 with Atlas Oracle** — Atlas PullOracleConsumerStandard inheritance, on-chain price verification. Contract: `0xEfFa92f77424d733b0f0FFD03caF98D01583cd05`

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

## Governance Upgrades (v2)

"$AEV holders control who validates the network, what the certification standard requires, and how protocol revenue gets distributed. The token isn't governance theater — it's ownership of the trust layer itself."

### 1. Governance Controls Validator Admission
Token holders vote on which validators get admitted to the network. Bad actors can be voted out with stake slashing. Makes every $AEV holder a guardian of the trust layer. Eliminates centralized validator control.

### 2. Governance Controls Certification Standards
Token holders vote on what market regimes must be covered, how long the forward window is, and what counts as a valid backtest. Governance updates the standard as the market evolves. Makes Aevum future-proof instead of frozen at deploy time.

### 3. Governance Controls Fee Distribution
Token holders vote on what percentage of certification fees goes to validators vs burns vs treasury. Holders directly control their own economic returns. Makes governance financially meaningful not abstract.

### 4. Conviction Voting (v2 research item)
Longer you hold $AEV without selling, more voting power accumulates. Rewards long-term believers over speculators. Too complex for pre-audit implementation — research item only for v2.

## Phase 2 — Token Utility Upgrades (decided July 20, 2026)

*Both items make $AEV genuinely yield-bearing and data-valuable, not just a governance token. Post-audit v2 work. Require legal counsel review before implementation.*

### 1. Validator Staking Rewards (v2 priority)

Validators who stake $AEV and attest certificates honestly earn a percentage of every certification fee generated during their attestation window. The more certificates they validate correctly, the more $AEV they earn. Real yield from day one of protocol volume — not speculative price appreciation, actual income from participating in the network.

**Why it matters:** Most tokens give holders nothing to do. Validator staking rewards give $AEV holders a reason to actively participate and earn. Similar to how Ethereum validators earn ETH for securing the network — Aevum validators earn $AEV for securing the trust layer.

**Implementation notes:**
- Fee split percentage defined in governance (e.g. 30% validators, 20% burns, 50% treasury)
- Per-validator attestation tracking to distribute rewards proportionally
- Pull-payment reward claiming to avoid reentrancy
- Governance controls fee split so it can be adjusted as network matures

**Legal note:** Staking rewards for active network participants is more legally defensible than passive dividends. Validators are providing a service — attestation — and being compensated for it. Confirm with legal counsel at incorporation.

**Timeline:** v2, post-audit. Design before Hexens report lands so it's ready to implement during the mitigation window if scope allows, or immediately post-audit otherwise.

---

### 2. Certified Strategy Data Marketplace (v2 research)

All VBO-certified strategies generate anonymized, aggregated on-chain performance data — regime classifications, win rates across market conditions, drawdown profiles, submission counts. This data is genuinely valuable to hedge funds, capital allocators, copy trading platforms, and quantitative researchers.

$AEV holders vote on pricing and access tiers. Institutions pay $AEV to access premium data products — regime analytics, strategy performance distributions, backtesting benchmarks. Revenue from data sales flows to $AEV stakers proportionally.

**Why it matters:** Nobody else has on-chain certified strategy performance data at scale. Creates a revenue stream separate from certification fees. More certificates = better data = more valuable marketplace. $AEV holders earn direct income from institutional data demand.

**Revenue model:**
- Basic — free, aggregate stats
- Professional — $AEV subscription, regime analytics
- Institutional — custom data pulls, large $AEV payment
- All payments in $AEV, portion burns, portion to stakers

**Implementation notes:** Phase 1 is off-chain data aggregation with on-chain payment gating. Phase 2 is fully on-chain data access with smart contract subscriptions. Begin design after first 50 certificates are issued.

**Timeline:** v2 research item. Launch as a separate product alongside the core protocol.

## Post-ETHOnline — Phase 3 Additions

### AVA — Aevum Virtual Assistant

A custom AI coding assistant built on the Claude API, pre-loaded with permanent context:
- All 9 contract ABIs
- TECHNICAL_DOCS.md
- KNOWN_LIMITATIONS.md
- ROADMAP.md

**Deployed at:** `assistant.aevumprotocol.io`

**Goals:**
- Reduce Claude usage costs for development sessions
- Onboard new team members instantly without reading 10,000 lines of documentation
- Give BD partners (Adam, AlgoChains, investors) a way to answer technical questions without developer involvement

**Timeline:** Build after ETHOnline September 4th when first funding check closes.
