import { ethers } from "ethers";

const CONTRACT_ADDRESS = "PASTE_DEPLOYED_ADDRESS_HERE"

const CONTRACT_ABI = [
  "function registerIP(bytes32 fileHash, string metadataURI) external returns (uint256)",
  "function verifyIP(bytes32 fileHash) external view returns (bool exists, uint256 tokenId, address owner, address creator, uint256 registeredAt, string metadataURI)"
];

function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getReadContract() {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export async function getWriteContract() {
  const provider = getProvider();

  const accounts = await window.ethereum.request({
    method: "eth_accounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("Wallet not connected");
  }

  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}