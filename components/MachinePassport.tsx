"use client";

import { SAMPLE_MACHINE } from "@/lib/sample-machine";
import { MACHINE_ASSET_ID } from "@/lib/config";
import { ObjectLink, Row } from "@/components/ui";

export function MachinePassport() {
  const m = SAMPLE_MACHINE;
  return (
    <section className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="label">MachineProof passport · RWA</div>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {m.manufacturer} {m.model}
          </h2>
          <p className="mt-1 font-mono text-sm text-accent2">{m.machineId}</p>
        </div>
        <div className="grid h-16 w-16 place-items-center rounded-lg border border-edge bg-panel2 text-3xl">
          {m.imageEmoji}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">{m.description}</p>

      <div className="mt-4">
        <Row label="Category">{m.category}</Row>
        <Row label="Origin / Year">
          {m.origin} · {m.year}
        </Row>
        <Row label="Serial (redacted)">
          <span className="font-mono text-xs">{m.serialHash}</span>
        </Row>
        <Row label="Inspection">
          <span className="pill border-accent/50 text-accent">
            {m.inspectionStatus}
          </span>
        </Row>
        <Row label="Provenance hash">
          <span className="font-mono text-xs">{m.provenanceHash}</span>
        </Row>
        <Row label="Inspection hash">
          <span className="font-mono text-xs">{m.inspectionHash}</span>
        </Row>
        <Row label="On-chain asset">
          <ObjectLink id={MACHINE_ASSET_ID} />
        </Row>
      </div>

      <p className="mt-4 text-xs text-muted">
        This on-chain object represents the machine, its provenance/inspection
        references, and trade state. It does <strong>not</strong> by itself
        transfer legal title — that remains subject to the underlying sales
        contract and applicable law.
      </p>
    </section>
  );
}
