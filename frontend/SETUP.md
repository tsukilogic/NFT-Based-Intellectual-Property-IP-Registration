# Project Setup

## 1. Install dependencies

### Contracts
cd contracts
npm install

### Frontend
cd ../frontend
npm install

---

## 2. Run local blockchain

cd ../contracts
npx hardhat node

---

## 3. Deploy contract (local)

npx hardhat run scripts/deploy-ipregistry.js --network localhost

---

## 4. Deploy contract (Sepolia)

npx hardhat run scripts/deploy-ipregistry.js --network sepolia

---

## 5. Run frontend

cd ../frontend
npm run dev

---

## 6. Environment variables

frontend/.env:

VITE_SEPOLIA_RPC=YOUR_ALCHEMY_URL
VITE_CONTRACT_ADDRESS=YOUR_CONTRACT_ADDRESS
VITE_PINATA_JWT=YOUR_PINATA_JWT