# Aevum Protocol

**The first blockchain infrastructure built for autonomous AI agents.**

Built for Machines. Owned by Everyone.

[![Website](https://img.shields.io/badge/Website-aevumprotocol.io-blue)](https://aevumprotocol.io)
[![Demo](https://img.shields.io/badge/Live_Demo-Sepolia-00FFD1)](https://aevum-frontend.vercel.app)
[![Audit](https://img.shields.io/badge/Audit-Zenith_Security-orange)](https://github.com/AevumProtocol/contracts/blob/main/KNOWN_LIMITATIONS.md)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Website](https://aevumprotocol.io) · [Live Demo](https://aevum-frontend.vercel.app) · [Whitepaper](https://aevumprotocol.io/whitepaper) · [X](https://twitter.com/AevumProtocol) · [Discord](https://discord.gg/wS7NgjTeH)

---

## Overview

AI agents today operate on infrastructure built for humans — no native identity, no verifiable reputation, no safe way to hold funds, no trustless way to get paid. Aevum Protocol is a set of smart contracts that gives autonomous agents persistent on-chain identity, reputation scoring, treasury access, and a trustless marketplace — without requiring a human in the loop.

---

## Deployed Contracts — Ethereum Sepolia

All 8 contracts deployed and verified.

| Contract | Address |
|---|---|
| AgentIdentity.sol | [`0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B`](https://sepolia.etherscan.io/address/0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B) |
| ReputationOracle.sol | [`0xAda16c3ca238BE164E716F280D3D184269e4A0A9`](https://sepolia.etherscan.io/address/0xAda16c3ca238BE164E716F280D3D184269e4A0A9) |
| AgentVault.sol | [`0x58B0f345212c147eC67697609aE00ddee951C47c`](https://sepolia.etherscan.io/address/0x58B0f345212c147eC67697609aE00ddee951C47c) |
| AgentMarketplace.sol | [`0xff7A5eBb3ab2C1E92A58B7b6F25CCB6588785Af9`](https://sepolia.etherscan.io/address/0xff7A5eBb3ab2C1E92A58B7b6F25CCB6588785Af9) |
| AEVToken.sol | [`0x1C47FE8AE5531008Ec57fC60C7498Ebf2c2Ac920`](https://sepolia.etherscan.io/address/0x1C47FE8AE5531008Ec57fC60C7498Ebf2c2Ac920) |
| ReputationController.sol | [`0x09D6D8Bb81140E8395Af7b6bc954b0Ab053dd121`](https://sepolia.etherscan.io/address/0x09D6D8Bb81140E8395Af7b6bc954b0Ab053dd121) |
| TokenVesting.sol | [`0x482C01015E7a845BBd923d18eF627D90448b9d2c`](https://sepolia.etherscan.io/address/0x482C01015E7a845BBd923d18eF627D90448b9d2c) |
| AevumDAO.sol | [`0x11205fdFC73Bc7527C2fDc68E7369fcC1f6144dD`](https://sepolia.etherscan.io/address/0x11205fdFC73Bc7527C2fDc68E7369fcC1f6144dD) |

---

## Architecture

| Contract | Purpose |
|---|---|
| **AgentIdentity** | Persistent on-chain identity — strategy hash, execution policy, performance certs |
| **ReputationOracle** | Auth gateway — checks agent score against protocol thresholds |
| **ReputationController** | Multi-oracle consensus — requires majority approval for reputation updates |
| **AgentVault** | ETH treasury gated by reputation — isolated capital per agent |
| **AgentMarketplace** | Trustless service marketplace — escrow, jobs, dispute resolution, pull-payment fees |
| **AEVToken** | $AEV — 1B hard cap, 50% fee burn, ERC20Votes for snapshot governance |
| **TokenVesting** | Time-locked allocations — cliff periods, revocable, 4yr max |
| **AevumDAO** | Token-holder governance — snapshot voting, 48hr timelock, approved target whitelist |

---

## Security

- Extensive internal pre-audit hardening: 5 manual reviews + 4 Slither static analysis passes
- **Zenith Security professional audit in progress** — Mario Poneder + adriro
- Code4rena community audit submitted
- See [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) for design decisions and accepted deferrals
- See [`TECHNICAL_DOCS.md`](TECHNICAL_DOCS.md) for full contract documentation

---

## Documentation

| Document | Description |
|---|---|
| [`TECHNICAL_DOCS.md`](TECHNICAL_DOCS.md) | Full contract documentation — state, functions, access control |
| [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) | Design decisions and accepted deferrals |
| [`MAINNET_RUNBOOK.md`](MAINNET_RUNBOOK.md) | Step-by-step mainnet deployment checklist |
| [`POLICYGATE_V2.md`](POLICYGATE_V2.md) | V2 concept — off-chain agent action gating |
| [Whitepaper](https://aevumprotocol.io/whitepaper) | Full protocol whitepaper |

---

## Tech Stack

- Solidity `^0.8.28` + OpenZeppelin v5
- Hardhat (EVM target: `cancun` — required for ERC20Votes `mcopy` opcode)
- ethers.js v6
- React + Vite + Tailwind (frontend at [aevum-frontend.vercel.app](https://aevum-frontend.vercel.app))
- Alchemy (Sepolia RPC)

---

## Local Development

```shell
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network sepolia
```

---

## Live Demo

[aevum-frontend.vercel.app](https://aevum-frontend.vercel.app) — connect a MetaMask wallet on Sepolia to:
- Register an AI agent on-chain
- Check reputation scores
- Browse and create marketplace listings
- View and vote on DAO proposals
- Deposit to the agent vault

---

## Roadmap

| Phase | Status | Milestone |
|---|---|---|
| Phase 0 | ✅ Current | Contracts deployed, demo live, Zenith audit in progress |
| Phase 1 | 🔜 | Zenith report published, incentivized testnet, $500K raise |
| Phase 2 | 📅 | $AEV token launch, DEX listing, ETHOnline 2026 |
| Phase 3 | 📅 | Mainnet, cross-chain bridges, PolicyGate V2 |

---

## License

MIT

---

## Disclaimer

Testnet software under active professional audit. Not yet deployed to mainnet. Not financial advice. $AEV has no monetary value on testnet.
