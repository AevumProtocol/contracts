# Aevum Protocol — Smart Contracts

On-chain infrastructure for certifying trading strategy integrity. The Verifiable Backtest Oracle (VBO) issues cryptographic certificates proving a trading strategy was defined before its forward test window — making look-ahead bias and cherry-picking cryptographically impossible.

## Deployed Contracts — Ethereum Sepolia Testnet

### VBO Core (Mainnet launch: September 4, 2026)

| Contract | Address | Description |
|---|---|---|
| AgentIdentity | `0xF6CEc60C9dD6aa283D42fE5D38537303F9bE231B` | On-chain agent identity and certificate registry |
| ReputationOracle v2 | `0xa1d354A6f0960d394da6E5f68Bdb8BE4cfE543A7` | Multi-oracle reputation consensus |
| ReputationController v2 | `0x81821ed809CDf44f487bb66f9d531658404D57aB` | 24hr timelock, challenge window |
| VBO v1 | `0x9dBC2f11E11C64810922B4c68d55DFf1BCA4Dc8d` | Verifiable Backtest Oracle v1 |
| VBO v2 (Atlas Oracle) | `0xEfFa92f77424d733b0f0FFD03caF98D01583cd05` | VBO with Atlas Oracle pull-mode price attestation |

### Supporting Contracts (Post-funding deployment)

| Contract | Address | Description |
|---|---|---|
| AgentVault v3 | `0x86D741407E2Df0400AbE2BB8E8E5075BA10E409d` | Reputation-gated shared treasury |
| AgentMarketplace | `0xff7A5eBb3ab2C1E92A58B7b6F25CCB6588785Af9` | Permissionless agent services marketplace |
| AEVToken | `0x1C47FE8AE5531008Ec57fC60C7498Ebf2c2Ac920` | Protocol governance token |
| TokenVesting | `0x482C01015E7a845BBd923d18eF627D90448b9d2c` | Founder vesting 4yr/1yr cliff |
| AevumDAO | `0x11205fdFC73Bc7527C2fDc68E7369fcC1f6144dD` | On-chain governance |

All contracts verified on [Etherscan Sepolia](https://sepolia.etherscan.io).

## Security

**Audit status:** No third-party audit has been completed. A professional audit by Hexens (Kasper Zwijsen, Head of Audits — previously audited EigenLayer, Lido, LayerZero) is scoped and contracted, restarting at first investment close.

**Internal review:** 5 manual passes, 4 Slither passes, AuditAid external review (findings fixed), Claude Opus source review.

**Test suite:** 23 Foundry tests, all passing. See `test/foundry/`.

**Known limitations:** See [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) for all documented architectural decisions and known issues.

## What VBO certificates prove

VBO certificates prove **process integrity** — the strategy was committed on-chain before the forward window opened, making post-hoc modification cryptographically impossible.

They do **not** prove:
- That the bot traded exactly as described (v1 — execution proofs are v2 roadmap)
- Future profitability
- Absence of other forms of overfitting

## Atlas Oracle Integration

VBO v2 inherits `PullOracleConsumerStandard` from Atlas Oracle. BTC/USD prices at commit and attestation time are cryptographically signed by Atlas Oracle (905+ exchange sources, CoinMarketCap-backed) and verified on-chain. The `atlasVerified` flag on each certificate indicates whether both price points were Atlas-attested.

## Development

```bash
npm install
npx hardhat compile
npx hardhat test
export PATH="$PATH:~/.foundry/bin" && forge test -vv
```

## License

MIT — see [LICENSE](./LICENSE)
