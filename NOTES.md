# Build notes — AuditAgent (Mantle hackathon)

## Project
**AuditAgent** — AI smart-contract audit oracle on Mantle.
Off-chain AI agent analyzes a contract → writes a risk attestation ON-CHAIN (Mantle Sepolia).
Public frontend lets anyone look up a contract's AI risk score, read permanently from Mantle.
Maps to: AI DevTools track ("Mantle-specific audit assistants") + 20-Deploy Award checklist.

## Stack (decided)
- **Hardhat 3.8** (npm-based EVM toolchain) — NOT Foundry (curl|bash blocked by security guard, and
  Hardhat keeps everything in one Node/TS runtime). Installed local to auditagent/.
- Solidity contract on **Mantle Sepolia** (chainId 5003, RPC https://rpc.sepolia.mantle.xyz).
- TS off-chain agent (the AI brain) + minimal public frontend.

## Verified rails (2026-06-04)
- Mantle Sepolia RPC live: chainId 0x138b (5003), block ~0x25b5be9 (~39.6M). eth_chainId/eth_blockNumber OK.
- Hardhat 3.8.0 runs locally. node v22.22.3, npm 10.9.8.

## GOTCHA — NODE_ENV=production in this shell
The shell has `NODE_ENV=production` set globally. This makes `npm install --save-dev` SILENTLY
omit devDependencies — npm prints "up to date, audited 1 package", node_modules ends up missing the
dev packages, and `npm ls` shows "(empty)". 
**Fix: `export NODE_ENV=development` (or `npm install --include=dev`) before every npm install here.**
Cost ~30 min to diagnose. Always set NODE_ENV=development at the top of any build command in this folder.

## DEPLOYED — LIVE ON MANTLE SEPOLIA (2026-06-05)
- **Contract:** AttestationRegistry @ `0xce38911461B698735DBc0bA21c73202C934934Ef`
- **Deployer wallet:** 0x3cFAb06532aA3f09d4C44EfBd14fbb319ed7BaAd (key in .secrets/mantle-hackathon-wallet.txt)
- **Funded:** 0.9 MNT from Lương; ~0.255 spent on deploy+1st attest; 0.645 MNT remaining.
- **Verified on-chain (ground truth):** bytecode present (5810 chars); real attest() tx
  0xf315655ec7f4edcb365d896ade5af20fbf43e7170a1af1146366d794d5b55d3a mined block 39545473;
  read back risk=3/score=42. The "AI decision written on-chain" bar is MET.
- Explorer (note: actual indexer is sepolia.mantlescan.xyz, the rpc-host explorer link may differ):
  https://sepolia.mantlescan.xyz/address/0xce38911461B698735DBc0bA21c73202C934934Ef

## Next steps (toward winning)
- [ ] Contract source VERIFICATION on mantlescan — needs free Etherscan V2 API key (1 key covers
      Mantle via chainid 5003). Etherscan /register is Cloudflare-walled headless. NON-BLOCKING.
      Do later via Lương's real Chrome (chrome-js-applescript) or 2-min manual signup w/ luongr3@gmail.
      Blockscout explorer (explorer.sepolia.mantle.xyz) was 503 down 06-05 — would've been keyless.
- [x] Build the real AI audit agent (TS): fetch contract source → LLM structured audit → attest() on-chain.
      DONE 2026-06-05. agent/ = analyzer.ts (11 static vuln rules, keyless) + reasoner.ts (Z.AI/GLM
      pluggable LLM layer, degrades gracefully) + fetch.ts (Mantle source/bytecode) + risk.ts (scoring)
      + index.ts (FETCH→REASON→SCORE→ACT orchestrator). Analyzer tested vs vuln honeypot: caught
      7/7 planted bugs (reentrancy, tx.origin, selfdestruct, owner-mint, arbitrary-transferFrom,
      floating-pragma, no-SPDX), scored Critical 0/100 correctly. LIVE on-chain attest tx
      0x0b3b78df3ecb23d1c4e24d7df4f6a12ded5310c968b9f59d0e1dd35d61c5882d block 39548822, id=1,
      read back from chain independently. Autonomous loop PROVEN.
      TODO: get ZAI_API_KEY (sponsor, free credits likely) to light up the LLM layer for the demo.
      DONE 2026-06-05: ZAI_API_KEY obtained (GitHub OAuth login to z.ai via real Chrome, key in
      .secrets/zai.txt mode 600, also in .env). FREE model = **glm-4.5-flash** (paid GLM models
      return code 1113 "insufficient balance"; the *-flash models are permanently free). LLM layer
      VERIFIED working: on a vulnerable LendingPool, static caught 2 findings, Z.AI added 9 SEMANTIC
      ones incl. the critical missing-access-control-on-setOracle that static can't see, plus oracle
      manipulation, reentrancy-in-withdraw w/ exploit path, no-liquidation, front-running. This is the
      judge-impressing differentiator. NOTE: agent skips LLM when target source is UNVERIFIED (nothing
      to reason about) — so the flagship on-chain demo must audit a VERIFIED-source contract.
      On-chain attestations now total 3 (ids 0,1,2); latest tx
      0xa3cc3df8433147ad619597abedc7c7ff0af34fad515460a9c3b1da5048f66d6d block 39550325.
- [ ] Public frontend (not localhost): submit address → see on-chain AI risk card.
- [ ] ≥2min demo video + README + open-source GitHub repo (luongs3).
- [ ] DoraHacks hacker registration (CG identity, prize wallet = real MetaMask NOT throwaway).
