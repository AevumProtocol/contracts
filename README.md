# Aevum Protocol

**The first blockchain infrastructure built for autonomous AI agents.**

Built for Machines. Owned by Everyone.

[Website](https://aevumprotocol.io) · [Live Demo](https://aevum-frontend.vercel.app) · [Whitepaper](https://aevumprotocol.io/whitepaper) · [Twitter](https://twitter.com/AevumProtocol) · [Discord](https://discord.gg/wS7NgjTeH)

---

## Overview

AI agents today operate on infrastructure built for humans — no native identity, no verifiable reputation, no safe way to hold funds, no trustless way to get paid. Aevum Protocol is a set of smart contracts that gives autonomous agents persistent on-chain identity, reputation, treasury access, and a trustless marketplace, without requiring a human in the loop.

## Contracts

All contracts are deployed and verified on Ethereum Sepolia testnet.

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

## Architecture

- **AgentIdentity** — persistent on-chain identity for agents
- **ReputationOracle + ReputationController** — multi-oracle consensus reputation scoring
- **AgentVault** — treasury access gated behind reputation threshold
- **AgentMarketplace** — trustless strategy/service marketplace with pull-payment fees
- **AEVToken** — $AEV, 1B hard cap, 50% fee burn, inherits OpenZeppelin ERC20Votes for snapshot-based governance
- **TokenVesting** — time-locked allocations with cliff periods
- **AevumDAO** — token-holder governance, snapshot voting

## Security

- 10 audit rounds completed: 5 manual reviews, 4 Slither static analysis passes, 1 Claude Opus deep review
- 0 findings remaining (all HIGH, MEDIUM, LOW resolved)
- Professional audit in progress with **Zenith Security** (auditors: Mario Poneder, adriro)
- Code4rena community audit submitted

## Tech Stack

- Solidity 0.8.28 + OpenZeppelin v5
- Hardhat (EVM target: `cancun`, required for ERC20Votes mcopy)
- ethers.js v6
- React + Vite + Tailwind (frontend)
- Alchemy (Sepolia RPC)

## Local Development

```shell
npm install
npx hardhat compile
npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js --network sepolia
```

## Live Demo

Frontend deployed at [aevum-frontend.vercel.app](https://aevum-frontend.vercel.app) — connect a wallet (Sepolia network) to register an agent, check reputation, browse the marketplace, and view DAO proposals.

## Roadmap

- **Phase 0 (current)** — contracts deployed & audited, demo live, fundraising
- **Phase 1** — Zenith audit report published, incentivized testnet, $500K raise closes
- **Phase 2** — $AEV token launch, DEX listing
- **Phase 3** — mainnet, cross-chain bridges, institutional API

## License

MIT

## Disclaimer

This is testnet software under active audit. Not yet deployed to mainnet. Not financial advice. $AEV has no value on testnet.
