import { ethers } from "ethers";

export async function hashFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  return ethers.keccak256(bytes);
}