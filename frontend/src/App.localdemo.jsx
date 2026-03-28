import { useState } from "react";
import { connectWallet, getContract } from "./contract.localdemo";
import { hashFile } from "./hashFile";

export default function App() {
  const [account, setAccount] = useState("");
  const [registerFile, setRegisterFile] = useState(null);
  const [verifyFile, setVerifyFile] = useState(null);
  const [registerResult, setRegisterResult] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    try {
      const acc = await connectWallet();
      setAccount(acc);
    } catch (err) {
      alert(err.message);
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

      const contract = await getContract();
      const fileHash = await hashFile(registerFile);

      const tx = await contract.registerIP(fileHash, "ipfs://demo-metadata");
      await tx.wait();

      setRegisterResult(
        `Registered successfully.\nHash: ${fileHash}\nTx: ${tx.hash}`
      );
    } catch (err) {
      setRegisterResult(`Error: ${err.reason || err.message}`);
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

      const contract = await getContract();
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
      alert(err.reason || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", fontFamily: "Arial" }}>
      <h1>IP Registry NFT Demo</h1>

      <button onClick={handleConnect}>
        {account ? `Connected: ${account}` : "Connect Wallet"}
      </button>

      <hr style={{ margin: "30px 0" }} />

      <h2>Register IP</h2>
      <input type="file" onChange={(e) => setRegisterFile(e.target.files[0])} />
      <br />
      <br />
      <button onClick={handleRegister} disabled={loading}>
        Register File
      </button>

      {registerResult && (
        <pre style={{ background: "#f4f4f4", padding: "12px", marginTop: "15px" }}>
          {registerResult}
        </pre>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>Verify IP</h2>
      <input type="file" onChange={(e) => setVerifyFile(e.target.files[0])} />
      <br />
      <br />
      <button onClick={handleVerify} disabled={loading}>
        Verify File
      </button>

      {verifyResult && (
        <div style={{ background: "#f4f4f4", padding: "12px", marginTop: "15px" }}>
          <p><strong>Hash:</strong> {verifyResult.hash}</p>
          <p><strong>Exists:</strong> {String(verifyResult.exists)}</p>
          <p><strong>Token ID:</strong> {verifyResult.tokenId}</p>
          <p><strong>Owner:</strong> {verifyResult.owner}</p>
          <p><strong>Creator:</strong> {verifyResult.creator}</p>
          <p>
            <strong>Registered At:</strong>{""} 
            {new Date(Number(verifyResult.registeredAt) * 1000).toLocaleString()}
          </p>
          <p><strong>Metadata URI:</strong> {verifyResult.metadataURI}</p>
        </div>
      )}
    </div>
  );
}