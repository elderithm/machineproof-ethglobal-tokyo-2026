import { NextResponse } from "next/server";
import { buildRulesChecklist, type Passport } from "@/lib/duediligence";
import { monidConfigured, monidDiscover, type MonidTool } from "@/lib/monid";
import { llmConfigured, llmDueDiligence } from "@/lib/llm";

// Due-diligence assistant. Our own LLM reasons over the passport; Monid (when
// configured) supplies external data sources. Degrades to a deterministic
// checklist when neither is configured, so it always works.
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { passport } = (await req.json()) as { passport?: Passport };
    if (!passport?.machineId) {
      return NextResponse.json(
        { ok: false, error: "Missing passport." },
        { status: 400 },
      );
    }

    // Optional external-data discovery via Monid (best-effort).
    let sources: MonidTool[] = [];
    if (monidConfigured()) {
      try {
        sources = await monidDiscover(
          `due-diligence data for a used ${passport.manufacturer} ${passport.model} ` +
            "industrial machine: market price comparables, manufacturer info, recalls",
          5,
        );
      } catch {
        // Non-fatal: the assistant still runs without external data.
      }
    }

    // Reasoning: LLM when configured, else deterministic checklist.
    let result = null;
    let engine: "llm" | "rules" = "rules";
    if (llmConfigured()) {
      try {
        result = await llmDueDiligence(passport, sources);
        if (result) engine = "llm";
      } catch {
        result = null;
      }
    }
    if (!result) result = buildRulesChecklist(passport);

    return NextResponse.json({ ok: true, engine, sources, ...result });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Server error." },
      { status: 500 },
    );
  }
}
