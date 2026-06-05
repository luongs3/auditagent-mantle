// Deploy VulnerableVault (demo audit target) to Mantle Sepolia.
// node --env-file=.env scripts/deploy-vulnerable.mjs
import { network } from "hardhat";
import fs from "node:fs";

const { ethers } = await network.connect({ network: "mantleSepolia" });
const [deployer] = await ethers.getSigners();
console.log("Deployer:", await deployer.getAddress());

const Factory = await ethers.getContractFactory("VulnerableVault");
const c = await Factory.deploy();
await c.waitForDeployment();
const addr = await c.getAddress();
console.log("VulnerableVault deployed:", addr);

const info = JSON.parse(fs.readFileSync("deployment.json", "utf8"));
info.vulnerableVault = addr;
info.vulnerableVaultExplorer = `https://sepolia.mantlescan.xyz/address/${addr}`;
fs.writeFileSync("deployment.json", JSON.stringify(info, null, 2));
console.log("Updated deployment.json");
console.log("Explorer:", info.vulnerableVaultExplorer);
