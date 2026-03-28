import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.connect();

  const addr = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const nft = await ethers.getContractAt("IPRegistryNFT", addr);

  // placeholders for now (later replaced by real commitments + encrypted metadata hash)
  const commitment = ethers.keccak256(ethers.toUtf8Bytes("my-first-private-ip"));
  const cipherHash = ethers.keccak256(ethers.toUtf8Bytes("ciphertext-hash-placeholder"));
  const metaURI = "ipfs://placeholder-encrypted-metadata";

  const tx = await nft.register(commitment, metaURI, cipherHash);
  const receipt = await tx.wait();

  console.log("Minted! tx:", receipt?.hash);

  // tokenId should be 1 on first mint
  const record = await nft.records(1);
  console.log("Record tokenId=1:", record);

  const owner = await nft.ownerOf(1);
  console.log("Owner of tokenId=1:", owner);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
