// SERVER-ONLY. The reasoning layer of the due-diligence assistant. Our own LLM
// (Anthropic) analyzes the passport (and any external data fetched via Monid)
// and produces the summary + checklist. It must never claim to have
// independently verified physical condition.

import "server-only";
import type {
  DueDiligenceResult,
  Passport,
} from "@/lib/duediligence";
import type { MonidTool } from "@/lib/monid";

export function llmConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM =
  "You are a due-diligence assistant for used industrial machinery. Analyze the " +
  "provided machine passport JSON and produce a concise pre-bid summary and a " +
  "checklist. Assess ONLY what the passport data supports. NEVER claim you " +
  "independently verified the physical condition, provenance, or title. If " +
  "external data sources are listed, you may note that they are available (via " +
  "Monid) but do not fabricate their contents. Output STRICT JSON only: " +
  '{"summary": string, "checklist": [{"label": string, "status": "ok"|"warn"|"missing", "note"?: string}]}. ' +
  "No text outside the JSON.";

export async function llmDueDiligence(
  passport: Passport,
  sources: MonidTool[],
): Promise<DueDiligenceResult | null> {
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  const user =
    `Machine passport:\n${JSON.stringify(passport, null, 2)}\n\n` +
    `External data sources available via Monid (may be empty):\n${JSON.stringify(sources)}\n\n` +
    "Return the JSON.";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic → ${res.status}`);
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("LLM returned no JSON");
  const parsed = JSON.parse(text.slice(start, end + 1)) as DueDiligenceResult;
  return {
    summary: String(parsed.summary ?? ""),
    checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
  };
}
