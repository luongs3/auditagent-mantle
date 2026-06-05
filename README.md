# 🛡️ AuditAgent — Autonomous AI Smart-Contract Audit Oracle on Mantle

> Submission for **The Turing Test Hackathon 2026** · AI DevTools track
> An autonomous AI agent that audits smart contracts and records every verdict **permanently on-chain**.

AuditAgent is an on-chain **audit-reputation layer** for the Mantle ecosystem. Point it at any
Mantle contract and an autonomous agent runs a four-step loop — **FETCH → REASON → SCORE → ACT** —
then signs and writes its risk verdict to an on-chain registry. The result is a permanent, public,
queryable record of AI security assessments: the first audit oracle where the AI's decisions are
themselves verifiable on Mantle.

---

## 🔴 Live demo & deployed addresses

| Thing | Value |
|---|---|
| **Live dapp** | http://31.220.75.26:8790/ |
| **Network** | Mantle Sepolia (chainId **5003**) |
| **AttestationRegistry** | [`0xce38911461B698735DBc0bA21c73202C934934Ef`](https://sepolia.mantlescan.xyz/address/0xce38911461B698735DBc0bA21c73202C934934Ef) |
| **VulnerableVault** (demo audit target) | [`0xe0F337845C1747bfeF1B16Ed3a0201C4d7A2A71D`](https://sepolia.mantlescan.xyz/address/0xe0F337845C1747bfeF1B16Ed3a0201C4d7A2A71D) |
| **Agent wallet** (auditor) | `0x3cFAb06532aA3f09d4C44EfBd14fbb319ed7BaAd` |

---

## 🧠 Why this is a real AI agent, not "AI" in a README

The agent runs a genuine autonomous loop and its **brain is a real LLM** (Z.AI / GLM), with a
deterministic static-analysis layer as a keyless fallback:

```
  TRIGGER   a contract address is submitted (UI, API, or batch)
     │
  1. FETCH   pull the contract's source/bytecode from Mantle
     │
  2. REASON  static heuristics (11 vuln rules) + Z.AI GLM semantic audit
     │        → reentrancy, access-control, oracle-manipulation, tx.origin,
     │          selfdestruct, integer/precision, logic & economic flaws …
     │
  3. SCORE   aggregate findings → Risk enum + 0–100 safety score
     │
  4. ACT     agent wallet signs attest() → verdict written ON-CHAIN
     │
  VERIFY     frontend reads the on-chain attestation back, renders the risk card
```

On a deliberately vulnerable lending pool, the static layer caught 2 issues and the **LLM added 9
semantic findings** — including a *critical* missing-access-control on the oracle setter that
enables price manipulation and pool draining. That is auditor-grade reasoning, then committed
on-chain as a permanent record.

---

## 🏗️ Architecture

```
auditagent/
├── contracts/
│   ├── AttestationRegistry.sol   # on-chain registry of AI verdicts (the AI-on-chain function)
│   └── VulnerableVault.sol       # intentionally-insecure demo audit target
├── agent/
│   ├── fetch.ts        # FETCH  — source from local registry / explorer / bytecode
│   ├── analyzer.ts     # REASON — 11 static vulnerability heuristics (keyless)
│   ├── reasoner.ts     # REASON — Z.AI GLM semantic audit layer (graceful fallback)
│   ├── risk.ts         # SCORE  — findings → Risk enum + 0–100 safety score
│   └── index.ts        # orchestrator + CLI (FETCH→REASON→SCORE→ACT)
├── server/
│   └── api.ts          # Express API + serves the frontend (same-origin)
├── public/
│   └── index.html      # the dapp UI (risk cards, on-chain attestation feed)
└── scripts/            # deploy + ops
```

### The on-chain AI function
`AttestationRegistry.attest(target, risk, score, findingsHash, reportURI)` is the AI-powered
function callable on-chain. The agent wallet calls it after every audit; the verdict (risk level,
safety score, keccak256 of the full report, report URI) is stored immutably and emitted as an
`Attested` event for cheap off-chain indexing.

---

## 🚀 Run it yourself

```bash
npm install
cp .env.example .env        # add DEPLOYER_PK (+ optional ZAI_API_KEY, ETHERSCAN_API_KEY)
npx hardhat compile

# Deploy the registry to Mantle Sepolia
node --env-file=.env scripts/deploy.mjs

# Audit a contract from the CLI (FETCH→REASON→SCORE→ACT, writes on-chain)
npx tsx agent/index.ts 0xe0F337845C1747bfeF1B16Ed3a0201C4d7A2A71D

# Or run the full dapp (API + UI on :8790)
PORT=8790 node --env-file=.env npx tsx server/api.ts
# open http://localhost:8790
```

### API

| Endpoint | Description |
|---|---|
| `GET /api/registry` | registry address, chainId, total attestations |
| `GET /api/attestations?limit=N` | recent on-chain attestations |
| `GET /api/attestation/:target` | latest attestation for a target |
| `POST /api/audit {address, source?, attest?}` | run the agent; `attest:true` writes on-chain |

---

## 🧩 Tech

- **Chain:** Mantle Sepolia · **Contracts:** Solidity 0.8.28 · **Tooling:** Hardhat 3
- **Agent/API:** TypeScript, Node 20+, ethers v6, Express
- **AI brain:** Z.AI GLM (`glm-4.5-flash`) with deterministic static-analysis fallback

## 📜 License
MIT
