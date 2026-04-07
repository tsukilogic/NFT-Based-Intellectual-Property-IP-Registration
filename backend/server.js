import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PinataSDK } from "pinata";

dotenv.config();

console.log("JWT loaded:", !!process.env.PINATA_JWT);
console.log("Gateway:", process.env.PINATA_GATEWAY);

const app = express();
app.use(cors());
app.use(express.json());

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY,
});

// 1) Signed URL for uploading the original file from the browser
app.get("/api/pinata/file-url", async (req, res) => {
  try {
    const url = await pinata.upload.public.createSignedURL({
      expires: 30,
      name: "ip-file-upload",
      maxFileSize: 100_000_000, // 100 MB
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