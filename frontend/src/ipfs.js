export async function uploadFileToPinata(file) {
  const res = await fetch("http://localhost:3001/api/pinata/file-url");
  const { url } = await res.json();

  const formData = new FormData();
  formData.append("file", file);

  const upload = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const json = await upload.json();

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

  return res.json();
}