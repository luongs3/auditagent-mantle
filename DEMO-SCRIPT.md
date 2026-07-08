# AuditAgent — Demo Video Script (≥2 min, for DoraHacks submission)

**Target length:** 2:15–2:45 · **Format:** screen recording of the live dapp + explorer + repo
**Live URL:** http://31.220.75.26:8790/ · **Repo:** https://github.com/luongs3/auditagent-mantle

---

## Shot list + narration (record narration over the screen capture)

### [0:00–0:20] Hook + what it is
**Screen:** AuditAgent homepage (the hero panel with FETCH→REASON→SCORE→ACT).
**Narration:**
> "This is AuditAgent — an autonomous AI smart-contract audit oracle, live on Mantle. The era of human-only audits is ending. AuditAgent reads any Mantle contract, reasons about its security like a senior auditor, and writes its verdict permanently on-chain. Every AI decision becomes a public, verifiable record."

### [0:20–0:45] The agent loop
**Screen:** Point at the hero text / scroll the README architecture diagram.
**Narration:**
> "It runs a genuine four-step agent loop. FETCH — it pulls the contract's source from Mantle. REASON — eleven static vulnerability heuristics plus a large-language-model semantic audit using Z.AI's GLM. SCORE — it aggregates findings into a zero-to-one-hundred safety score. And ACT — the agent signs a transaction and writes the verdict on-chain."

### [0:45–1:25] Live audit (the core demo)
**Screen:** Click the "VulnerableVault (demo target)" example. Wait for the result card to render — score, risk badge, findings with line-number evidence.
**Narration:**
> "Let's audit a real contract on Mantle. I'll click our demo target — a deliberately vulnerable lending vault. The agent fetches it, analyzes it, and returns a verdict: High risk, with the exact vulnerabilities — reentrancy on the withdraw function, tx.origin authentication that's phishable, each pinned to the exact line of code. When the LLM layer is active it adds semantic findings static tools miss entirely — like a missing access-control on the oracle setter that lets an attacker manipulate prices and drain the pool."

### [1:25–1:55] On-chain proof
**Screen:** Point to the "Recent on-chain attestations" panel. Then click an attestation's address → opens Mantle explorer showing the contract + the attest() transactions.
**Narration:**
> "And here's what makes this Web3, not just AI: every verdict is recorded on-chain. This panel reads live from our AttestationRegistry contract on Mantle Sepolia. Each entry is a permanent, signed record of an AI audit — anyone can query a contract's risk history on-chain. This is an audit-reputation layer for the entire Mantle ecosystem."

### [1:55–2:20] Write a fresh verdict on-chain (the "ACT" money shot)
**Screen:** Paste any address, click "Audit + Attest on-chain". Show the green banner "Verdict written on-chain · attestation #N · view tx". Click "view tx" → Mantle explorer confirms the transaction.
**Narration:**
> "I can trigger a fresh on-chain attestation right now. The agent audits, then signs and submits the transaction. There's the confirmation — a brand-new AI verdict, written to Mantle, viewable on the block explorer. The AI just made an autonomous on-chain decision, permanently recorded."

### [2:20–2:40] Close
**Screen:** Back to homepage; show the GitHub repo briefly.
**Narration:**
> "AuditAgent — fully open-source, deployed on Mantle, with a working autonomous agent and on-chain AI attestations. Built for the Turing Test Hackathon, AI DevTools track. Thanks for watching."

---

## Recording instructions (for Lương)
1. Open http://31.220.75.26:8790/ in Chrome, full screen, clean window.
2. Screen-record (QuickTime: File → New Screen Recording, or Cmd+Shift+5).
3. Follow the shot list. Warm the cache first (click VulnerableVault once before recording) so audits render fast.
4. Narrate live, or record silent and add voiceover after. A silent captioned version is acceptable per the rules ("demo video walking through the core use case").
5. Export ≥2 min, upload to YouTube/Loom (unlisted is fine), put the link in the DoraHacks submission.

**Note on the LLM layer:** Z.AI's free tier is rate-limited; if the live audit shows "static" brain during recording, either (a) wait a few minutes for quota to reset, or (b) narrate that the LLM layer is shown in the README/repo with the full 9-finding output. The static result is still a real, strong audit.
