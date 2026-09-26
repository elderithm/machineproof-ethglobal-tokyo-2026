"use client";

import { useQuery } from "@tanstack/react-query";
import { EVM_MACHINE_ID, MULTIBAAS_CONFIGURED, shorten } from "@/lib/config";
import { listEvmEvents, readEvmMachine } from "@/lib/multibaas";
import { Notice, Row } from "@/components/ui";

export function EvmProvenance() {
  const machineQ = useQuery({
    queryKey: ["evmMachine", EVM_MACHINE_ID],
    queryFn: () => readEvmMachine(EVM_MACHINE_ID),
    enabled: MULTIBAAS_CONFIGURED,
    refetchInterval: 15000,
  });
  const eventsQ = useQuery({
    queryKey: ["evmEvents"],
    queryFn: () => listEvmEvents(50),
    enabled: MULTIBAAS_CONFIGURED,
    refetchInterval: 15000,
  });

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <div className="label">EVM provenance mirror · Curvegrid MultiBaas</div>
        <span className="pill text-muted">Sepolia</span>
      </div>

      {!MULTIBAAS_CONFIGURED ? (
        <Notice tone="info">
          Optional. Deploy <code>evm/</code> to Sepolia, link it in MultiBaas with
          event indexing, then set NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL,
          NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY, and NEXT_PUBLIC_EVM_MACHINE_ID.
          The Sui auction/settlement stands on its own without this.
        </Notice>
      ) : (
        <div className="mt-3 space-y-4">
          <div>
            <div className="label">Machine record (read via MultiBaas)</div>
            {machineQ.isLoading ? (
              <p className="mt-1 text-sm text-muted">Reading…</p>
            ) : machineQ.error || !machineQ.data ? (
              <Notice tone="warn">
                Could not read the machine record. Check the contract label/alias
                and that event indexing is on.
              </Notice>
            ) : (
              <div className="mt-1">
                <Row label="Provenance hash">
                  <span className="font-mono text-xs">
                    {shorten(machineQ.data.provenanceHash, 10, 6)}
                  </span>
                </Row>
                <Row label="Inspection hash">
                  <span className="font-mono text-xs">
                    {shorten(machineQ.data.inspectionHash, 10, 6)}
                  </span>
                </Row>
                <Row label="Metadata URI">
                  <span className="font-mono text-xs">
                    {machineQ.data.metadataURI}
                  </span>
                </Row>
              </div>
            )}
          </div>

          <div>
            <div className="label">Provenance events (indexed)</div>
            {eventsQ.data && eventsQ.data.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {eventsQ.data.map((e, i) => (
                  <li
                    key={`${e.txHash}-${i}`}
                    className="flex items-center justify-between gap-3 border-b border-edge/50 pb-1 text-sm last:border-0"
                  >
                    <span className="text-white">{e.name}</span>
                    <span className="font-mono text-xs text-muted">
                      {e.txHash ? shorten(e.txHash) : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">
                No indexed events yet (enable Sync Events in MultiBaas).
              </p>
            )}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        The EVM registry mirrors provenance/inspection commitments for inspection
        via MultiBaas event indexing. It carries no auction or funds — those live
        on Sui.
      </p>
    </section>
  );
}
