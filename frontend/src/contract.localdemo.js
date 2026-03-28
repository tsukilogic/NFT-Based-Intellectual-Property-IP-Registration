import { ethers } from "ethers";

const RPC_URL = "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Hardhat Account #0 private key
const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const CONTRACT_ABI = [
  "function registerIP(bytes32 fileHash, string metadataURI) external returns (uint256)",
  "function verifyIP(bytes32 fileHash) external view returns (bool exists, uint256 tokenId, address owner, address creator, uint256 registeredAt, string metadataURI)"
];

function getSigner() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Wallet(PRIVATE_KEY, provider);
}

export async function connectWallet() {
  const signer = getSigner();
  return signer.address;
}

export async function getContract() {
  const signer = getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}