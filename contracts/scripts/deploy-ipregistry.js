import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const Factory = await ethers.getContractFactory("IPRegistryNFT");
  const contract = await Factory.deploy();

  await contract.waitForDeployment();

  console.log("IPRegistryNFT deployed to:", contract.target);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});