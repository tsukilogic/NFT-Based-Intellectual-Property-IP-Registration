// src/metamask.js
import { createEVMClient, getInfuraRpcUrls } from "@metamask/connect-evm";

let clientPromise = null;

export function getMetaMaskClient() {
  if (!clientPromise) {
    clientPromise = createEVMClient({
      dapp: {
        name: "IP Registry NFT Demo",
        url: window.location.origin,
        // iconUrl: `${window.location.origin}/logo.png`, // optional
      },
      api: {
        supportedNetworks: {
          // Production/public chains from Infura
          ...getInfuraRpcUrls({
            infuraApiKey: import.meta.env.VITE_INFURA_API_KEY,
          }),

          // Your local Hardhat network
          "0x7a69": "http://127.0.0.1:8545",
        },
      },
    });
  }

  return clientPromise;
}

export async function connectWallet() {
  const client = await getMetaMaskClient();

  const { accounts, chainId } = await client.connect({
    chainIds: ["0x7a69"], // Hardhat localhost 31337
  });

  return {
    account: accounts?.[0] || "",
    chainId,
    provider: client.getProvider(),
  };
}

export async function getWalletProvider() {
  const client = await getMetaMaskClient();
  return client.getProvider();
}