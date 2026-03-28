import { useEffect, useState } from "react";
import { getReadContract, getWriteContract } from "./contract";
import { hashFile } from "./hashFile";

export default function App() {
  const [account, setAccount] = useState("");
  const [registerFile, setRegisterFile] = useState(null);
  const [verifyFile, setVerifyFile] = useState(null);
  const [registerResult, setRegisterResult] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkConnection() {
      try {
        if (!window.ethereum) return;

        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (accounts.length > 0) {
          setAccount(accounts[0]);
        }
      } catch (err) {
        console.error("checkConnection error:", err);
      }
    }

    checkConnection();

    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      console.log("accountsChanged:", accounts);
      setAccount(accounts?.[0] || "");
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      if (window.ethereum?.removeListener) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      }
    };
  }, []);

  async function handleConnect() {
    try {
      if (!window.ethereum) {
        alert("MetaMask not found");
        return;
      }

      console.log("Connect button clicked");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      console.log("eth_requestAccounts returned:", accounts);

      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        alert("No account returned");
      }
    } catch (err) {
      console.error("Connect wallet error:", err);
      alert(err?.message || "Failed to connect wallet");
    }
  }

  async function handleRegister() {
    if (!registerFile) {
      alert("Choose a file first");
      return;
    }

    try {
      setLoading(true);
      setRegisterResult("");

      const contract = await getWriteContract();
      const fileHash = await hashFile(registerFile);

      const tx = await contract.registerIP(fileHash, "ipfs://demo-metadata");
      await tx.wait();

      setRegisterResult(
        `Registered successfully.\nHash: ${fileHash}\nTx: ${tx.hash}`
      );
    } catch (err) {
      console.error("Register error:", err);
      setRegisterResult(`Error: ${err?.reason || err?.message || "Registration failed"}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!verifyFile) {
      alert("Choose a file first");
      return;
    }

    try {
      setLoading(true);
      setVerifyResult(null);

      const contract = await getReadContract();
      const fileHash = await hashFile(verifyFile);

      const result = await contract.verifyIP(fileHash);

      setVerifyResult({
        hash: fileHash,
        exists: result[0],
        tokenId: result[1].toString(),
        owner: result[2],
        creator: result[3],
        registeredAt: result[4].toString(),
        metadataURI: result[5],
      });
    } catch (err) {
      console.error("Verify error:", err);
      alert(err?.reason || err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  function shortenAddress(address) {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", fontFamily: "Arial" }}>
      <h1>IP Registry NFT Demo</h1>

      <button type="button" onClick={handleConnect}>
        {account ? `Connected: ${shortenAddress(account)}` : "Connect Wallet"}
      </button>

      <hr style={{ margin: "30px 0" }} />

      <h2>Register IP</h2>
      <input type="file" onChange={(e) => setRegisterFile(e.target.files?.[0] || null)} />
      <br />
      <br />
      <button type="button" onClick={handleRegister} disabled={loading}>
        {loading ? "Processing..." : "Register File"}
      </button>

      {registerResult && (
        <pre style={{ background: "#f4f4f4", padding: "12px", marginTop: "15px" }}>
          {registerResult}
        </pre>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>Verify IP</h2>
      <input type="file" onChange={(e) => setVerifyFile(e.target.files?.[0] || null)} />
      <br />
      <br />
      <button type="button" onClick={handleVerify} disabled={loading}>
        {loading ? "Processing..." : "Verify File"}
      </button>

      {verifyResult && (
        <div style={{ background: "#f4f4f4", padding: "12px", marginTop: "15px" }}>
          <p><strong>Hash:</strong> {verifyResult.hash}</p>
          <p><strong>Exists:</strong> {String(verifyResult.exists)}</p>
          <p><strong>Token ID:</strong> {verifyResult.tokenId}</p>
          <p><strong>Owner:</strong> {shortenAddress(verifyResult.owner)}</p>
          <p><strong>Creator:</strong> {shortenAddress(verifyResult.creator)}</p>
          <p>
            <strong>Registered At:</strong>{" "}
            {new Date(Number(verifyResult.registeredAt) * 1000).toLocaleString()}
          </p>
          <p><strong>Metadata URI:</strong> {verifyResult.metadataURI}</p>
        </div>
      )}
    </div>
  );
}