/**
 * FETCH step. Pulls a target contract's verified source from the explorer,
 * falling back to on-chain bytecode presence if source is unavailable.
 *
 * Source resolution order:
 *   1. Local known-source registry (contracts we deployed / user-submitted source)
 *   2. Etherscan V2 verified source (chainid 5003), if ETHERSCAN_API_KEY set
 *   3. Bytecode-only (cautious verdict on unverified targets)
 *
 * The local registry lets the demo audit our own deployed contracts (and any
 * source a user pastes into the frontend) without depending on explorer
 * verification being live — which on Mantle testnet is flaky.
 */
import { readFileSync, existsSync } from "node:fs";

const RPC = process.env.MANTLE_RPC || "https://rpc.sepolia.mantle.xyz";
const CHAIN_ID = 5003;
const ETHERSCAN_V2 = "https://api.etherscan.io/v2/api";

export interface FetchResult {
  address: string;
  isContract: boolean;
  source: string; // empty if unavailable
  contractName?: string;
  verified: boolean;
  sourceOrigin: "local" | "explorer" | "none";
}

async function rpc(method: string, params: any[]): Promise<any> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC ${method}: ${data.error.message}`);
  return data.result;
}

/** Local known-source registry: address (lowercase) → { name, file } */
function loadKnownSources(): Record<string, { name: string; file: string }> {
  const path = new URL("../known-sources.json", import.meta.url);
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    /* ignore */
  }
  return {};
}

export async function fetchContract(address: string, submittedSource?: string): Promise<FetchResult> {
  const code: string = await rpc("eth_getCode", [address, "latest"]);
  const isContract = !!code && code !== "0x";

  // 0. Caller-submitted source (frontend paste) wins.
  if (submittedSource && submittedSource.trim().length > 0) {
    return {
      address,
      isContract,
      source: submittedSource,
      verified: true,
      sourceOrigin: "local",
      contractName: undefined,
    };
  }

  // 1. Local known-source registry.
  const known = loadKnownSources();
  const entry = known[address.toLowerCase()];
  if (entry) {
    try {
      const src = readFileSync(new URL(`../${entry.file}`, import.meta.url), "utf8");
      return {
        address,
        isContract,
        source: src,
        contractName: entry.name,
        verified: true,
        sourceOrigin: "local",
      };
    } catch {
      /* fall through */
    }
  }

  // 2. Explorer verified source.
  let source = "";
  let contractName: string | undefined;
  let verified = false;
  const key = process.env.ETHERSCAN_API_KEY;
  if (isContract && key) {
    try {
      const url = `${ETHERSCAN_V2}?chainid=${CHAIN_ID}&module=contract&action=getsourcecode&address=${address}&apikey=${key}`;
      const res = await fetch(url);
      const data: any = await res.json();
      const item = data?.result?.[0];
      if (item && item.SourceCode && item.SourceCode.length > 0) {
        let sc: string = item.SourceCode;
        if (sc.startsWith("{{") && sc.endsWith("}}")) {
          try {
            const parsed = JSON.parse(sc.slice(1, -1));
            sc = Object.values(parsed.sources || {})
              .map((f: any) => f.content)
              .join("\n\n");
          } catch {
            /* leave as-is */
          }
        }
        source = sc;
        contractName = item.ContractName || undefined;
        verified = true;
      }
    } catch (e: any) {
      console.warn(`[fetch] explorer source lookup failed: ${e?.message}`);
    }
  }

  return {
    address,
    isContract,
    source,
    contractName,
    verified,
    sourceOrigin: source ? "explorer" : "none",
  };
}
