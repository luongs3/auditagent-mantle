// Deploy AttestationRegistry to Mantle Sepolia.
// Usage: node --env-file=.env scripts/deploy.mjs
import { network } from "hardhat";
import fs from "node:fs";

async function main() {
  const { ethers } = await network.connect({ network: "mantleSepolia" });

  const [deployer] = await ethers.getSigners();
  const addr = await deployer.getAddress();
  const bal = await ethers.provider.getBalance(addr);
  console.log("Deployer:", addr);
  console.log("Balance :", ethers.formatEther(bal), "MNT");
  if (bal === 0n) {
    throw new Error("Deployer has 0 MNT — fund it from the Mantle Sepolia faucet first.");
  }

  const Factory = await ethers.getContractFactory("AttestationRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const deployed = await contract.getAddress();

  console.log("AttestationRegistry deployed:", deployed);

  const info = {
    network: "mantleSepolia",
    chainId: 5003,
    address: deployed,
    deployer: addr,
    deployedAt: new Date().toISOString(),
    explorer: `https://explorer.sepolia.mantle.xyz/address/${deployed}`,
  };
  fs.writeFileSync("deployment.json", JSON.stringify(info, null, 2));
  console.log("Wrote deployment.json");
  console.log("Explorer:", info.explorer);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
