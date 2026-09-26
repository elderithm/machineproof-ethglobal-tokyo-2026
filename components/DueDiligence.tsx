"use client";

import { useState } from "react";
import { SAMPLE_MACHINE } from "@/lib/sample-machine";
import type {
  ChecklistItem,
  DueDiligenceResult,
} from "@/lib/duediligence";
import { Notice } from "@/components/ui";

type MonidTool = {
  providerName: string;
  endpoint: string;
  description: string;
  price: string;
};
type Response = DueDiligenceResult & {
  engine: "llm" | "rules";
  sources: MonidTool[];
};

const ICON: Record<ChecklistItem["status"], string> = {
  ok: "✓",
  warn: "△",
  missing: "✕",
};
const TONE: Record<ChecklistItem["status"], string> = {
  ok: "text-accent",
  warn: "text-warn",
  missing: "text-danger",
};

export function DueDiligence() {
  const m = SAMPLE_MACHINE;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Response | null>(null);

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/duediligence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          passport: {
            machineId: m.machineId,
            manufacturer: m.manufacturer,
            model: m.model,
            inspectionStatus: m.inspectionStatus,
            provenanceHash: m.provenanceHash,
            inspectionHash: m.inspectionHash,
            provenance: m.provenance,
            description: m.description,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Assistant failed.");
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <div className="label">Before you bid · due-diligence assistant</div>
        <button className="btn-secondary px-3 py-1.5 text-xs" onClick={run} disabled={loading}>
          {loading ? "Analyzing…" : "Run check"}
        </button>
      </div>

      {!result && !error && (
        <p className="mt-2 text-sm text-muted">
          Reviews the machine passport for completeness before you bid. Our own
          assistant does the reasoning; when configured, external data
          (comparables, manufacturer info) is fetched via Monid.
        </p>
      )}

      {error && <Notice tone="danger">{error}</Notice>}

      {result && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-white">{result.summary}</p>
          <ul className="space-y-1">
            {result.checklist.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`${TONE[item.status]} font-bold`}>
                  {ICON[item.status]}
                </span>
                <span className="text-white">
                  {item.label}
                  {item.note && (
                    <span className="text-muted"> — {item.note}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {result.sources.length > 0 && (
            <div>
              <div className="label">External data available · via Monid</div>
              <ul className="mt-1 space-y-1">
                {result.sources.map((s, i) => (
                  <li key={i} className="text-xs text-muted">
                    <span className="text-accent2">{s.providerName}</span>{" "}
                    {s.endpoint} — {s.description}
                    {s.price && <span> ({s.price})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted">
            Engine: {result.engine === "llm" ? "LLM analysis" : "rule-based"}
            {result.sources.length > 0 ? " · data via Monid" : ""}. This is a
            data review, not an independent physical inspection or title check.
          </p>
        </div>
      )}
    </section>
  );
}
