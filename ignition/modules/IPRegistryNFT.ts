import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const IPRegistryNFTModule = buildModule("IPRegistryNFTModule", (m) => {
  const ipRegistryNFT = m.contract("IPRegistryNFT");

  return { ipRegistryNFT };
});

export default IPRegistryNFTModule;