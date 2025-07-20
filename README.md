# 🪙 Onchain SIP

**Onchain SIP (Systematic Investment Plan)** is a decentralized protocol that allows users to create structured investment plans on the blockchain. Users define how much to invest, how often, and for how long — and the smart contract handles the rest.

> Built on BNB Testnet for demonstration purposes.

---

## 🚀 Features

- Create SIP plans by specifying:
  - Total investment amount (min: $100)
  - Maturity duration (6–60 months)
- Automatically calculates valid frequency options:
  - Weekly, Monthly, Quarterly, Yearly
  - Only shows frequencies where each SIP is ≥ $3
- Simple React + Wagmi + RainbowKit frontend
- Smart contract stores and tracks SIP plans

---

## 🛠 Tech Stack

- **Smart Contracts**: Solidity
- **Frontend**: Next.js, TypeScript, RainbowKit, Wagmi, Viem
- **Chain**: BNB Testnet
- **Wallet**: WalletConnect / MetaMask

---

## 🧪 How to Run

### 1. Clone the Repo
```bash
git clone https://github.com/ad714/Onchain-SIP
cd Onchain-SIP
