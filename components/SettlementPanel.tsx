"use client";

import { useMemo, useState } from "react";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { PACKAGE_ID, mistToSui } from "@/lib/config";
import {
  MILESTONE_LABELS,
  parseSettlement,
  type SettlementView,
} from "@/lib/sui/queries";
import { Notice, ObjectLink, TxLink } from "@/components/ui";

export function SettlementPanel({ auctionId }: { auctionId: string }) {
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [digest, setDigest] = useState("");

  // Locate the settlement via the AuctionWon event for our auction.
  const wonQuery = useSuiClientQuery(
    "queryEvents",
    {
      query: { MoveEventType: `${PACKAGE_ID}::auction::AuctionWon` },
      limit: 25,
      order: "descending",
    },
    { enabled: Boolean(PACKAGE_ID), refetchInterval: 6000 },
  );

  const settlementId = useMemo(() => {
    const events = (wonQuery.data as { data?: unknown[] } | undefined)?.data ?? [];
    for (const ev of events) {
      const j = (ev as { parsedJson?: Record<string, unknown> }).parsedJson;
      if (j && j.auction_id === auctionId) return String(j.settlement_id ?? "");
    }
    return "";
  }, [wonQuery.data, auctionId]);

  const settlementQuery = useSuiClientQuery(
    "getObject",
    { id: settlementId, options: { showContent: true } },
    { enabled: Boolean(settlementId), refetchInterval: 5000 },
  );

  const settlement: SettlementView | null = useMemo(() => {
    const content = (
      settlementQuery.data as { data?: { content?: unknown } } | undefined
    )?.data?.content as
      | { dataType?: string; fields?: Record<string, unknown> }
      | undefined;
    if (!content || content.dataType !== "moveObject" || !content.fields)
      return null;
    return parseSettlement(content.fields);
  }, [settlementQuery.data]);

  async function release(index: number) {
    setBusyIndex(index);
    setError("");
    setDigest("");
    try {
      const res = await fetch("/api/settlement/release", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settlementId, milestoneIndex: index }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Release failed.");
        return;
      }
      setDigest(data.digest || "");
      settlementQuery.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setBusyIndex(null);
    }
  }

  if (!settlementId) {
    return (
      <section className="card">
        <div className="label">Programmable settlement</div>
        <p className="mt-2 text-sm text-muted">
          Once the auction closes above the reserve, the winning funds move into
          a Settlement escrow and milestone releases appear here.
        </p>
      </section>
    );
  }

  const pct = settlement
    ? Number((settlement.releasedAmount * 100n) / (settlement.amountLocked || 1n))
    : 0;

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between">
        <div className="label">Programmable settlement</div>
        <ObjectLink id={settlementId} />
      </div>

      {settlement && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="label">Locked</div>
              <div className="mt-1 font-mono text-white">
                {mistToSui(settlement.amountLocked)} SUI
              </div>
            </div>
            <div>
              <div className="label">Released to seller</div>
              <div className="mt-1 font-mono text-accent">
                {mistToSui(settlement.releasedAmount)} SUI
              </div>
            </div>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-panel2">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>

          <div className="space-y-2">
            {settlement.milestones.map((m) => (
              <div
                key={m.index}
                className="flex items-center justify-between rounded-lg border border-edge bg-panel2 px-3 py-2"
              >
                <div>
                  <div className="text-sm text-white">
                    {MILESTONE_LABELS[m.code] ?? `Milestone ${m.index + 1}`}
                  </div>
                  <div className="text-xs text-muted">
                    {m.bps / 100}% ·{" "}
                    {mistToSui((settlement.amountLocked * BigInt(m.bps)) / 10000n)}{" "}
                    SUI
                  </div>
                </div>
                {m.released ? (
                  <span className="pill border-accent/50 text-accent">released</span>
                ) : (
                  <button
                    className="btn-secondary px-3 py-1.5 text-xs"
                    onClick={() => release(m.index)}
                    disabled={busyIndex !== null || settlement.completed}
                  >
                    {busyIndex === m.index ? "Releasing…" : "Release"}
                  </button>
                )}
              </div>
            ))}
          </div>

          {settlement.completed && (
            <Notice tone="success">
              Settlement complete — all milestones released to the seller.
            </Notice>
          )}
        </>
      )}

      <p className="text-xs text-muted">
        Milestone releases are seller/admin-triggered for the demo. Each release
        is a real testnet transaction; releases can never exceed the locked
        amount and a milestone cannot be released twice.
      </p>

      {error && <Notice tone="danger">{error}</Notice>}
      {digest && (
        <Notice tone="success">
          Milestone released: <TxLink digest={digest} />
        </Notice>
      )}
    </section>
  );
}
