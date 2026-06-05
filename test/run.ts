/**
 * Smoke test for the audit engine — runs the static + scoring layers against a
 * known-vulnerable contract and asserts the high-severity issues are caught.
 * Run: npx tsx test/run.ts
 */
import { analyzeStatic } from "../agent/analyzer.js";
import { aggregate, RISK_LABEL, Risk } from "../agent/risk.js";

const VULN = `// no SPDX
pragma solidity ^0.8.0;
contract Vault {
  mapping(address=>uint) public bal;
  address owner;
  function withdraw() external {
    (bool ok,) = msg.sender.call{value: bal[msg.sender]}("");
    require(ok); bal[msg.sender] = 0;
  }
  function admin(address from,uint a) external {
    require(tx.origin == owner);
    token.transferFrom(from, owner, a);
  }
  function nuke() external { selfdestruct(payable(owner)); }
}`;

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { console.log(`  ✗ ${msg}`); failures++; }
}

console.log("AuditAgent smoke test");
const stat = analyzeStatic(VULN);
const ids = new Set(stat.findings.map((f) => f.id));
assert(ids.has("reentrancy-call-value"), "detects reentrancy");
assert(ids.has("tx-origin-auth"), "detects tx.origin auth");
assert(ids.has("selfdestruct"), "detects selfdestruct");
assert(ids.has("no-spdx"), "detects missing SPDX");

const v = aggregate(stat.findings, stat.hasSource);
assert(v.risk === Risk.Critical, `aggregates to Critical (got ${RISK_LABEL[v.risk]})`);
assert(v.score < 50, `low safety score (got ${v.score})`);

// Empty / clean source should not be Critical
const clean = analyzeStatic("// SPDX-License-Identifier: MIT\npragma solidity 0.8.28;\ncontract C {}");
const cv = aggregate(clean.findings, clean.hasSource);
assert(cv.risk <= Risk.Low, `clean contract is Low risk (got ${RISK_LABEL[cv.risk]})`);

if (failures) { console.error(`\n${failures} test(s) failed`); process.exit(1); }
console.log("\nAll tests passed.");
