import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("IPRegistryNFTModule", (m) => {
  const nft = m.contract("IPRegistryNFT");
  return { nft };
});
