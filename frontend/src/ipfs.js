export async function uploadFileToPinata(file) {
  const fileType = encodeURIComponent(file?.type || "");
  const res = await fetch(`http://localhost:3001/api/pinata/file-url?fileType=${fileType}`);
  const signedUrlJson = await res.json();
  if (!res.ok) {
    throw new Error(signedUrlJson.error || "Failed to create signed upload URL");
  }
  const { url } = signedUrlJson;

  const formData = new FormData();
  formData.append("file", file);

  const upload = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const json = await upload.json();
  if (!upload.ok) {
    throw new Error(json.error || "Failed to upload file to Pinata");
  }

  return {
    cid: json.data.cid,
    ipfsUri: `ipfs://${json.data.cid}`,
  };
}

export async function uploadMetadataToPinata(metadata) {
  const res = await fetch("http://localhost:3001/api/pinata/metadata", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to upload metadata");
  }

  return json;
}