// Pure due-diligence logic. The LLM path (lib/llm.ts) produces the richer
// analysis when configured; this deterministic checklist is the always-available
// fallback and is honest about being a data-completeness review, not a physical
// inspection.

export type Passport = {
  machineId: string;
  manufacturer: string;
  model: string;
  inspectionStatus?: string;
  provenanceHash?: string;
  inspectionHash?: string;
  provenance?: { label: string; value: string }[];
  description?: string;
};

export type ChecklistStatus = "ok" | "warn" | "missing";
export type ChecklistItem = {
  label: string;
  status: ChecklistStatus;
  note?: string;
};
export type DueDiligenceResult = {
  summary: string;
  checklist: ChecklistItem[];
};

const has = (v?: string) => Boolean(v && v.trim().length > 0);

export function buildRulesChecklist(p: Passport): DueDiligenceResult {
  const prov = (p.provenance ?? []).map((x) =>
    `${x.label}: ${x.value}`.toLowerCase(),
  );
  const checklist: ChecklistItem[] = [
    {
      label: "Machine identity present",
      status: has(p.machineId) ? "ok" : "missing",
    },
    {
      label: "Manufacturer / model",
      status: has(p.manufacturer) && has(p.model) ? "ok" : "missing",
    },
    {
      label: "Provenance commitment anchored",
      status: has(p.provenanceHash) ? "ok" : "warn",
      note: has(p.provenanceHash) ? undefined : "No provenance hash on record",
    },
    {
      label: "Inspection status",
      status: (p.inspectionStatus ?? "").toLowerCase().includes("verified")
        ? "ok"
        : "warn",
      note: p.inspectionStatus,
    },
    {
      label: "Export documentation",
      status: prov.some((t) => t.includes("export")) ? "ok" : "warn",
    },
    {
      label: "Service / maintenance history",
      status: prov.some((t) => t.includes("maintenance") || t.includes("service"))
        ? "ok"
        : "warn",
    },
  ];
  const oks = checklist.filter((i) => i.status === "ok").length;
  const summary =
    `Pre-bid check: ${oks}/${checklist.length} items satisfied for ` +
    `${p.manufacturer} ${p.model} (${p.machineId}). This is a data-completeness ` +
    `review of the passport, not an independent physical inspection.`;
  return { summary, checklist };
}
