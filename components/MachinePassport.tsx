"use client";

import { useMemo } from "react";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { SAMPLE_MACHINE } from "@/lib/sample-machine";
import { MACHINE_ASSET_ID } from "@/lib/config";
import { parseMachineAsset, type MachineAssetView } from "@/lib/sui/queries";
import { ObjectLink, Row } from "@/components/ui";

export function MachinePassport() {
  const sample = SAMPLE_MACHINE;

  // Read the identity fields from the on-chain MachineAsset; fall back to the
  // seeded sample data when the object isn't configured/available.
  const { data } = useSuiClientQuery(
    "getObject",
    { id: MACHINE_ASSET_ID, options: { showContent: true } },
    { enabled: Boolean(MACHINE_ASSET_ID), refetchInterval: 30000 },
  );
  const onchain: MachineAssetView | null = useMemo(() => {
    const content = (data as { data?: { content?: unknown } } | undefined)?.data
      ?.content as
      | { dataType?: string; fields?: Record<string, unknown> }
      | undefined;
    if (!content || content.dataType !== "moveObject" || !content.fields)
      return null;
    return parseMachineAsset(content.fields);
  }, [data]);

  const machineId = onchain?.machineId || sample.machineId;
  const manufacturer = onchain?.manufacturer || sample.manufacturer;
  const model = onchain?.model || sample.model;
  const inspectionStatus = onchain?.inspectionStatus || sample.inspectionStatus;

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="label">
            MachineProof passport · RWA
            {onchain && (
              <span className="pill ml-2 border-accent/50 text-accent">
                on-chain
              </span>
            )}
          </div>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {manufacturer} {model}
          </h2>
          <p className="mt-1 font-mono text-sm text-accent2">{machineId}</p>
        </div>
        <div className="grid h-16 w-16 place-items-center rounded-lg border border-edge bg-panel2 text-3xl">
          {sample.imageEmoji}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">{sample.description}</p>

      <div className="mt-4">
        <Row label="Category">{sample.category}</Row>
        <Row label="Origin / Year">
          {sample.origin} · {sample.year}
        </Row>
        <Row label="Serial (redacted)">
          <span className="font-mono text-xs">{sample.serialHash}</span>
        </Row>
        <Row label="Inspection">
          <span className="pill border-accent/50 text-accent">
            {inspectionStatus}
          </span>
        </Row>
        <Row label="Provenance hash">
          <span className="font-mono text-xs">{sample.provenanceHash}</span>
        </Row>
        <Row label="Inspection hash">
          <span className="font-mono text-xs">{sample.inspectionHash}</span>
        </Row>
        <Row label="On-chain asset">
          <ObjectLink id={MACHINE_ASSET_ID} />
        </Row>
      </div>

      <p className="mt-4 text-xs text-muted">
        Identity fields above are read from the on-chain MachineAsset when
        configured. This object represents the machine, its provenance/inspection
        references, and trade state. It does <strong>not</strong> by itself
        transfer legal title — that remains subject to the underlying sales
        contract and applicable law.
      </p>
    </section>
  );
}
