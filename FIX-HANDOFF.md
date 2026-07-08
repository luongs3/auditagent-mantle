# Mantle AuditAgent — judge-upside fixes (handoff)

Two fixes the judging report flagged as the cheap delta from "mid-50s, capped" → real judged contender. **Fix 2 = DONE + live-verified 2026-06-11 (V). Fix 1 code done; on-chain REDEPLOY still operator-gated (wallet+gas).**

> **2026-06-11 update (V) — Fix 2 shipped & verified live.** Root cause was NOT just a config step: the VPS `.env` held a **truncated 13-char `ZAI_API_KEY`** (real key is 49 chars) → every live audit got HTTP 401 and fell back to static-only. Replaced with the full key from `.secrets/zai.txt`. Second hidden bug: glm-4.5-flash **thinking-mode** made the audit call run >60s and hit the abort timeout → silent fallback even after the key was fixed. Fix: added `thinking: { type: "disabled" }` to the Z.AI request body in `agent/reasoner.ts` (bumped abort to 60s). **Now verified live:** `POST http://31.220.75.26:8790/api/audit {"address":"0xe0F3…A71D"}` returns `brain: "static+llm"`, 6 findings incl. **critical** missing-access-control on `setOracle` + oracle-manipulation (the semantic findings the SUBMISSION claims), ~8s, cached for instant judge replays. **Same bug + same fix applied to MantleFolio (8791)** — now returns `brain:"llm"` live on `/api/rebalance`. Local repos patched to match; commit/push left to operator (CLAUDE.md git rule). **Fix 1 redeploy is the only Mantle item left — see below, needs your wallet.**

## ✅ Fix 1 — `attest()` access control — FULLY SHIPPED 2026-06-11 (V)

> **2026-06-11 (V): redeploy complete + live.** New access-controlled registry **`0x5C1F52Cd36CD8C3B63d697FEE891e511F886465A`** deployed to Mantle Sepolia (compiled solc 0.8.28 via standalone solc+ethers — VPS Node 20 / mounted node_modules couldn't run Hardhat 3). `owner()` = agent wallet, `isAuditor(agent)` = true (on-chain confirmed). Re-seeded with **7 genuine attestations** from the authorized wallet (hero VulnerableVault carries full static+llm findings incl. critical access-control). **Verified on explorer** via Etherscan V2 API (chainid 5003) → "Pass - Verified". Live site repointed (`REGISTRY_ADDRESS` env + `deployment.json` + static HTML); `http://31.220.75.26:8790/api/registry` returns the new address, total 7; old address gone from the live page. **DoraHacks BUIDL 44242 updated** (CG account, Save confirmed) — both the AttestationRegistry code-span and the verified-source link now point to the new contract; old address absent from the published page. Local repo files all patched. **Both judge seams (Fix 1 + Fix 2) now closed.**

<details><summary>original Fix 1 handoff (code done, redeploy was pending)</summary>


**Problem:** `attest()` was `external` with no auth — anyone could write forged attestations into a *security* registry (the easiest damaging critique against AuditAgent).

**Fix (in `contracts/AttestationRegistry.sol`):** added `owner` + `isAuditor` allowlist, `onlyAuditor` on `attest()`, `setAuditor`/`transferOwnership` (owner-only), custom errors `NotOwner`/`NotAuditor`. The **deployer is auto-set as owner + first auditor**, so the existing single-wallet agent flow keeps working with zero changes.

</details>


**Verified:** compiles on solc 0.8.28; **7/7 access-control tests pass** under Foundry (`test/AttestationRegistry.access.t.sol`) — unauthorized→revert, revoked→revert, non-owner can't manage auditors, ownership transfer works.

### Deploy steps (your wallet + gas — testnet only)
1. **Redeploy** the registry (it's a new bytecode → new address):
   ```
   cd auditagent
   npx hardhat run scripts/deploy.mjs --network mantleSepolia   # uses DEPLOYER_PK from .env
   ```
   (top up the deploy wallet with Mantle Sepolia MNT from the faucet first if low — see lessons-learned re: gas.)
2. **Update the references** to the new address: `deployment.json`, `SUBMISSION.md`, `README.md`, and the frontend/`server` `REGISTRY_ADDRESS` env.
3. **Re-seed attestations** so the live registry isn't empty: re-run the agent against your demo targets (it'll attest from the deployer wallet, which is already authorized):
   ```
   REGISTRY_ADDRESS=<new-addr> DEPLOYER_PK=... node agent/index.js <vulnerable-vault-addr>   # or your usual run cmd
   ```
   - If your agent submits from a **different** wallet than the deployer, authorize it once: call `setAuditor(agentWallet, true)` from the owner.
4. **Verify** the new contract on the Mantle explorer (keeps the "verified on Mantle explorer" checklist item).

## ✅ Fix 2 — live LLM on the demo — DONE 2026-06-11 (see top-of-file update for the real root cause + receipts)

<details><summary>original handoff note (was wrong about it being 1-line)</summary>


The agent code already supports it — `agent/reasoner.ts` reads `ZAI_API_KEY` and calls Z.AI (`glm-4.5-flash`, free tier); with no key it silently falls back to static-only, so judges who run the live site see "the AI" behave like a script. Just set the key on the running service:

- Put `ZAI_API_KEY=<key from ~/Documents/me/.secrets/zai.txt>` into the AuditAgent service env on the VPS (port 8790) and restart it.
- Confirm: hit the live audit endpoint and check the response includes the LLM semantic findings (not just the static heuristics).

## Why this matters
Both close the two specific knocks a judge running the live site would hit: (1) "the security tool's registry is unauthenticated" and (2) "the "AI" isn't actually running." They don't change the deterministic 20-Deploy award (already near-locked) — they're the cheap lift toward the judged prize. Deadline 2026-06-15.
