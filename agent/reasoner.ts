/**
 * LLM reasoning layer. Augments the static findings with semantic judgement.
 *
 * Provider: Fireworks AI (AMD Developer Hackathon ACT II) — OpenAI-compatible
 * endpoint running on AMD Instinct MI300X GPUs.
 *
 * Degrades gracefully: if no API key is configured, returns null and the agent
 * proceeds on static analysis alone (keyless mode). The agent is never blocked
 * on having a brain — it just gets smarter when one is present.
 */
import type { Finding } from "./analyzer.js";

const FIREWORKS_BASE = process.env.FIREWORKS_BASE_URL || "https://api.fireworks.ai/inference/v1";
// Default to deepseek-v4-pro (strong reasoning, AMD-hosted on Fireworks)
const FIREWORKS_MODEL = process.env.FIREWORKS_MODEL || process.env.ZAI_MODEL || "accounts/fireworks/models/deepseek-v4-pro";
// Support both FIREWORKS_API_KEY and legacy ZAI_API_KEY
const getApiKey = () => process.env.FIREWORKS_API_KEY || process.env.ZAI_API_KEY;

export interface LlmAugmentation {
  extraFindings: Finding[];
  reasoning: string;
  model: string;
}

const SYSTEM_PROMPT = `You are a senior smart-contract security auditor.
You are given Solidity source and a list of findings from a static analyzer.
Your job: identify SEMANTIC vulnerabilities the static pass may have missed
(logic errors, broken access control, economic/oracle manipulation, unsafe
upgrade patterns, missing input validation, footguns).
Respond ONLY with strict JSON of shape:
{"reasoning":"<2-4 sentence overall assessment>",
 "findings":[{"id":"kebab-id","title":"...","severity":"info|low|medium|high|critical","detail":"..."}]}
Do not include markdown fences. Be precise and conservative; do not invent issues.`;

export async function reasonWithLlm(
  source: string,
  staticFindings: Finding[],
): Promise<LlmAugmentation | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null; // keyless mode

  const user = `SOLIDITY SOURCE:\n\`\`\`solidity\n${source.slice(0, 16000)}\n\`\`\`\n\nSTATIC FINDINGS:\n${JSON.stringify(
    staticFindings.map((f) => ({ id: f.id, title: f.title, severity: f.severity })),
    null,
    0,
  )}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(`${FIREWORKS_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: FIREWORKS_MODEL,
        temperature: 0.1,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[reasoner] LLM HTTP ${res.status}; falling back to static-only.`);
      return null;
    }

    const data: any = await res.json();
    let content: string = data?.choices?.[0]?.message?.content ?? "";
    // strip accidental code fences
    content = content.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(content);

    const extraFindings: Finding[] = (parsed.findings ?? []).map((f: any) => ({
      id: f.id || "llm-finding",
      title: f.title || "LLM-identified issue",
      severity: ["info", "low", "medium", "high", "critical"].includes(f.severity)
        ? f.severity
        : "medium",
      detail: f.detail || "",
    }));

    return {
      extraFindings,
      reasoning: parsed.reasoning || "",
      model: FIREWORKS_MODEL,
    };
  } catch (e: any) {
    console.warn(`[reasoner] LLM error: ${e?.message}; falling back to static-only.`);
    return null;
  }
}
