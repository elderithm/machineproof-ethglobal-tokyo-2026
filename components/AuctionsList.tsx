"use client";

import { useMemo } from "react";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { PACKAGE_ID, mistToSui, objectUrl, shorten } from "@/lib/config";

type Created = {
  auction_id: string;
  machine_asset_id: string;
  reserve_price: string;
  end_ms: string;
};

export function AuctionsList({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const q = useSuiClientQuery(
    "queryEvents",
    {
      query: { MoveEventType: `${PACKAGE_ID}::auction::AuctionCreated` },
      limit: 50,
      order: "descending",
    },
    { enabled: Boolean(PACKAGE_ID), refetchInterval: 10000 },
  );

  const auctions = useMemo(() => {
    const events =
      ((q.data as { data?: { parsedJson?: Created }[] } | undefined)?.data ?? [])
        .map((e) => e.parsedJson)
        .filter((j): j is Created => Boolean(j?.auction_id));
    // Dedupe by auction id, newest first (query is already descending).
    const seen = new Set<string>();
    const out: Created[] = [];
    for (const a of events) {
      if (seen.has(a.auction_id)) continue;
      seen.add(a.auction_id);
      out.push(a);
    }
    return out;
  }, [q.data]);

  if (!PACKAGE_ID) return null;

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <div className="label">Marketplace · auctions</div>
        <span className="text-xs text-muted">{auctions.length} listed</span>
      </div>

      {auctions.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          No auctions found yet. Seed one with <code>npm run sui:seed</code>.
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {auctions.map((a) => {
            const active = a.auction_id === selectedId;
            const ended = Date.now() > Number(a.end_ms);
            return (
              <button
                key={a.auction_id}
                onClick={() => onSelect(a.auction_id)}
                className={`rounded-lg border p-3 text-left transition ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-edge bg-panel2 hover:border-accent2"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white">
                    {shorten(a.auction_id)}
                  </span>
                  {active && (
                    <span className="pill border-accent/50 text-accent">active</span>
                  )}
                </div>
                <div className="mt-2 text-xs text-muted">
                  Reserve{" "}
                  <span className="font-mono text-white">
                    {mistToSui(a.reserve_price)} SUI
                  </span>
                </div>
                <div className="text-xs text-muted">
                  {ended ? "ended" : "open"} ·{" "}
                  <a
                    className="link"
                    href={objectUrl(a.auction_id)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    explorer ↗
                  </a>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
