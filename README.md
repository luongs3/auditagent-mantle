# Track 3 (Unicorn) — AuditAgent: Autonomous AI Smart-Contract Audit Oracle
**AMD Developer Hackathon: ACT II** · Team: AuditAgent

> An autonomous AI agent that audits Ethereum smart contracts and records every verdict **permanently on-chain** — powered by Fireworks AI running on AMD Instinct MI300X GPUs.

## What it does

AuditAgent is an on-chain **audit-reputation layer**. Point it at any contract address and an autonomous agent runs a four-step loop — **FETCH → REASON → SCORE → ACT** — then signs and writes its risk verdict to an immutable on-chain registry.

```
Submit contract address
       │
  1. FETCH   Pull contract source / bytecode from chain
       │
  2. REASON  Static heuristics (11 vuln rules) + LLM semantic audit via Fireworks AI
       │        → reentrancy, access-control, oracle-manipulation, tx.origin,
       │          selfdestruct, integer/precision, logic & economic flaws …
       │
  3. SCORE   Aggregate findings → Risk enum + 0–100 safety score
       │
  4. ACT     Agent wallet signs attest() → verdict written ON-CHAIN
       │
VERIFY     Frontend reads on-chain attestation back, renders risk card
```

## AMD / Fireworks Integration

The agent's LLM reasoning runs via **Fireworks AI API** — which serves models on **AMD Instinct MI300X GPUs** in AMD Developer Cloud. This gives:
- Fast semantic vulnerability analysis (deepseek-v4-pro default)
- OpenAI-compatible interface, easily swappable to any Fireworks model
- Keyless fallback: static analysis alone if no API key (agent is never blocked)

Set `FIREWORKS_API_KEY` and optionally `FIREWORKS_MODEL` to use a different model.

## Running (Docker)

```bash
docker build -t auditagent .
docker run -p 3333:3333 \
  -e FIREWORKS_API_KEY=your_fireworks_key \
  -e FIREWORKS_MODEL=accounts/fireworks/models/deepseek-v4-pro \
  -e MANTLE_RPC=https://rpc.sepolia.mantle.xyz \
  -e REGISTRY_ADDRESS=0x5C1F52Cd36CD8C3B63d697FEE891e511F886465A \
  auditagent
```

## API

```
GET  /health                    → liveness check
GET  /api/registry              → { address, chainId, total }
GET  /api/attestations?limit=N  → recent on-chain audit verdicts
POST /api/audit                 → { address: "0x...", source?: "...", attest?: true }
```

## Live Demo
- **API:** http://31.220.75.26:8790/
- **Registry:** `0x5C1F52Cd36CD8C3B63d697FEE891e511F886465A` (Mantle Sepolia)

## Tech Stack
- Node.js 22, TypeScript, Express, ethers.js
- Fireworks AI (AMD MI300X) for LLM semantic audit
- 11 static vulnerability rules (reentrancy, access-control, oracle, etc.)
- On-chain AttestationRegistry (Solidity)
