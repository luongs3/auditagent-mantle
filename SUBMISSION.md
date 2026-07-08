# DoraHacks BUIDL Submission — AuditAgent (READY TO PASTE)

**Submit at:** https://dorahacks.io/hackathon/mantleturingtesthackathon2026/buidl
**Track:** AI DevTools · **Also eligible:** 20 Project Deployment Award, Grand Champion, Best UI/UX, Community Vote

---

## Project name
AuditAgent

## One-line pitch
An autonomous AI agent that audits any Mantle smart contract and writes its security verdict permanently on-chain — a public audit-reputation layer for the Mantle ecosystem.

## Tags / category
AI, DevTools, Security, Smart Contracts, AI Agent, Mantle

---

## Description (long)

AuditAgent is an autonomous AI smart-contract audit oracle, live on Mantle. Point it at any Mantle contract and an AI agent runs a genuine four-step loop — **FETCH → REASON → SCORE → ACT** — then signs and writes its verdict to an on-chain registry. The result is a permanent, public, queryable record of AI security assessments: the first audit oracle where the AI's own decisions are verifiable on Mantle.

**Why it's a real AI agent, not "AI" in a README:**
The agent's brain is a real LLM (Z.AI / GLM) backed by a deterministic 11-rule static analyzer that runs keyless as a fallback. On a deliberately vulnerable lending pool, the static layer caught 2 issues and the LLM added **9 semantic findings** static tools miss — including a *critical* missing-access-control on the oracle setter that enables price manipulation and pool draining. Every verdict (risk level, 0–100 safety score, keccak256 of the full report) is committed on-chain via `AttestationRegistry.attest()` and emitted as an event for cheap indexing.

**The on-chain AI function:** `attest(target, risk, score, findingsHash, reportURI)` — the agent wallet calls it after every audit. This satisfies the "AI inference result written on-chain" requirement directly: the AI makes an autonomous decision and records it immutably on Mantle.

**What it does for Mantle:** an audit-reputation layer the whole ecosystem can query — anyone can look up a contract's on-chain AI risk history before interacting with it.

---

## Tell us in your submission (track questions)

**Which data sources / capabilities does your project use?**
Mantle Sepolia RPC (contract bytecode + source), Mantle on-chain storage (the AttestationRegistry), and Z.AI GLM for semantic reasoning.

**What role does AI play?**
AI is the core: it performs the security analysis (static heuristics + LLM semantic audit), produces the findings and the safety score, and autonomously signs the on-chain attestation. The agent runs the full loop with no human in the path.

**How does it generate verifiable value on Mantle?**
Every AI verdict is a signed, timestamped, immutable on-chain record in the AttestationRegistry. It's the first on-chain benchmark of AI audit decisions on Mantle — verifiable by anyone, forever.

---

## Links

- **Live demo:** http://31.220.75.26:8790/
- **GitHub (open-source, MIT):** https://github.com/luongs3/auditagent-mantle
- **Demo video:** https://youtu.be/ObDqP7YZgfo  (LINKED in the BUIDL — "Autonomous AI smart-contract audit oracle on Mantle", 2:17. Backup MP4: http://31.220.75.26:8790/AuditAgent-demo.mp4)

## Deployed contracts (Mantle Sepolia, chainId 5003) — VERIFIED ✅

- **AttestationRegistry:** `0x5C1F52Cd36CD8C3B63d697FEE891e511F886465A` — [verified source](https://sepolia.mantlescan.xyz/address/0x5C1F52Cd36CD8C3B63d697FEE891e511F886465A#code)
- **VulnerableVault** (demo audit target): `0xe0F337845C1747bfeF1B16Ed3a0201C4d7A2A71D` — [verified source](https://sepolia.mantlescan.xyz/address/0xe0F337845C1747bfeF1B16Ed3a0201C4d7A2A71D#code)
- **Agent/auditor wallet:** `0x3cFAb06532aA3f09d4C44EfBd14fbb319ed7BaAd`

## Tech stack
Mantle Sepolia · Solidity 0.8.28 · Hardhat 3 · TypeScript / Node 20 · ethers v6 · Express · Z.AI GLM (glm-4.5-flash)
