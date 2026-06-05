/**
 * AuditAgent HTTP API.
 *
 * Endpoints:
 *   GET  /health                      → liveness
 *   GET  /api/registry                → { address, chainId, total }
 *   GET  /api/attestations?limit=N    → recent on-chain attestations (read from Mantle)
 *   GET  /api/attestation/:target     → latest attestation for a target
 *   POST /api/audit { address, source?, attest? }
 *        → runs the agent (FETCH→REASON→SCORE), optionally ACTs on-chain, returns the report
 *
 * Reads are public + cheap. POST /api/audit with attest=true signs an on-chain tx
 * (agent wallet) and is the live "AI decision written on-chain" action.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import { readFileSync } from "node:fs";
import { ethers } from "ethers";
import { runAudit, attestOnChain } from "../agent/index.js";

const PORT = Number(process.env.PORT || 8790);
const RPC = process.env.MANTLE_RPC || "https://rpc.sepolia.mantle.xyz";

function registryAddress(): string {
  if (process.env.REGISTRY_ADDRESS) return process.env.REGISTRY_ADDRESS;
  const dep = JSON.parse(readFileSync(new URL("../deployment.json", import.meta.url), "utf8"));
  return dep.address;
}

const REGISTRY_ABI = [
  "function total() view returns (uint256)",
  "function attestations(uint256) view returns (address target,uint8 risk,uint8 score,bytes32 findingsHash,string reportURI,address auditor,uint64 timestamp)",
  "function latestOf(address) view returns (tuple(address target,uint8 risk,uint8 score,bytes32 findingsHash,string reportURI,address auditor,uint64 timestamp))",
];

const RISK_LABEL = ["Unknown", "Low", "Medium", "High", "Critical"];
const provider = new ethers.JsonRpcProvider(RPC);
const registry = new ethers.Contract(registryAddress(), REGISTRY_ABI, provider);

function fmtAttestation(a: any, id: number) {
  return {
    id,
    target: a.target,
    risk: Number(a.risk),
    riskLabel: RISK_LABEL[Number(a.risk)] || "Unknown",
    score: Number(a.score),
    findingsHash: a.findingsHash,
    reportURI: a.reportURI,
    auditor: a.auditor,
    timestamp: Number(a.timestamp),
    txExplorer: `https://sepolia.mantlescan.xyz/address/${a.target}`,
  };
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Serve the static frontend (same-origin with the API → no CORS/proxy needed).
app.use(express.static(new URL("../public", import.meta.url).pathname));

// In-memory audit cache: keyed by target address (lowercased). Keeps the demo
// snappy and shields the rate-limited free LLM tier from repeated identical calls.
const auditCache = new Map<string, { at: number; result: any }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

app.get("/health", (_req, res) => res.json({ ok: true, service: "auditagent", time: Date.now() }));

app.get("/api/registry", async (_req, res) => {
  try {
    const total = await registry.total();
    res.json({
      address: registryAddress(),
      chainId: 5003,
      network: "Mantle Sepolia",
      total: Number(total),
      explorer: `https://sepolia.mantlescan.xyz/address/${registryAddress()}`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/attestations", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const total = Number(await registry.total());
    const out = [];
    for (let i = total - 1; i >= 0 && out.length < limit; i--) {
      const a = await registry.attestations(i);
      out.push(fmtAttestation(a, i));
    }
    res.json({ total, attestations: out });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/attestation/:target", async (req, res) => {
  try {
    const a = await registry.latestOf(req.params.target);
    res.json(fmtAttestation(a, -1));
  } catch (e: any) {
    res.status(404).json({ error: "no attestation for target" });
  }
});

app.post("/api/audit", async (req, res) => {
  try {
    const { address, source, attest } = req.body || {};
    if (!address || !ethers.isAddress(address)) {
      return res.status(400).json({ error: "valid 'address' required" });
    }

    // Serve from cache (unless caller submits custom source or wants an on-chain write)
    const cacheKey = address.toLowerCase();
    if (!source && !attest) {
      const hit = auditCache.get(cacheKey);
      if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        return res.json({ ...hit.result, cached: true });
      }
    }

    const result = await runAudit(address, source);
    let onchain = null;
    if (attest) {
      onchain = await attestOnChain(result);
    }
    const payload = {
      target: result.target,
      contractName: result.report?.contractName ?? null,
      verified: result.verified,
      brain: result.brain,
      risk: result.risk,
      riskLabel: result.riskLabel,
      score: result.score,
      summary: result.summary,
      reasoning: result.reasoning,
      findings: result.findings,
      findingsHash: result.findingsHash,
      onchain,
    };
    if (!source) auditCache.set(cacheKey, { at: Date.now(), result: payload });
    res.json(payload);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`AuditAgent API listening on :${PORT}`);
  console.log(`registry: ${registryAddress()}`);
});
