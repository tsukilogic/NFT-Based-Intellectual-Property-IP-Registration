import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Update this if your contract is deployed to a different address

const CONTRACT_ABI = [
  "function registerIP(bytes32 fileHash, string metadataURI) external returns (uint256)",
  "function verifyIP(bytes32 fileHash) external view returns (bool exists, uint256 tokenId, address owner, address creator, uint256 registeredAt, string metadataURI)",
  "function getRecordByTokenId(uint256 tokenId) external view returns (bytes32 fileHash, uint256 registeredAt, address creator, address owner, string metadataURI)",
  "function getMyTokenIds(address user) external view returns (uint256[] memory)",
  "function getTokenIdByHash(bytes32 fileHash) external view returns (uint256)",
  "function totalRegistered() external view returns (uint256)"
];

function getEthereum() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found. Please install or enable MetaMask.");
  }
  return window.ethereum;
}


export async function connectWallet() {
  const ethereum = getEthereum();

  await ethereum.request({ method: "eth_requestAccounts" });

  const accounts = await ethereum.request({ method: "eth_accounts" });
  return accounts || [];
}

export async function getCurrentAccount() {
  const ethereum = getEthereum();

  const accounts = await ethereum.request({
    method: "eth_accounts",
  });

  return accounts?.[0] || "";
}

export async function ensureHardhatNetwork() {
  const ethereum = getEthereum();
  const hardhatChainId = "0x7a69";

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hardhatChainId }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hardhatChainId,
            chainName: "Hardhat Localhost",
            nativeCurrency: {
              name: "ETH",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: ["http://127.0.0.1:8545"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

function getBrowserProvider() {
  const ethereum = getEthereum();
  return new ethers.BrowserProvider(ethereum);
}

export async function getReadContract() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export async function getWriteContract() {
  const provider = getBrowserProvider();
  const signer = await provider.getSigner();
  console.log("Using write contract address:", CONTRACT_ADDRESS);
  console.log("Signer:", await signer.getAddress());
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}