import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// Sepolia config is optional: local compile/test needs no network or keys.
// Set SEPOLIA_RPC_URL and EVM_DEPLOYER_PRIVATE_KEY to deploy.
const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.EVM_DEPLOYER_PRIVATE_KEY
        ? [process.env.EVM_DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
