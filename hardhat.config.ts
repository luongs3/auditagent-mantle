import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

const MANTLE_SEPOLIA_RPC = "https://rpc.sepolia.mantle.xyz";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthers, hardhatVerify],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    mantleSepolia: {
      type: "http",
      url: MANTLE_SEPOLIA_RPC,
      chainId: 5003,
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : [],
    },
  },
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY || "",
    },
    blockscout: {
      enabled: true,
    },
  },
};

export default config;
