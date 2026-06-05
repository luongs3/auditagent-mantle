/**
 * AuditAgent orchestrator — the autonomous loop.
 *
 *   FETCH   → pull verified source / bytecode from Mantle for a target address
 *   REASON  → static heuristics + (optional) Z.AI semantic pass → findings
 *   SCORE   → aggregate findings into Risk enum + 0-100 safety score
 *   ACT     → sign & send attest() to AttestationRegistry on Mantle Sepolia,
 *             permanently recording the AI's verdict on-chain
 *
 * Usage:
 *   tsx agent/index.ts <targetAddress> [--dry-run]
 *
 * Env (.env):
 *   DEPLOYER_PK         agent wallet private key (writes the attestation)
 *   REGISTRY_ADDRESS    AttestationRegistry address (defaults to deployment.json)
 *   MANTLE_RPC          RPC url (default Mantle Sepolia)
 *   ZAI_API_KEY         optional — enables the LLM reasoning layer
 *   ETHERSCAN_API_KEY   optional — enables verified-source fetch
 */
import { readFileSync } from "node:fs";
import { ethers } from "ethers";
import { fetchContract } from "./fetch.js";
import { analyzeStatic, type Finding } from "./analyzer.js";
import { reasonWithLlm } from "./reasoner.js";
import { aggregate, RISK_LABEL } from "./risk.js";

const RPC = process.env.MANTLE_RPC || "https://rpc.sepolia.mantle.xyz";

const REGISTRY_ABI = [
  "function attest(address target, uint8 risk, uint8 score, bytes32 findingsHash, string reportURI) external returns (uint256)",
  "function total() external view returns (uint256)",
  "function latestOf(address target) external view returns (tuple(address target,uint8 risk,uint8 score,bytes32 findingsHash,string reportURI,address auditor,uint64 timestamp))",
];

function registryAddress(): string {
  if (process.env.REGISTRY_ADDRESS) return process.env.REGISTRY_ADDRESS;
  const dep = JSON.parse(readFileSync(new URL("../deployment.json", import.meta.url), "utf8"));
  return dep.address;
}

export interface AuditResult {
  target: string;
  verified: boolean;
  risk: number;
  riskLabel: string;
  score: number;
  summary: string;
  findings: Finding[];
  reasoning: string;
  brain: "static" | "static+llm";
  findingsHash: string;
  report: object;
}

export async function runAudit(target: string, submittedSource?: string): Promise<AuditResult> {
  if (!ethers.isAddress(target)) throw new Error(`invalid address: ${target}`);

  // 1. FETCH
  console.log(`[1/4 FETCH] ${target}`);
  const fetched = await fetchContract(target, submittedSource);
  if (!fetched.isContract) throw new Error("target is not a contract (no bytecode)");
  console.log(`  verified source: ${fetched.verified ? "yes" : "no"}`);

  // 2. REASON (static + optional LLM)
  console.log(`[2/4 REASON] static analysis…`);
  const stat = analyzeStatic(fetched.source);
  let findings: Finding[] = [...stat.findings];
  let reasoning = "";
  let brain: "static" | "static+llm" = "static";

  const llm = fetched.source ? await reasonWithLlm(fetched.source, stat.findings) : null;
  if (llm) {
    findings = mergeFindings(findings, llm.extraFindings);
    reasoning = llm.reasoning;
    brain = "static+llm";
    console.log(`  LLM (${llm.model}) added ${llm.extraFindings.length} finding(s)`);
  } else {
    console.log(`  LLM skipped (no key) — static-only mode`);
  }

  // 3. SCORE
  const verdict = aggregate(findings, stat.hasSource);
  console.log(
    `[3/4 SCORE] risk=${RISK_LABEL[verdict.risk]} score=${verdict.score}/100 (${findings.length} findings)`,
  );

  const report = {
    target,
    contractName: fetched.contractName,
    verified: fetched.verified,
    brain,
    risk: RISK_LABEL[verdict.risk],
    score: verdict.score,
    summary: verdict.summary,
    reasoning,
    findings,
    auditedAt: new Date().toISOString(),
  };
  const findingsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(report)));

  return {
    target,
    verified: fetched.verified,
    risk: verdict.risk,
    riskLabel: RISK_LABEL[verdict.risk],
    score: verdict.score,
    summary: verdict.summary,
    findings,
    reasoning,
    brain,
    findingsHash,
    report,
  };
}

function mergeFindings(a: Finding[], b: Finding[]): Finding[] {
  const seen = new Set(a.map((f) => f.id));
  return [...a, ...b.filter((f) => !seen.has(f.id))];
}

/** ACT — write the verdict on-chain. */
export async function attestOnChain(
  result: AuditResult,
  reportURI = "",
): Promise<{ txHash: string; id: string }> {
  const pk = process.env.DEPLOYER_PK;
  if (!pk) throw new Error("DEPLOYER_PK not set — cannot sign attestation");
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(pk, provider);
  const registry = new ethers.Contract(registryAddress(), REGISTRY_ABI, wallet);

  console.log(`[4/4 ACT] attesting on-chain via ${await wallet.getAddress()}…`);
  const tx = await registry.attest(
    result.target,
    result.risk,
    result.score,
    result.findingsHash,
    reportURI || `auditagent://${result.target}`,
  );
  const rcpt = await tx.wait();
  const total = await registry.total();
  const id = (total - 1n).toString();
  console.log(`  tx: ${tx.hash} (block ${rcpt.blockNumber}), attestation id=${id}`);
  return { txHash: tx.hash, id };
}

// CLI entrypoint
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const target = process.argv[2];
  const dryRun = process.argv.includes("--dry-run");
  if (!target) {
    console.error("usage: tsx agent/index.ts <targetAddress> [--dry-run]");
    process.exit(1);
  }
  runAudit(target)
    .then(async (r) => {
      console.log("\n=== VERDICT ===");
      console.log(JSON.stringify(r.report, null, 2));
      if (dryRun) {
        console.log("\n(dry-run: not writing on-chain)");
        return;
      }
      const { txHash, id } = await attestOnChain(r);
      console.log(`\nAttested on-chain. id=${id} tx=${txHash}`);
      console.log(`Explorer: https://sepolia.mantlescan.xyz/tx/${txHash}`);
    })
    .catch((e) => {
      console.error("ERROR:", e.message);
      process.exit(1);
    });
}
