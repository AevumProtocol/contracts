# Aevum Protocol — Roadmap

This document outlines the protocol's development phases and the v2 architecture
direction informed by operator and integrator feedback during the v1 audit cycle.

---

## Phase 0 — Foundation (complete, Q3 2026)

- [x] Core contracts built, tested and verified on Ethereum Sepolia
- [x] Internal pre-audit hardening (manual reviews, Slither passes, static analysis)
- [x] Technical documentation, known limitations and mainnet runbook written
- [x] Atlas Oracle (CoinMarketCap) 12-month data partnership signed; BTC/USD pull feed integrated
- [ ] Atlas ETH/USD (#852) and SOL/USD (#635) pull feeds integrated into VBO (feeds confirmed Sept 2026)
- [x] Certificates #001 and #002 issued on Sepolia (founder's BTC bot)

## Testnet — Ethereum Sepolia

*Full contract suite on Sepolia. The four VBO-required contracts are also live on mainnet (see Phase 1 and `mainnet-addresses.json`); the rest deploy to mainnet post-funding.*

- [x] **Agent Identity Layer** — on-chain identity for AI agents. Reputation scoring, execution policies, performance certificates. Contract: `0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B`
- [x] **Verifiable Backtest Oracle (VBO)** — cryptographic proof that a trading strategy was defined before its forward test window. Atlas Oracle pull mode integration. Contract: `0x9dBC2f11E11C64810922B4c68d55DFf1BCA4Dc8d`
- [x] **Reputation Oracle v2** — multi-oracle consensus, diminishing returns per counterparty. Contract: `0xa1d354A6f0960d394da6E5f68Bdb8BE4cfE543A7`
- [x] **Agent Vault v3** — reputation-gated shared treasury, rolling withdrawal cap, blacklist. Contract: `0x86D741407E2Df0400AbE2BB8E8E5075BA10E409d`
- [x] **Agent Marketplace** — permissionless marketplace, escrow, dispute resolution. Contract: `0xff7A5eBb3ab2C1E92A58B7b6F25CCB6588785Af9`
- [x] **$AEV Token** — ERC-20, 1B hard cap. Contract: `0x1C47FE8AE5531008Ec57fC60C7498Ebf2c2Ac920`
- [x] **Token Vesting** — founder vesting 4yr/1yr cliff. Contract: `0x482C01015E7a845BBd923d18eF627D90448b9d2c`
- [x] **AevumDAO** — governance. Contract: `0x11205fdFC73Bc7527C2fDc68E7369fcC1f6144dD`
- [x] **VBO v2 with Atlas Oracle** — Atlas PullOracleConsumerStandard inheritance, on-chain price verification. Contract: `0xEfFa92f77424d733b0f0FFD03caF98D01583cd05`

## Phase 1 — Mainnet (live since September 3, 2026)

- [x] Mainnet deployment of the four VBO-required contracts (VBO v2 with Atlas Oracle, AgentIdentity, ReputationOracle, ReputationController), all verified on Etherscan
- [x] Atlas Oracle price verification live in mainnet commitments
- [x] First mainnet strategy commitment (September 11, 2026)
- [x] Contract ownership moved to a new owner after the September 2026 security incident
- [x] Gnosis Safe 2-of-3 multisig deployed on mainnet
- [x] Subgraph indexing mainnet
- [x] ETHOnline 2026 — top 20% (live judging September 14)
- [ ] Transfer contract ownership to the Gnosis Safe (pending hardware wallet signer)
- [ ] First mainnet certificate
- [ ] Hexens professional audit — selected auditor; audit begins at first investment close
- [ ] Audit findings remediation + mitigation review
- [ ] Wallet connection upgrade — Coinbase Wallet SDK (replaces WalletConnect)
- [ ] Founding 25 — first 25 strategies verified on mainnet

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

### Agent Execution & Lifecycle (informed by Kumar Rajvardhan review, Sept 2026)
- [ ] Execution attestation layer — link committed VBO strategy to actual production
      agent execution, closing the gap between "strategy was evaluated" and
      "agent executed according to that strategy"
- [ ] Agent provenance & versioning — track model, prompt, strategy, and risk
      parameter changes over an agent's lifetime, distinct from static AgentIdentity
- [ ] Signed decision envelopes — bridge off-chain agent reasoning to on-chain
      execution without exposing full reasoning on-chain, extending PolicyGate's
      approval-issuing pattern
- [ ] Broader agent failure/recovery modes — explicit failure states, capability
      revocation, and recovery paths for bad data, infinite loops, lost connectivity,
      or compromised tools (extends the oracle operator fail-safe pattern in
      KNOWN_LIMITATIONS #14 to general agent operation)

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


## VBO Product Expansion — Demand-Gated (added Sept 23, 2026)

*These extend the VBO beyond coded strategies. None ship until real users ask for them; each has an explicit build trigger. Sell mode rule applies: build only what gets a customer.*

### 1. Live track-record anchoring (for traders who don't backtest)
Periodically (daily/weekly) commit a fingerprint of a trader's live trade history to Ethereum, so the record cannot be edited, backdated or cherry-picked from that point forward.
- **Strong version:** trade data pulled directly from the exchange via a read-only connection (reuses AVA's Coinbase OAuth work), so the record is provably real, not just unchanged. Crypto-first.
- **Limitation of the basic version:** fingerprinting a statement proves it wasn't changed later, not that it came from a real account.
- **Origin:** live-only algo traders (e.g. "I don't do backtests, I have a live track record").
- **Build trigger:** 3+ serious traders confirm proving their live record is a real pain.

### 2. Trade-call commitment flow (discretionary traders)
Commit individual trade plans (direction, entry, stop, target) before execution; verify outcomes against market prices afterward. Currently done manually via the VBO page — productize if discretionary Founding 25 partners find it valuable.
- **Build trigger:** Founding 25 discretionary traders complete windows and ask to keep using it.

### 3. Research / prediction report commitment
Commit a fingerprint of a published research report plus measurable criteria before the forecast period; validate at period end. First case: MarketVU ETH stock-cycle report (Sept 2026).
- **Build trigger:** a research publisher wants every report auto-committed (platform integration).

### 4. Additional price feeds
- ETH/USD (Atlas Feed #852), SOL/USD (Atlas Feed #635) — confirmed available on Ethereum mainnet as pull feeds (Sept 2026). **Next:** VBO v3 with per-commitment feed selection (VBO v2 verifies BTC/USD only), then Sepolia tests, security review and mainnet deployment. AVA Ethereum and Solana bot certificates go live when this ships.
- **VBO v3 design notes (anti-sybil / anti-cherry-picking, from Matthew Haney review, Sept 24 2026):**
  - Bond scales with the number of *open* commitments per identity (spreading 500 strategies = locking 500 growing bonds).
  - Weight track records by **bonded time** (duration capital was at risk), not commitment count.
  - Add `removeAttestor` (v2 cannot remove the old deployer 0x7Ba9 as attestor).
  - Contracts can't prove two wallets are one person; goal is to make splitting expensive and visible.
- FX (EUR/USD, GBP/USD) and gold (XAU/USD) + MT4/MT5 data bridge — **deferred** (crypto-only decision, Sept 22, 2026).
- **Build trigger (FX/XAU):** Atlas (or another partner) confirms the feeds AND 3+ traders or a prop firm ask for them.

**Messaging note:** despite the name, the VBO scores only forward, post-commitment data — describe it as "forward-only live verification." The name stays Verifiable Backtest Oracle.

## Products

### AVA — Aevum Virtual Assistant (retail product)

Done-for-you crypto trading bots for non-technical users. AVA builds, hosts and runs the bot; the customer controls it from their phone and their funds never leave their own Coinbase account.

- **Live:** waitlist at https://ava.aevumprotocol.io (September 2026)
- **Pairs:** BTC-USD, ETH-USD, SOL-USD on Coinbase
- **Onboarding:** Coinbase OAuth only ("Connect with Coinbase"), no API keys, no withdrawal scopes. OAuth partner application submitted to Coinbase September 22, 2026.
- **Tiers:** Basic $199 + $19/mo · Pro $499 + $39/mo · AI $999 + $79/mo
- **VBO tie-in:** Bitcoin bots receive a free VBO certificate; ETH and SOL certificates follow once Atlas confirms those feeds. Every AVA bot adds certificate volume to the protocol.
- **Next:** Supabase backend (customers, encrypted OAuth tokens, bots, trades), backend-owned token refresh, bot switch to OAuth, Stripe billing, phone dashboard.
- **Launch:** Q4 2026, pending Coinbase OAuth approval.
