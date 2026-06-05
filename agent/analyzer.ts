/**
 * Static heuristic analyzer — the keyless baseline brain.
 *
 * Runs a set of pattern-based checks over Solidity source and produces structured
 * findings. This is deliberately conservative and explainable: every finding cites
 * the pattern that triggered it. The LLM layer (reasoner.ts) augments this with
 * semantic judgement, but the agent ALWAYS has this to fall back on so it can run
 * with zero API keys.
 */

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  detail: string;
  evidence?: string; // the line/snippet that triggered it
}

export interface StaticReport {
  findings: Finding[];
  linesOfCode: number;
  hasSource: boolean;
}

interface Rule {
  id: string;
  title: string;
  severity: Severity;
  // returns evidence string if it fires, else null
  test: (src: string, lines: string[]) => string | null;
}

function firstMatchLine(lines: string[], re: RegExp): string | null {
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) return `L${i + 1}: ${lines[i].trim()}`;
  }
  return null;
}

const RULES: Rule[] = [
  {
    id: "reentrancy-call-value",
    title: "External call with value before state update (reentrancy vector)",
    severity: "high",
    test: (src, lines) => {
      // .call{value:...} is the classic reentrancy sink
      if (/\.call\s*\{\s*value\s*:/.test(src)) {
        return firstMatchLine(lines, /\.call\s*\{\s*value\s*:/);
      }
      return null;
    },
  },
  {
    id: "low-level-call",
    title: "Unchecked low-level call",
    severity: "medium",
    test: (src, lines) => {
      const m = /\b\w+\.call\s*\(/.test(src) || /\.delegatecall\s*\(/.test(src);
      if (m) return firstMatchLine(lines, /\.(call|delegatecall)\s*[\({]/);
      return null;
    },
  },
  {
    id: "delegatecall",
    title: "delegatecall present (proxy / code-injection surface)",
    severity: "high",
    test: (src, lines) =>
      /\.delegatecall\s*\(/.test(src) ? firstMatchLine(lines, /\.delegatecall\s*\(/) : null,
  },
  {
    id: "tx-origin-auth",
    title: "tx.origin used for authorization (phishing vector)",
    severity: "high",
    test: (src, lines) =>
      /tx\.origin/.test(src) ? firstMatchLine(lines, /tx\.origin/) : null,
  },
  {
    id: "selfdestruct",
    title: "selfdestruct present (funds can be force-removed)",
    severity: "high",
    test: (src, lines) =>
      /selfdestruct\s*\(/.test(src) ? firstMatchLine(lines, /selfdestruct\s*\(/) : null,
  },
  {
    id: "unchecked-block",
    title: "unchecked{} arithmetic block (overflow surface)",
    severity: "low",
    test: (src, lines) =>
      /\bunchecked\s*\{/.test(src) ? firstMatchLine(lines, /\bunchecked\s*\{/) : null,
  },
  {
    id: "no-spdx",
    title: "Missing SPDX license identifier",
    severity: "info",
    test: (src) => (/SPDX-License-Identifier/.test(src) ? null : "no SPDX header found"),
  },
  {
    id: "floating-pragma",
    title: "Floating pragma (^ or >=) — non-deterministic compiler version",
    severity: "low",
    test: (src, lines) =>
      /pragma\s+solidity\s+[\^>]/.test(src) ? firstMatchLine(lines, /pragma\s+solidity/) : null,
  },
  {
    id: "owner-mint",
    title: "Privileged mint function (centralization / rug surface)",
    severity: "medium",
    test: (src, lines) => {
      if (/function\s+mint\s*\(/.test(src) && /(onlyOwner|owner\s*\(\s*\)|msg\.sender\s*==\s*owner)/.test(src)) {
        return firstMatchLine(lines, /function\s+mint\s*\(/);
      }
      return null;
    },
  },
  {
    id: "blacklist",
    title: "Blacklist / freeze capability (transfer can be blocked)",
    severity: "medium",
    test: (src, lines) =>
      /(blacklist|blocklist|_frozen|isBlocked)/i.test(src)
        ? firstMatchLine(lines, /(blacklist|blocklist|_frozen|isBlocked)/i)
        : null,
  },
  {
    id: "arbitrary-transferfrom",
    title: "transferFrom on arbitrary 'from' (approval-drain surface)",
    severity: "medium",
    test: (src, lines) =>
      /transferFrom\s*\(\s*\w+\s*,/.test(src) ? firstMatchLine(lines, /transferFrom\s*\(/) : null,
  },
];

export function analyzeStatic(source: string): StaticReport {
  const hasSource = !!source && source.trim().length > 0;
  const lines = source.split(/\r?\n/);
  const findings: Finding[] = [];

  if (!hasSource) {
    findings.push({
      id: "no-source",
      title: "Contract source not verified / unavailable",
      severity: "medium",
      detail:
        "Bytecode could not be matched to verified source. Unverified contracts cannot be " +
        "fully audited and should be treated with elevated caution.",
    });
    return { findings, linesOfCode: 0, hasSource: false };
  }

  for (const rule of RULES) {
    const evidence = rule.test(source, lines);
    if (evidence) {
      findings.push({
        id: rule.id,
        title: rule.title,
        severity: rule.severity,
        detail: `Heuristic '${rule.id}' matched.`,
        evidence,
      });
    }
  }

  return {
    findings,
    linesOfCode: lines.filter((l) => l.trim().length > 0).length,
    hasSource: true,
  };
}
