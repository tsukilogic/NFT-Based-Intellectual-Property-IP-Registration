import { useEffect, useState, useCallback } from "react";
import {
  connectWallet,           
  getCurrentAccount,
  ensureHardhatNetwork,
  getReadContract,
  getWriteContract
} from "./contract";
import { hashFile } from "./hashFile";
import { uploadFileToPinata, uploadMetadataToPinata } from "./ipfs";

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState("");
  const [registerFile, setRegisterFile] = useState(null);
  const [verifyFile, setVerifyFile] = useState(null);
  const [registerResult, setRegisterResult] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [myTokens, setMyTokens] = useState([]);
  const [totalRegistered, setTotalRegistered] = useState("0");
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState("");


  const loadGlobalStats = useCallback(async () => {
    try {
      const contract = await getReadContract();
      console.log("read contract target:", contract.target);
      const total = await contract.totalRegistered();
      console.log("totalRegistered ok:", total.toString());
      setTotalRegistered(total.toString());
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }, []);

  const loadMyRegistrations = useCallback(async (account) => {
    try {
      if (!account) return;

      const contract = await getReadContract();
      const tokenIds = await contract.getMyTokenIds(account);

  
      const details = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const record = await contract.getRecordByTokenId(tokenId);
          return {
            tokenId: tokenId.toString(),
            fileHash: record.fileHash,       
            registeredAt: record.registeredAt.toString(),
            creator: record.creator,
            owner: record.owner,
            metadataURI: record.metadataURI,
          };
        })
      );

      setMyTokens(details);
    } catch (err) {
      console.error("Failed to load my registrations:", err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        if (!window.ethereum) return;

        const current = await getCurrentAccount();
        if (current) {
          setAccounts([current]);
          setActiveAccount(current);
        }


        await loadGlobalStats();

        const handleAccountsChanged = (newAccounts) => {
          setAccounts(newAccounts || []);
          setActiveAccount(newAccounts?.[0] || "");
          setMyTokens([]);
        };

        const handleChainChanged = () => {
          window.location.reload();
        };

        window.ethereum.on?.("accountsChanged", handleAccountsChanged);
        window.ethereum.on?.("chainChanged", handleChainChanged);

        return () => {
          window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
          window.ethereum.removeListener?.("chainChanged", handleChainChanged);
        };
      } catch (err) {
        console.error("Init error:", err);
      }
    }

    let cleanup;
    init().then((fn) => {
      cleanup = fn;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [loadGlobalStats]);


  useEffect(() => {
    if (activeAccount) {
      loadMyRegistrations(activeAccount);
  
      loadGlobalStats();
    }
  }, [activeAccount, loadMyRegistrations, loadGlobalStats]);


  async function handleConnect() {
    try {
      setConnecting(true);
      setStatus("");
      await ensureHardhatNetwork();

      const allAccounts = await connectWallet();

      setAccounts(allAccounts || []);
      setActiveAccount(allAccounts?.[0] || "");
      setStatus("Wallet connected successfully.");
    } catch (err) {
      console.error("Connect error:", err);

      if (err?.code === 4001) {
        setStatus("You rejected the MetaMask request.");
      } else if (err?.code === -32002) {
        setStatus("MetaMask request is already pending. Open the extension.");
      } else {
        setStatus(err?.message || "Failed to connect MetaMask.");
      }
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    setAccounts([]);
    setActiveAccount("");
    setRegisterResult(null);
    setVerifyResult(null);
    setMyTokens([]);
    setStatus("Disconnected locally from UI.");
  }

  async function handleRegister() {
    if (!activeAccount) {
      setStatus("Connect MetaMask first.");
      return;
    }

    if (!registerFile) {
      setStatus("Choose a file first.");
      return;
    }

    try {
      setLoading(true);
      setRegisterResult(null);
      setStatus("Preparing registration...");

      await ensureHardhatNetwork();

      const fileHash = await hashFile(registerFile);

      setStatus("Uploading file to IPFS via Pinata...");
      const uploadedFile = await uploadFileToPinata(registerFile);

      setStatus("Generating metadata...");
      const metadata = {
        name: registerFile.name,
        description: "IP Registration NFT",
        fileName: registerFile.name,
        fileType: registerFile.type || "unknown",
        fileHash,
        fileCid: uploadedFile.cid,
        fileIpfsUri: uploadedFile.ipfsUri,
        owner: activeAccount,
        createdAt: new Date().toISOString(),
    };

      setStatus("Uploading metadata to IPFS...");
      const uploadedMetadata = await uploadMetadataToPinata(metadata);

      console.log("fileHash:", fileHash);
      console.log("uploadedFile:", uploadedFile);
      console.log("metadata:", metadata);
      console.log("uploadedMetadata:", uploadedMetadata);
      console.log("metadata ipfsUri:", uploadedMetadata?.ipfsUri);

      if (!uploadedMetadata?.ipfsUri || !uploadedMetadata.ipfsUri.startsWith("ipfs://")) {
        throw new Error("Metadata upload did not return a valid ipfsUri.");
      }

      setStatus("Checking transaction...");
      const contract = await getWriteContract();
      console.log("Write contract:", contract);

      const signer = await contract.runner?.getAddress?.();
      console.log("Signer address:", signer);

      await contract.registerIP.staticCall(fileHash, uploadedMetadata.ipfsUri);

      setStatus("Waiting for MetaMask confirmation...");
      const tx = await contract.registerIP(fileHash, uploadedMetadata.ipfsUri);

      const receipt = await tx.wait();

      const readContract = await getReadContract();
      const verified = await readContract.verifyIP(fileHash);

      
      const result = {
        hash: fileHash,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        exists: verified.exists,
        tokenId: verified.tokenId.toString(),
        owner: verified.owner,
        creator: verified.creator,
        registeredAt: verified.registeredAt.toString(),
        metadataURI: verified.metadataURI,
      };

      setRegisterResult(result);
      setStatus("Registration successful.");

      await loadGlobalStats();
      await loadMyRegistrations(activeAccount);
    } catch (err) {
      console.error("Register error:", err);

      let message = "Registration failed.";

      if (
        err?.reason === "Hash already registered" ||
        err?.message?.includes("Hash already registered") ||
        err?.data?.message?.includes("Hash already registered")
      ) {
        message = "This file is already registered on the blockchain.";
      } else if (
        err?.reason === "Empty metadata URI" ||
        err?.message?.includes("Empty metadata URI")
      ) {
        message = "Metadata URI cannot be empty.";
      } else if (err?.code === 4001) {
        message = "You rejected the transaction in MetaMask.";
      } else if (err?.reason) {
        message = err.reason;
      } else if (err?.code === "CALL_EXCEPTION") {
        const match = err?.message?.match(/reason="([^"]+)"/);
        message = match
          ? `Error: ${match[1]}`
          : "Transaction failed. The contract rejected this action.";
      } else if (err?.message) {
        message = `Error: ${err.message.split("(")[0].trim()}`;
      }

      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!verifyFile) {
      setStatus("Choose a file to verify.");
      return;
    }

    try {
      setLoading(true);
      setVerifyResult(null);
      setStatus("Hashing file and checking registry...");

      await ensureHardhatNetwork();

      const contract = await getReadContract();
      const fileHash = await hashFile(verifyFile);
      const result = await contract.verifyIP(fileHash);


      setVerifyResult({
        hash: fileHash,
        exists: result.exists,
        tokenId: result.tokenId.toString(),
        owner: result.owner,
        creator: result.creator,
        registeredAt: result.registeredAt.toString(),
        metadataURI: result.metadataURI,
      });

      setStatus(result.exists ? "File found in registry." : "File is not registered.");
    } catch (err) {
      console.error("Verify error:", err);
      setStatus(err?.reason || err?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  function shortenAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  function formatTimestamp(ts) {
    if (!ts || ts === "0") return "-";
    return new Date(Number(ts) * 1000).toLocaleString();
  }

  return (
    <div style={{ maxWidth: "900px", margin: "40px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>IP Registry NFT</h1>
      <p>Register a file hash on-chain, mint an NFT proof, and verify it later.</p>

      <div style={{ padding: "12px", background: "#f5f5f5", borderRadius: "8px", marginBottom: "20px" }}>
        <strong>Total Registered:</strong> {totalRegistered}
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={handleConnect} disabled={connecting}>
          {connecting
            ? "Connecting..."
            : activeAccount
            ? `Connected: ${shortenAddress(activeAccount)}`
            : "Connect Wallet"}
        </button>

        {activeAccount && (
          <button
            type="button"
            onClick={handleDisconnect}
            style={{
              background: "#ff4d4d",
              color: "white",
              border: "none",
              padding: "8px 14px",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Disconnect
          </button>
        )}
      </div>

      {accounts.length > 1 && (
        <div style={{ marginTop: "12px" }}>
          <strong>Switch account:</strong>
          <select
            value={activeAccount}
            onChange={(e) => setActiveAccount(e.target.value)}
            style={{ display: "block", marginTop: "8px", minWidth: "420px" }}
          >
            {accounts.map((acc) => (
              <option key={acc} value={acc}>
                {acc}
              </option>
            ))}
          </select>
        </div>
      )}

      {status && (
        <div style={{ marginTop: "16px", padding: "12px", background: "#eef3ff", borderRadius: "8px" }}>
          <strong>Status:</strong> {status}
        </div>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>Register IP</h2>
      <input type="file" onChange={(e) => setRegisterFile(e.target.files?.[0] || null)} />
      <br /><br />

      <button type="button" onClick={handleRegister} disabled={loading || !activeAccount}>
        {loading ? "Processing..." : "Register File"}
      </button>

      {registerResult && (
        <div style={{ background: "#f4f4f4", padding: "12px", marginTop: "15px", borderRadius: "8px" }}>
          <h3 style={{ marginTop: 0 }}>Registration Result</h3>
          <p><strong>Hash:</strong> {registerResult.hash}</p>
          <p><strong>Token ID:</strong> {registerResult.tokenId}</p>
          <p><strong>Creator:</strong> {registerResult.creator}</p>
          <p><strong>Owner:</strong> {registerResult.owner}</p>
          <p><strong>Metadata URI:</strong> {registerResult.metadataURI}</p>
          <p><strong>Registered At:</strong> {formatTimestamp(registerResult.registeredAt)}</p>
          <p><strong>Transaction:</strong> {registerResult.txHash}</p>
          <p><strong>Block:</strong> {registerResult.blockNumber}</p>
        </div>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>Verify IP</h2>
      <input type="file" onChange={(e) => setVerifyFile(e.target.files?.[0] || null)} />
      <br /><br />

      <button type="button" onClick={handleVerify} disabled={loading}>
        {loading ? "Processing..." : "Verify File"}
      </button>

      {verifyResult && (
        <div style={{ background: "#f4f4f4", padding: "12px", marginTop: "15px", borderRadius: "8px" }}>
          <h3 style={{ marginTop: 0 }}>Verification Result</h3>
          <p><strong>Hash:</strong> {verifyResult.hash}</p>
          <p><strong>Registered:</strong> {verifyResult.exists ? "✅ Yes" : "❌ No"}</p>

          {verifyResult.exists && (
            <>
              <p><strong>Token ID:</strong> {verifyResult.tokenId}</p>
              <p><strong>Owner:</strong> {verifyResult.owner}</p>
              <p><strong>Creator:</strong> {verifyResult.creator}</p>
              <p><strong>Metadata URI:</strong> {verifyResult.metadataURI}</p>
              <p><strong>Registered At:</strong> {formatTimestamp(verifyResult.registeredAt)}</p>
            </>
          )}
        </div>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>My Registrations</h2>
      {!activeAccount ? (
        <p>Connect your wallet to view your registrations.</p>
      ) : myTokens.length === 0 ? (
        <p>No registrations yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {myTokens.map((item) => (
            <div
              key={item.tokenId}
              style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "12px" }}
            >
              <p><strong>Token ID:</strong> {item.tokenId}</p>
              <p><strong>Hash:</strong> {item.fileHash}</p>
              <p><strong>Creator:</strong> {item.creator}</p>
              <p><strong>Owner:</strong> {item.owner}</p>
              <p><strong>Metadata URI:</strong> {item.metadataURI}</p>
              <p><strong>Registered At:</strong> {formatTimestamp(item.registeredAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}