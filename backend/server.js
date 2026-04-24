import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PinataSDK } from "pinata";
import rateLimit from "express-rate-limit";

dotenv.config();

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_FILE_TYPE_LABEL = "most file types except HTML, SVG, scripts, executables, and archives";

const BLOCKED_EXTENSIONS = new Set([
  ".html", ".htm", ".xhtml", ".svg", ".js", ".mjs", ".ts", ".jsx",
  ".exe", ".bat", ".cmd", ".sh", ".apk",
  ".zip", ".rar", ".7z", ".tar", ".gz",
]);

function isBlockedFileType(type, name) {
  const t = (type || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (
    t.includes("html") ||
    t === "image/svg+xml" ||
    t.includes("javascript") ||
    t.includes("x-msdownload") ||
    t.includes("octet-stream")
  ) return true;
  return BLOCKED_EXTENSIONS.has("." + n.split(".").pop());
}

function isValidMetadata(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const requiredStrings = ["name", "fileName", "fileType", "fileHash", "fileCid", "fileIpfsUri", "owner", "createdAt"];
  for (const field of requiredStrings) {
    if (typeof data[field] !== "string" || data[field].length === 0 || data[field].length > 500) return false;
  }
  if ("fileSize" in data && typeof data.fileSize !== "number") return false;
  return true;
}

console.log("JWT loaded:", !!process.env.PINATA_JWT);
console.log("Gateway:", process.env.PINATA_GATEWAY);

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map(o => o.trim());
app.use(cors({ origin: allowedOrigins }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", apiLimiter);

app.use(express.json());

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

// 1) Signed URL for uploading the original file from the browser
app.get("/api/pinata/file-url", async (req, res) => {
  try {
    const fileType = String(req.query.fileType || "");

    if (isBlockedFileType(fileType, "")) {
      return res.status(400).json({
        error: `File type not allowed: ${ALLOWED_FILE_TYPE_LABEL}.`,
      });
    }

    const url = await pinata.upload.public.createSignedURL({
      expires: 30,
      name: "ip-file-upload",
      maxFileSize: MAX_FILE_SIZE,
    });

    res.json({ url });
  } catch (error) {
    console.error("Signed URL error:", error);
    res.status(500).json({ error: "Failed to create signed upload URL" });
  }
});

// 2) Upload metadata JSON from server side
app.post("/api/pinata/metadata", async (req, res) => {
  try {
    const metadataObject = req.body;

    if (!isValidMetadata(metadataObject)) {
      return res.status(400).json({ error: "Invalid or malformed metadata payload." });
    }

    if (isBlockedFileType(String(metadataObject.fileType || ""), String(metadataObject.fileName || ""))) {
      return res.status(400).json({
        error: `File type not allowed: ${ALLOWED_FILE_TYPE_LABEL}.`,
      });
    }

    const metadataBlob = new Blob(
      [JSON.stringify(metadataObject, null, 2)],
      { type: "application/json" }
    );

    const upload = await pinata.upload.public.file(metadataBlob, {
      name: `${metadataObject.fileName || "metadata"}.json`,
    });

    res.json({
      cid: upload.cid,
      ipfsUri: `ipfs://${upload.cid}`,
      gatewayUrl: `https://${process.env.PINATA_GATEWAY}/ipfs/${upload.cid}`,
    });
  } catch (error) {
    console.error("Metadata upload error:", error);
    res.status(500).json({ error: "Failed to upload metadata" });
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Backend running on port ${process.env.PORT || 3001}`);
});