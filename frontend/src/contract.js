import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x791Ba65fFaA280f56Dc6DE9AB64AD627E1dDf3F7";

const CONTRACT_ABI = [
  "function registerIP(bytes32 fileHash, string metadataURI) external returns (uint256)",
  "function verifyIP(bytes32 fileHash) external view returns (bool exists, uint256 tokenId, address owner, address creator, uint256 registeredAt, string metadataURI)",
  "function getRecordByTokenId(uint256 tokenId) external view returns (bytes32 fileHash, uint256 registeredAt, address creator, address owner, string metadataURI)",
  "function getMyTokenIds(address user) external view returns (uint256[] memory)",
  "function getTokenIdByHash(bytes32 fileHash) external view returns (uint256)",
  "function totalRegistered() external view returns (uint256)"
];

const SEPOLIA_CHAIN_ID = "0xaa36a7";

function getEthereum() {
  if (!window.ethereum) {
    throw new Error("MetaMask not found.");
  }
  return window.ethereum;
}

export async function connectWallet() {
  const ethereum = getEthereum();
  await ethereum.request({ method: "eth_requestAccounts" });
  return await ethereum.request({ method: "eth_accounts" });
}

export async function getCurrentAccount() {
  const ethereum = getEthereum();
  const accounts = await ethereum.request({ method: "eth_accounts" });
  return accounts?.[0] || "";
}

export async function ensureSepoliaNetwork() {
  const ethereum = getEthereum();

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (err) {
    if (err.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: SEPOLIA_CHAIN_ID,
          chainName: "Sepolia",
          nativeCurrency: {
            name: "ETH",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: [import.meta.env.VITE_SEPOLIA_RPC],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }],
      });
    } else {
      throw err;
    }
  }
}

function getBrowserProvider() {
  return new ethers.BrowserProvider(getEthereum());
}

export async function getReadContract() {
  const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

export async function getWriteContract() {
  const provider = getBrowserProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}