import hre from "hardhat";

async function main() {
  // Hardhat 3: you get ethers from a network connection
  const { ethers } = await hre.network.connect();

  const signers = await ethers.getSigners();
  console.log("signers:", signers.length);
  console.log("first signer:", await signers[0].getAddress());

  // sanity: read chain id
  const net = await ethers.provider.getNetwork();
  console.log("chainId:", net.chainId.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
