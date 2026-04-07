# NFT-Based IP Registration dApp

A decentralized application (dApp) that allows users to register intellectual property by minting NFTs backed by IPFS-stored files and metadata.

The system ensures proof of ownership and timestamping using blockchain technology.

---

## Overview

This project enables users to:

- Upload files and store them on IPFS
- Generate metadata including file hash and details
- Mint an NFT representing ownership of the file
- Verify ownership by hashing and checking on-chain records
- View previously registered IP assets

---

## Tech Stack

### Frontend
- React (Vite)
- Ethers.js
- MetaMask

### Backend
- Node.js
- Express
- Pinata API (IPFS)

### Blockchain
- Solidity (0.8.x)
- Hardhat (v3)
- Ethers.js

---

## Project Structure
ip-nft-zk/
├── contracts/
│ ├── contracts/
│ │ └── IPRegistryNFT.sol
│ ├── scripts/
│ │ └── deploy-ipregistry.js
│ └── hardhat.config.ts
│
├── frontend/
│ ├── src/
│ │ ├── App.jsx
│ │ └── contract.js
│
├── backend/
│ └── server.js

---

---

## Setup Instructions

### 1. Install dependencies

Contracts:

cd contracts
npm install


Backend:

cd backend
npm install


Frontend:

cd frontend
npm install


---

### 2. Start local blockchain


cd contracts
npx hardhat node


---

### 3. Deploy contract


npx hardhat run .\scripts\deploy-ipregistry.js --network localhost


Copy the deployed contract address and update:


frontend/src/contract.js


---

### 4. Start backend


cd backend
npm run dev


---

### 5. Start frontend

cd frontend
npm run dev


---

## Environment Variables

Create a `.env` file in the `backend` folder:


PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY=your_gateway.mypinata.cloud
PORT=3001


---

## Usage

1. Connect MetaMask
2. Upload a file
3. File is stored on IPFS
4. Metadata is generated and uploaded
5. NFT is minted on-chain
6. Verify ownership using the same file

---

## Notes

- Requires local Hardhat node
- Contract address must be updated after each deployment
- Duplicate registration prevention is not yet implemented

---

## Next Steps

- Deploy to Sepolia testnet
- Improve UI/UX
- Add metadata preview
- Prevent duplicate registrations