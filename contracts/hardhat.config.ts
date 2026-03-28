import { defineConfig, configVariable } from "hardhat/config";

import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatIgnition from "@nomicfoundation/hardhat-ignition";
import hardhatIgnitionEthers from "@nomicfoundation/hardhat-ignition-ethers";

export default defineConfig({
  plugins: [hardhatEthers, hardhatIgnition, hardhatIgnitionEthers],

  solidity: "0.8.28",
  networks: {
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
