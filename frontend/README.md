# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# IP Registry NFT (Demo)

A blockchain-based system for registering and verifying intellectual property (IP) using NFTs.

Users can:

* Register a file by storing its hash on-chain
* Verify ownership and authenticity of a file
* Maintain immutable proof using a blockchain (Hardhat local network)

---

# Demo Mode (No MetaMask Required)

This project includes a demo mode that uses a local Hardhat account to sign transactions.

* No wallet setup required
* Works out-of-the-box
* Intended for demonstration purposes only (not production-safe)

---

# Tech Stack

* Solidity (Smart Contracts)
* Hardhat (Local blockchain)
* React + Vite (Frontend)
* Ethers.js (Blockchain interaction)

---
## Demo Setup Note

To run the project in demo mode (without MetaMask), you must rename the demo files:

1. In `frontend/src/`:

   * Rename:

     * `contract.localdemo.js` → `contract.js`
     * `App.localdemo.jsx` → `App.jsx`

2. Restart the frontend:

```bash
npm run dev
```

This enables the local Hardhat account-based demo mode.

Note: These files use a local test private key and are intended only for demonstration purposes.

---
# Installation and Setup

## 1. Clone repository

```bash
git clone <your-repo-url>
cd ip-nft-zk
```

---

## 2. Install dependencies

### Contracts

```bash
npm install
npm install @openzeppelin/contracts
```

### Frontend

```bash
cd frontend
npm install
npm install ethers
cd ..
```

---

## 3. Start local blockchain

```bash
npx hardhat node
```

Keep this running.

---

## 4. Deploy smart contract

Open a new terminal:

```bash
npx hardhat ignition deploy ./ignition/modules/IPRegistryNFT.ts --network localhost
```

After deployment, copy the contract address:

```
IPRegistryNFTModule#IPRegistryNFT - 0x...
```

---

## 5. Configure frontend

Open:

```
frontend/src/contract.js
```

Replace:

```js
const CONTRACT_ADDRESS = "PASTE_DEPLOYED_ADDRESS_HERE";
```

with your deployed contract address.

---

## 6. Start frontend

```bash
cd frontend
npm run dev
```

Open the URL shown in the terminal (typically http://localhost:5173)

---

# Usage

## Connect

Click "Connect Wallet".

In demo mode, this loads a local Hardhat account.

---

## Register File

1. Select a file
2. Click "Register File"
3. Wait for confirmation

This:

* hashes the file
* stores the hash on-chain
* mints an NFT

---

## Verify File

1. Upload the same file
2. Click "Verify File"

The app will display:

* file hash
* existence (true/false)
* token ID
* owner address
* creator address
* timestamp
* metadata URI

---

# How It Works

1. File is converted to bytes
2. Hash is computed using:

```
keccak256(file)
```

3. Hash is stored on the blockchain
4. NFT is minted as proof of ownership

---

# Important Notes

## Local blockchain resets

If you restart:

```bash
npx hardhat node
```

You must:

1. Redeploy the contract
2. Update the contract address in the frontend

---

## Security

This demo uses a hardcoded test private key.

* Safe for local development
* Not safe for production use

---

# Future Improvements

* IPFS integration for file storage
* MetaMask-based multi-user support
* Deployment to public testnets (e.g., Sepolia)
* NFT metadata visualization
* Zero-knowledge proof integration

---

# Project Purpose

This project is designed as a simple, reproducible demonstration of NFT-based IP registration.

It emphasizes:

* clarity
* ease of setup
* functionality

---

# Demo Mode vs Real dApp

| Feature    | Demo Mode | Real dApp |
| ---------- | --------- | --------- |
| Wallet     | Local key | MetaMask  |
| Multi-user | No        | Yes       |
| Security   | No        | Yes       |
| Setup      | Easy      | Moderate  |

---

# Author

tsukilogic

---

# Summary

This project provides a complete working example of registering and verifying intellectual property on a blockchain using NFTs in a local development environment.
