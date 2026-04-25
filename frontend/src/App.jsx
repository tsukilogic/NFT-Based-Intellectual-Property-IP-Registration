import { useEffect, useRef, useState, useCallback, forwardRef } from "react";
import {
  connectWallet,
  getCurrentAccount,
  ensureSepoliaNetwork,
  getReadContract,
  getWriteContract,
} from "./contract";
import { hashFile } from "./hashFile";
import { uploadFileToPinata, uploadMetadataToPinata } from "./ipfs";
import "./App.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function ipfsToHttp(uri) {
  if (!uri?.startsWith("ipfs://")) return uri || "";
  return `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`;
}
function txToEtherscan(txHash) {
  if (!txHash) return "";
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}
function tokenToEtherscan(tokenId) {
  if (!tokenId) return "";
  return `https://sepolia.etherscan.io/token/0x791Ba65fFaA280f56Dc6DE9AB64AD627E1dDf3F7?a=${tokenId}`;
}
function shortHash(hash) {
  if (!hash) return "";
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}
async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch { return false; }
}
async function fetchTextContent(uri) {
  const res = await fetch(ipfsToHttp(uri));
  if (!res.ok) throw new Error("Failed to fetch text content");
  return res.text();
}
function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return "-";
  const v = Number(bytes);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 * 1024 * 1024) return `${(v / (1024 * 1024)).toFixed(1)} MB`;
  return `${(v / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
async function fetchIpfsJson(uri) {
  const res = await fetch(ipfsToHttp(uri));
  if (!res.ok) throw new Error("Failed to fetch metadata");
  return res.json();
}
async function fetchFileSizeFromCid(cid) {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`, { method: "HEAD" });
    const cl = response.headers.get("content-length");
    if (cl) return parseInt(cl);
  } catch { /* silent */ }
  return null;
}
function shortenAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
function formatTimestamp(ts) {
  if (!ts || ts === "0") return "—";
  return new Date(Number(ts) * 1000).toLocaleString();
}
function formatDate(ts) {
  if (!ts || ts === "0") return "—";
  return new Date(Number(ts) * 1000).toLocaleDateString();
}

function fileExtension(fileName) {
  if (!fileName || !fileName.includes(".")) return "";
  return fileName.split(".").pop().toLowerCase();
}

const BLOCKED_EXTENSIONS = new Set([
  ".html", ".htm", ".xhtml", ".svg", ".js", ".mjs", ".ts", ".jsx",
  ".exe", ".bat", ".cmd", ".sh", ".apk",
  ".zip", ".rar", ".7z", ".tar", ".gz",
]);

function isBlockedFileType(file) {
  const type = (file?.type || "").toLowerCase();
  const name = (file?.name || "").toLowerCase();
  if (
    type.includes("html") ||
    type === "image/svg+xml" ||
    type.includes("javascript") ||
    type.includes("x-msdownload") ||
    type.includes("octet-stream")
  ) return true;
  return BLOCKED_EXTENSIONS.has("." + name.split(".").pop());
}

function safeLink(uri) {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) return ipfsToHttp(uri);
  if (uri.startsWith("https://")) return uri;
  return "";
}

function formatFileType(type, fileName = "") {
  const ext = fileExtension(fileName);
  const normalized = (type || "").toLowerCase();

  const known = {
    "application/pdf": "PDF",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint (PPTX)",
    "application/vnd.ms-powerpoint": "PowerPoint (PPT)",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word (DOCX)",
    "application/msword": "Word (DOC)",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel (XLSX)",
    "application/vnd.ms-excel": "Excel (XLS)",
    "image/jpeg": "JPEG Image",
    "image/png": "PNG Image",
    "image/gif": "GIF Image",
    "image/webp": "WEBP Image",
    "text/plain": "Text",
    "text/markdown": "Markdown",
    "audio/mpeg": "MP3 Audio",
    "video/mp4": "MP4 Video",
  };

  if (known[normalized]) return known[normalized];
  if (normalized.startsWith("image/")) return "Image";
  if (normalized.startsWith("text/")) return "Text";
  if (normalized.startsWith("audio/")) return "Audio";
  if (normalized.startsWith("video/")) return "Video";
  if (ext) return ext.toUpperCase();
  return "Unknown";
}

function isPresentationType(type, fileName = "") {
  const normalized = (type || "").toLowerCase();
  const ext = fileExtension(fileName);
  if (
    normalized === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    normalized === "application/vnd.ms-powerpoint"
  ) return true;
  return ext === "pptx" || ext === "ppt" || ext === "ppsx" || ext === "pps";
}

/* ─── sub-components ──────────────────────────────────────────────────────── */
function FilePreview({ metadata, textContent, previewRef }) {
  if (!metadata?.fileIpfsUri) return null;
  const fileUrl = safeLink(metadata.fileIpfsUri);
  if (!fileUrl) return null;
  const type = metadata.fileType || "";
  const displayType = formatFileType(type, metadata.fileName || metadata.name);
  const isPresentation = isPresentationType(type, metadata.fileName || metadata.name);
  if (type.startsWith("image/"))
    return <img ref={previewRef} src={fileUrl} alt="Preview" className="image-preview" />;
  if (type.startsWith("text/"))
    return <div ref={previewRef} className="meta-block"><strong>Preview:</strong><pre className="metadata-pre">{textContent || "Loading…"}</pre></div>;
  if (type === "application/pdf")
    return (
      <div ref={previewRef} className="pdf-preview-wrap">
        <div className="pdf-preview-header">
          <strong>PDF Preview</strong>
          <a href={fileUrl} target="_blank" rel="noreferrer" className="pdf-open-link">Open in new tab ↗</a>
        </div>
        <iframe
          src={fileUrl.startsWith("https://") ? fileUrl : ""}
          title="PDF Preview"
          className="pdf-preview"
        />
      </div>
    );
  if (isPresentation)
    return (
      <div ref={previewRef} className="pdf-preview-wrap">
        <div className="pdf-preview-header">
          <strong>Presentation Preview</strong>
          <a href={fileUrl} target="_blank" rel="noreferrer" className="pdf-open-link">Open in new tab ↗</a>
        </div>
        <iframe
          src={fileUrl.startsWith("https://") ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}` : ""}
          title="Presentation Preview"
          className="pdf-preview"
        />
      </div>
    );
  if (type.startsWith("audio/"))
    return <div ref={previewRef} className="meta-block"><strong>Preview:</strong><audio controls src={fileUrl} style={{ width: "100%", marginTop: "10px" }} /></div>;
  if (type.startsWith("video/"))
    return <div ref={previewRef} className="meta-block"><strong>Preview:</strong><video controls src={fileUrl} style={{ width: "100%", maxWidth: "500px", marginTop: "10px", borderRadius: "8px" }} /></div>;
  return <div ref={previewRef} className="meta-block"><p className="muted">No preview for {displayType}.</p><a href={fileUrl} target="_blank" rel="noreferrer">Open file ↗</a></div>;
}

function DetailsSection({ title = "Advanced details", children }) {
  return (
    <details className="details-section">
      <summary>{title}</summary>
      <div className="details-content">{children}</div>
    </details>
  );
}

const SuccessCard = forwardRef(function SuccessCard({ children }, ref) { return <div className="card success-card" ref={ref}>{children}</div>; });
const WarningCard = forwardRef(function WarningCard({ children }, ref) { return <div className="card warning-card" ref={ref}>{children}</div>; });
function EmptyState({ text }) { return <div className="empty-state"><p>{text}</p></div>; }

/* ─── compact expandable token row ───────────────────────────────────────── */
function TokenRow({ item, onCopy }) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);
  const nameRef = useRef(null);
  const name     = item.metadata?.name || "—";
  const fileType = formatFileType(item.metadata?.fileType, item.metadata?.fileName || item.metadata?.name);
  const fileSize = item.metadata?.fileSize ? formatFileSize(item.metadata.fileSize) : "—";

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => {
      const el = drawerRef.current;
      if (!el) return;
      const nameEl = nameRef.current;
      const rect = el.getBoundingClientRect();
      if (rect.bottom > window.innerHeight) {
        // Drawer extends below viewport — scroll down
        (nameEl || el).scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (rect.top < 0) {
        // Drawer is above viewport — scroll up
        (nameEl || el).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 450);
    return () => clearTimeout(id);
  }, [open]);

  return (
    <>
      <tr className={`token-row${open ? " token-row--open" : ""}`} onClick={() => setOpen(o => !o)}>
        <td className="td-id">#{item.tokenId}</td>
        <td className="td-name" title={name} ref={nameRef}>{name}</td>
        <td className="td-type">{fileType}</td>
        <td className="td-size">{fileSize}</td>
        <td className="td-date">{formatDate(item.registeredAt)}</td>
        <td className="td-chevron"><span className={`chevron-icon${open ? " chevron-icon--open" : ""}`}>▼</span></td>
      </tr>
      <tr className={`token-drawer${open ? " token-drawer--open" : ""}`} ref={drawerRef}>
          <td colSpan={6}>
            <div className="token-drawer-inner">
              <div className="token-drawer-grid">
                <div>
                  <p><strong>Hash:</strong> {shortHash(item.fileHash)}
                    <button className="copy-btn" onClick={e => { e.stopPropagation(); onCopy(item.fileHash, "Hash"); }}>Copy</button>
                  </p>
                  <p><strong>Creator:</strong> {shortenAddress(item.creator)}</p>
                  <p><strong>Owner:</strong> {shortenAddress(item.owner)}</p>
                  <p><strong>Registered:</strong> {formatTimestamp(item.registeredAt)}</p>
                  {item.metadata?.fileCid && <p><strong>CID:</strong> {shortHash(item.metadata.fileCid)}</p>}
                  {item.metadata?.fileSize && <p><strong>Size:</strong> {formatFileSize(item.metadata.fileSize)}</p>}
                </div>
                <div>
                  <p><strong>Metadata:</strong> <a href={ipfsToHttp(item.metadataURI)} target="_blank" rel="noreferrer">IPFS ↗</a></p>
                  {item.metadata?.fileIpfsUri && (
                    <p><strong>File:</strong> <a href={safeLink(item.metadata.fileIpfsUri)} target="_blank" rel="noreferrer">View ↗</a></p>
                  )}
                  <p><strong>NFT:</strong> <a href={tokenToEtherscan(item.tokenId)} target="_blank" rel="noreferrer">Etherscan ↗</a></p>
                </div>
              </div>
              {item.metadata && <FilePreview metadata={item.metadata} textContent={item.textPreview} />}
            </div>
          </td>
        </tr>
    </>
  );
}

/* ─── main ────────────────────────────────────────────────────────────────── */
export default function App() {
  const [accounts, setAccounts]               = useState([]);
  const [activeAccount, setActiveAccount]     = useState("");
  const [registerFile, setRegisterFile]       = useState(null);
  const [verifyFile, setVerifyFile]           = useState(null);
  const [registerResult, setRegisterResult]   = useState(null);
  const [verifyResult, setVerifyResult]       = useState(null);
  const [myTokens, setMyTokens]               = useState([]);
  const [totalRegistered, setTotalRegistered] = useState("0");
  const [loading, setLoading]                 = useState(false);
  const [connecting, setConnecting]           = useState(false);
  const [copyMessage, setCopyMessage]         = useState("");
  const [progressStep, setProgressStep]       = useState("");
  const [progressType, setProgressType]       = useState("idle");
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  function updateProgress(step, type = "loading") {
    setProgressStep(step);
    setProgressType(type);
  }

  const loadGlobalStats = useCallback(async () => {
    try {
      const contract = await getReadContract();
      const total = await contract.totalRegistered();
      setTotalRegistered(total.toString());
    } catch (err) { console.error("Failed to load stats:", err); }
  }, []);

  const loadMyRegistrations = useCallback(async (account) => {
    try {
      if (!account) return;
      setLoadingRegistrations(true);
      updateProgress("Loading your registrations...", "loading");
      const contract = await getReadContract();
      const tokenIds = await contract.getMyTokenIds(account);
      const details  = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const record = await contract.getRecordByTokenId(tokenId);
          let metadata = null, textPreview = null;
          try {
            metadata = await fetchIpfsJson(record.metadataURI);
            if (metadata && !metadata.fileSize && metadata.fileCid) {
              const size = await fetchFileSizeFromCid(metadata.fileCid);
              if (size) metadata.fileSize = size;
            }
            if (metadata?.fileType?.startsWith("text/") && metadata?.fileIpfsUri)
              textPreview = await fetchTextContent(metadata.fileIpfsUri);
          } catch (err) { console.warn("Token metadata failed", tokenId.toString(), err); }
          return { tokenId: tokenId.toString(), fileHash: record.fileHash, registeredAt: record.registeredAt.toString(), creator: record.creator, owner: record.owner, metadataURI: record.metadataURI, metadata, textPreview };
        })
      );
      setMyTokens(details);
      setLoadingRegistrations(false);
      if (details.length > 0) updateProgress(`Loaded ${details.length} registration(s).`, "success");
      else setProgressStep("");
    } catch (err) {
      console.error("Failed to load my registrations", err);
      setLoadingRegistrations(false);
      updateProgress("Failed to load registrations.", "error");
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        if (!window.ethereum) return;
        const current = await getCurrentAccount();
        if (current) { setAccounts([current]); setActiveAccount(current); }
        await loadGlobalStats();
        const handleAccountsChanged = (a) => { setAccounts(a || []); setActiveAccount(a?.[0] || ""); setMyTokens([]); };
        const handleChainChanged = () => window.location.reload();
        window.ethereum.on?.("accountsChanged", handleAccountsChanged);
        window.ethereum.on?.("chainChanged", handleChainChanged);
        return () => { window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged); window.ethereum.removeListener?.("chainChanged", handleChainChanged); };
      } catch (err) { console.error("Init error:", err); }
    }
    let cleanup;
    init().then(fn => { cleanup = fn; });
    return () => { if (cleanup) cleanup(); };
  }, [loadGlobalStats]);

  useEffect(() => {
    if (activeAccount) { loadMyRegistrations(activeAccount); loadGlobalStats(); }
  }, [activeAccount, loadMyRegistrations, loadGlobalStats]);

  async function handleConnect() {
    try {
      updateProgress("Connecting to MetaMask...", "loading");
      setConnecting(true);
      await ensureSepoliaNetwork();
      updateProgress("Requesting wallet access...", "loading");
      const allAccounts = await connectWallet();
      setAccounts(allAccounts || []);
      setActiveAccount(allAccounts?.[0] || "");
      updateProgress("Wallet connected successfully.", "success");
    } catch (err) {
      if      (err?.code === 4001)   updateProgress("You rejected the MetaMask request.", "error");
      else if (err?.code === -32002) updateProgress("MetaMask request already pending.", "error");
      else                           updateProgress(err?.message || "Failed to connect.", "error");
    } finally { setConnecting(false); }
  }

  function handleDisconnect() {
    if (connecting || loadingRegistrations) return;
    setAccounts([]); setActiveAccount(""); setRegisterResult(null); setVerifyResult(null); setMyTokens([]);
    setProgressStep(""); setProgressType("idle");
    setTimeout(() => { updateProgress("Disconnected from wallet.", "success"); setTimeout(() => setProgressStep(""), 3500); }, 100);
  }

  async function handleCopy(text, label) {
    const ok = await copyToClipboard(text);
    setCopyMessage(ok ? `${label} copied` : `Failed to copy ${label}`);
    setTimeout(() => setCopyMessage(""), 2000);
  }

  function handleClearVerifyPreview() {
    setVerifyResult(null);
  }

  function handleClearRegisterPreview() {
    setRegisterResult(null);
  }

  async function handleRegister() {
    if (!activeAccount) return updateProgress("Connect MetaMask first.", "error");
    if (!registerFile)  return updateProgress("Choose a file first.", "error");
    if (registerFile.size > MAX_FILE_SIZE) return updateProgress(`File too large. Max ${formatBytes(MAX_FILE_SIZE)}.`, "error");
    try {
      setLoading(true); setRegisterResult(null);
      updateProgress("Preparing registration...");
      await ensureSepoliaNetwork();
      const fileHash = await hashFile(registerFile);
      console.log("Computed client-side Keccak-256 hash:", fileHash);
      updateProgress("Checking for duplicates...");
      const readContract = await getReadContract();
      const existing = await readContract.verifyIP(fileHash);
      if (existing.exists) {
        let metadata = null, textPreview = null;
        try {
          metadata = await fetchIpfsJson(existing.metadataURI);
          if (metadata && !metadata.fileSize && metadata.fileCid) { const s = await fetchFileSizeFromCid(metadata.fileCid); if (s) metadata.fileSize = s; }
          if (metadata?.fileType?.startsWith("text/") && metadata?.fileIpfsUri) textPreview = await fetchTextContent(metadata.fileIpfsUri);
        } catch { /* silent */ }
        setRegisterResult({ hash: fileHash, txHash: null, blockNumber: null, exists: true, tokenId: existing.tokenId.toString(), owner: existing.owner, creator: existing.creator, registeredAt: existing.registeredAt.toString(), metadataURI: existing.metadataURI, metadata, textPreview });
        updateProgress("This file is already registered on-chain.", "success");
        return;
      }
      updateProgress("Uploading file to IPFS...");
      const uploadedFile = await uploadFileToPinata(registerFile);
      updateProgress("Uploading metadata to IPFS...");
      const metadataObject = { name: registerFile.name, description: "IP Registration NFT", fileName: registerFile.name, fileType: registerFile.type || "unknown", fileSize: registerFile.size || 0, fileHash, fileCid: uploadedFile.cid, fileIpfsUri: uploadedFile.ipfsUri, owner: activeAccount, createdAt: new Date().toISOString() };
      const uploadedMetadata = await uploadMetadataToPinata(metadataObject);
      if (!uploadedMetadata?.ipfsUri?.startsWith("ipfs://")) throw new Error("Metadata upload did not return a valid ipfsUri.");
      updateProgress("Waiting for wallet confirmation...");
      const contract = await getWriteContract();
      await contract.registerIP.staticCall(fileHash, uploadedMetadata.ipfsUri);
      const tx = await contract.registerIP(fileHash, uploadedMetadata.ipfsUri);
      updateProgress("Mining transaction...");
      const receipt = await tx.wait();
      const verified = await readContract.verifyIP(fileHash);
      let metadata = null, textPreview = null;
      try {
        metadata = await fetchIpfsJson(verified.metadataURI);
        if (metadata?.fileType?.startsWith("text/") && metadata?.fileIpfsUri) textPreview = await fetchTextContent(metadata.fileIpfsUri);
      } catch { /* silent */ }
      setRegisterResult({ hash: fileHash, txHash: tx.hash, blockNumber: receipt.blockNumber, exists: verified.exists, tokenId: verified.tokenId.toString(), owner: verified.owner, creator: verified.creator, registeredAt: verified.registeredAt.toString(), metadataURI: verified.metadataURI, metadata, textPreview });
      updateProgress("Registration successful.", "success");
      await loadGlobalStats();
      await loadMyRegistrations(activeAccount);
    } catch (err) {
      console.error("Register error:", err);
      let message = "Registration failed.";
      if (err?.message?.includes("Hash already registered")) message = "This file is already registered.";
      else if (err?.code === 4001) message = "Transaction rejected.";
      else if (err?.code === "CALL_EXCEPTION") { const m = err?.message?.match(/reason="([^"]+)"/); message = m ? `Contract error: ${m[1]}` : "Contract rejected the transaction."; }
      else if (err?.message) message = err.message.split("(")[0].trim();
      updateProgress(message, "error");
    } finally { setLoading(false); }
  }

  async function handleVerify() {
    if (!verifyFile) return updateProgress("Choose a file to verify.", "error");
    try {
      setLoading(true); setVerifyResult(null);
      updateProgress("Hashing file...");
      await ensureSepoliaNetwork();
      const contract = await getReadContract();
      const fileHash = await hashFile(verifyFile);
      updateProgress("Querying registry...");
      const result = await contract.verifyIP(fileHash);
      let metadata = null, textPreview = null;
      if (result.exists) {
        try {
          metadata = await fetchIpfsJson(result.metadataURI);
          if (metadata?.fileType?.startsWith("text/") && metadata?.fileIpfsUri) textPreview = await fetchTextContent(metadata.fileIpfsUri);
        } catch { /* silent */ }
      }
      setVerifyResult({ hash: fileHash, exists: result.exists, tokenId: result.tokenId.toString(), owner: result.owner, creator: result.creator, registeredAt: result.registeredAt.toString(), metadataURI: result.metadataURI, metadata, textPreview });
      updateProgress(result.exists ? "File found in registry." : "File is not registered.", result.exists ? "success" : "error");
    } catch (err) {
      updateProgress(err?.reason || err?.message || "Verification failed.", "error");
    } finally { setLoading(false); }
  }

  return (
    <div className="container">

      {/* Hero */}
      <div className="hero-card">
        <div className="hero-top">
          <div>
            <h1 className="title">IP Registry NFT</h1>
            <p className="subtitle">Register files on IPFS, mint ownership proof on Sepolia, and verify by hash.</p>
          </div>
          <div className="badge-group">
            <span className="badge network">Sepolia</span>
            {activeAccount ? <span className="badge wallet">{shortenAddress(activeAccount)}</span> : <span className="badge muted-badge">Not connected</span>}
          </div>
        </div>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-label">Total Registered</div><div className="stat-value">{totalRegistered}</div></div>
          <div className="stat-card"><div className="stat-label">Network</div><div className="stat-value">Sepolia</div></div>
          <div className="stat-card"><div className="stat-label">Status</div><div className="stat-value">{activeAccount ? "Connected" : "Disconnected"}</div></div>
        </div>
      </div>

      {/* Wallet */}
      <div className="row top-actions">
        <button type="button" className="button" onClick={handleConnect} disabled={connecting}>
          {connecting ? "Connecting..." : activeAccount ? "Wallet Connected" : "Connect Wallet"}
        </button>
        {activeAccount && (
          <button type="button" className="button danger" onClick={handleDisconnect} disabled={connecting || loadingRegistrations}>Disconnect</button>
        )}
      </div>

      {accounts.length > 1 && (
        <div className="account-switcher">
          <strong>Switch account:</strong>
          <select value={activeAccount} onChange={e => setActiveAccount(e.target.value)}>
            {accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
          </select>
        </div>
      )}

      {progressStep && (
        <div className={`status status-${progressType}`}>
          {progressType === "loading" && <span className="loader-inline" />}
          <strong>Status:</strong> {progressStep}
        </div>
      )}
      {copyMessage && <div className="status">{copyMessage}</div>}

      <hr className="divider" />

      {/* Register */}
      <div className="card">
        <h2 className="section-title">Register IP</h2>
        <div className="input">
          <input type="file" onChange={e => {
            const file = e.target.files?.[0] || null;
            if (!file) { setRegisterFile(null); setProgressStep(""); return; }
            if (file.size > MAX_FILE_SIZE) { setRegisterFile(null); updateProgress(`File too large. Max ${formatBytes(MAX_FILE_SIZE)}.`, "error"); e.target.value = ""; return; }
            if (file && isBlockedFileType(file)) { setRegisterFile(null); updateProgress("Invalid file type.", "error"); e.target.value = ""; return; }
            setRegisterFile(file);
            updateProgress(`Ready to register: ${file.name} (${formatBytes(file.size)})`, "success");
          }} />
          <p className="muted">Max file size: {formatBytes(MAX_FILE_SIZE)}</p>
        </div>
        <div className="row">
          <button type="button" className="button" onClick={handleRegister} disabled={loading || !activeAccount}>
            {loading ? "Processing..." : "Register File"}
          </button>
          <button
            type="button"
            className="button danger"
            onClick={handleClearRegisterPreview}
            disabled={loading || !registerResult}
          >
            Clear Preview
          </button>
        </div>

        {registerResult && registerResult.txHash === null && (
          <WarningCard>
            <h3 className="subsection-title">Already Registered</h3>
            <p>⚠ This file is already on-chain.</p>
            <p><strong>Token ID:</strong> {registerResult.tokenId}</p>
            <p><strong>Owner:</strong> {shortenAddress(registerResult.owner)}</p>
            <p><a href={tokenToEtherscan(registerResult.tokenId)} target="_blank" rel="noreferrer">View NFT on Etherscan ↗</a></p>
          </WarningCard>
        )}

        {registerResult && registerResult.txHash && (
          <SuccessCard>
            <h3 className="subsection-title">Registration Successful</h3>
            <p>✅ Minted on blockchain</p>
            <p><strong>Name:</strong> {registerResult.metadata?.name || "-"}</p>
            <p><strong>Type:</strong> {formatFileType(registerResult.metadata?.fileType, registerResult.metadata?.fileName || registerResult.metadata?.name)}</p>
            <p><strong>Token ID:</strong> {registerResult.tokenId}</p>
            <p><strong>Owner:</strong> {shortenAddress(registerResult.owner)}</p>
            <p>
              <strong>Tx:</strong> {shortHash(registerResult.txHash)}
              <button className="copy-btn" onClick={() => handleCopy(registerResult.txHash, "Transaction hash")}>Copy</button>{" "}
              <a href={txToEtherscan(registerResult.txHash)} target="_blank" rel="noreferrer">Etherscan ↗</a>
            </p>
            {registerResult.metadataURI && <p><strong>Metadata:</strong> <a href={ipfsToHttp(registerResult.metadataURI)} target="_blank" rel="noreferrer">IPFS ↗</a></p>}
            {registerResult.metadata?.fileIpfsUri && <p><strong>File:</strong> <a href={ipfsToHttp(registerResult.metadata.fileIpfsUri)} target="_blank" rel="noreferrer">View ↗</a></p>}
            {registerResult.metadata && <FilePreview metadata={registerResult.metadata} textContent={registerResult.textPreview} />}
            <DetailsSection>
              <p><strong>Hash:</strong> {shortHash(registerResult.hash)}<button className="copy-btn" onClick={() => handleCopy(registerResult.hash, "Hash")}>Copy</button></p>
              <p><strong>Creator:</strong> {registerResult.creator}</p>
              <p><strong>Owner:</strong> {registerResult.owner}</p>
              <p><strong>Registered At:</strong> {formatTimestamp(registerResult.registeredAt)}</p>
              {registerResult.blockNumber && <p><strong>Block:</strong> {registerResult.blockNumber}</p>}
              {registerResult.metadata && <>
                <p><strong>CID:</strong> {registerResult.metadata.fileCid}</p>
                <p><strong>Size:</strong> {formatFileSize(registerResult.metadata.fileSize)}</p>
                <p><strong>Uploaded:</strong> {registerResult.metadata.createdAt}</p>
              </>}
            </DetailsSection>
          </SuccessCard>
        )}
      </div>

      <hr className="divider" />

      {/* Verify */}
      <div className="card">
        <h2 className="section-title">Verify IP</h2>
        <div className="input">
          <input type="file" onChange={e => {
            const file = e.target.files?.[0] || null;
            if (!file) { setVerifyFile(null); setProgressStep(""); return; }
            if (file.size > MAX_FILE_SIZE) { setVerifyFile(null); updateProgress(`File too large. Max ${formatBytes(MAX_FILE_SIZE)}.`, "error"); e.target.value = ""; return; }
            if (file && isBlockedFileType(file)) { setVerifyFile(null); updateProgress("Invalid file type.", "error"); e.target.value = ""; return; }
            setVerifyFile(file);
            updateProgress(`Ready to verify: ${file.name} (${formatBytes(file.size)})`, "success");
          }} />
          <p className="muted">Max file size: {formatBytes(MAX_FILE_SIZE)}</p>
        </div>
        <div className="row">
          <button type="button" className="button secondary" onClick={handleVerify} disabled={loading}>
            {loading ? "Checking..." : "Verify File"}
          </button>
          <button
            type="button"
            className="button danger"
            onClick={handleClearVerifyPreview}
            disabled={loading || !verifyResult}
          >
            Clear Preview
          </button>
        </div>

        {!verifyResult && <EmptyState text="Upload a file to verify ownership." />}

        {verifyResult && (
          <div className="meta-block verify-result-compact">
            <h3 className="subsection-title">Verification Result</h3>
            <div className="verify-compact-grid">
              <p className="compact-item"><strong>Hash:</strong> {shortHash(verifyResult.hash)}<button className="copy-btn" onClick={() => handleCopy(verifyResult.hash, "Hash")}>Copy</button></p>
              <p className="compact-item"><strong>Registered:</strong>{" "}
                {verifyResult.exists ? <span className="badge-registered">✓ Yes</span> : <span className="badge-unregistered">✗ No</span>}
              </p>
              {verifyResult.exists && <>
                <p className="compact-item"><strong>Name:</strong> {verifyResult.metadata?.name || "-"}</p>
                <p className="compact-item"><strong>Type:</strong> {formatFileType(verifyResult.metadata?.fileType, verifyResult.metadata?.fileName || verifyResult.metadata?.name)}</p>
                <p className="compact-item"><strong>Token ID:</strong> {verifyResult.tokenId}</p>
                <p className="compact-item"><strong>Owner:</strong> {shortenAddress(verifyResult.owner)}</p>
                <p className="compact-item"><strong>Metadata:</strong> <a href={ipfsToHttp(verifyResult.metadataURI)} target="_blank" rel="noreferrer">IPFS ↗</a></p>
                {verifyResult.metadata?.fileIpfsUri && <p className="compact-item"><strong>File:</strong> <a href={ipfsToHttp(verifyResult.metadata.fileIpfsUri)} target="_blank" rel="noreferrer">View ↗</a></p>}
              </>}
            </div>
            {verifyResult.exists && <>
              {verifyResult.metadata && <FilePreview metadata={verifyResult.metadata} textContent={verifyResult.textPreview} />}
              <DetailsSection>
                <p><strong>Creator:</strong> {verifyResult.creator}</p>
                <p><strong>Owner:</strong> {verifyResult.owner}</p>
                <p><strong>Registered At:</strong> {formatTimestamp(verifyResult.registeredAt)}</p>
                {verifyResult.metadata && <>
                  <p><strong>CID:</strong> {verifyResult.metadata.fileCid}</p>
                  <p><strong>Size:</strong> {formatFileSize(verifyResult.metadata.fileSize)}</p>
                </>}
              </DetailsSection>
            </>}
          </div>
        )}
      </div>

      <hr className="divider" />

      {/* My Registrations — compact table */}
      <div className="card">
        <h2 className="section-title">
          My Registrations
          {myTokens.length > 0 && <span className="token-count">{myTokens.length}</span>}
        </h2>

        {!activeAccount ? (
          <p className="muted">Connect your wallet to view your registrations.</p>
        ) : loadingRegistrations ? (
          <div className="section-loading">
            <span className="section-loading-text">Loading registrations</span>
            <span className="loading-dots" aria-hidden="true"><span /><span /><span /></span>
          </div>
        ) : myTokens.length === 0 ? (
          <EmptyState text="You haven't registered any files yet." />
        ) : (
          <div className="token-table-wrap">
            <table className="token-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {myTokens.map(item => (
                  <TokenRow key={item.tokenId} item={item} onCopy={handleCopy} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
