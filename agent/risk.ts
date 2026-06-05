/**
 * Risk aggregation — turns a list of findings into the on-chain verdict:
 * an overall Risk enum + a 0-100 safety score (higher = safer).
 *
 * The mapping is deliberately simple and explainable so the on-chain attestation
 * can be defended: "score X because N high-severity findings".
 */
import type { Finding, Severity } from "./analyzer.js";

// Matches the Solidity enum: Unknown=0, Low=1, Medium=2, High=3, Critical=4
export enum Risk {
  Unknown = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

const SEVERITY_PENALTY: Record<Severity, number> = {
  info: 1,
  low: 5,
  medium: 12,
  high: 25,
  critical: 45,
};

export interface Verdict {
  risk: Risk;
  score: number; // 0-100 safety
  summary: string;
}

export function aggregate(findings: Finding[], hasSource: boolean): Verdict {
  let penalty = 0;
  const counts: Record<Severity, number> = {
    info: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const f of findings) {
    penalty += SEVERITY_PENALTY[f.severity];
    counts[f.severity]++;
  }

  const score = Math.max(0, Math.min(100, 100 - penalty));

  let risk: Risk;
  if (!hasSource) {
    risk = Risk.Medium; // unverified = unknown-but-cautious
  } else if (counts.critical > 0 || score < 35) {
    risk = Risk.Critical;
  } else if (counts.high > 0 || score < 55) {
    risk = Risk.High;
  } else if (counts.medium > 0 || score < 75) {
    risk = Risk.Medium;
  } else if (findings.length > 0) {
    risk = Risk.Low;
  } else {
    risk = Risk.Low; // clean source still isn't "no risk", just low
  }

  const parts: string[] = [];
  (["critical", "high", "medium", "low", "info"] as Severity[]).forEach((s) => {
    if (counts[s]) parts.push(`${counts[s]} ${s}`);
  });
  const summary =
    parts.length > 0
      ? `Safety ${score}/100. Findings: ${parts.join(", ")}.`
      : `Safety ${score}/100. No heuristic issues flagged.`;

  return { risk, score, summary };
}

export const RISK_LABEL: Record<Risk, string> = {
  [Risk.Unknown]: "Unknown",
  [Risk.Low]: "Low",
  [Risk.Medium]: "Medium",
  [Risk.High]: "High",
  [Risk.Critical]: "Critical",
};
