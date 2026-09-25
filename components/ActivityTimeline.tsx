"use client";

import { useMemo } from "react";
import { useSuiClientQuery } from "@mysten/dapp-kit";
import { PACKAGE_ID, mistToSui, shorten, txUrl } from "@/lib/config";

type SuiEvent = {
  type: string;
  parsedJson?: Record<string, unknown>;
  timestampMs?: string | null;
  id?: { txDigest?: string };
};

function eventName(type: string): string {
  const parts = type.split("::");
  return parts[parts.length - 1] || type;
}

function detail(name: string, j: Record<string, unknown> = {}): string {
  const amt = (k: string) =>
    j[k] != null ? `${mistToSui(String(j[k]))} SUI` : "";
  switch (name) {
    case "BidPlaced":
      return `${shorten(String(j.bidder ?? ""))} · ${amt("amount")}`;
    case "BidRefunded":
      return `${shorten(String(j.bidder ?? ""))} refunded ${amt("amount")}`;
    case "AuctionWon":
      return `${shorten(String(j.winner ?? ""))} · ${amt("winning_amount")}`;
    case "PurchaseRightIssued":
      return `to ${shorten(String(j.winner ?? ""))}`;
    case "BidderVerified":
      return shorten(String(j.wallet ?? ""));
    case "MilestoneReleased":
      return `#${j.milestone_index} · ${amt("amount")}`;
    case "SettlementCreated":
      return amt("amount_locked");
    default:
      return "";
  }
}

export function ActivityTimeline() {
  const auctionEvents = useSuiClientQuery(
    "queryEvents",
    {
      query: { MoveEventModule: { package: PACKAGE_ID, module: "auction" } },
      limit: 50,
      order: "descending",
    },
    { enabled: Boolean(PACKAGE_ID), refetchInterval: 6000 },
  );
  const settlementEvents = useSuiClientQuery(
    "queryEvents",
    {
      query: { MoveEventModule: { package: PACKAGE_ID, module: "settlement" } },
      limit: 50,
      order: "descending",
    },
    { enabled: Boolean(PACKAGE_ID), refetchInterval: 6000 },
  );

  const events = useMemo(() => {
    const a = ((auctionEvents.data as { data?: SuiEvent[] })?.data ?? []) as SuiEvent[];
    const s = ((settlementEvents.data as { data?: SuiEvent[] })?.data ?? []) as SuiEvent[];
    return [...a, ...s].sort(
      (x, y) => Number(y.timestampMs ?? 0) - Number(x.timestampMs ?? 0),
    );
  }, [auctionEvents.data, settlementEvents.data]);

  return (
    <section className="card">
      <div className="label">Activity</div>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          On-chain events (bids, refunds, winner, settlement) appear here.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {events.map((ev, i) => {
            const name = eventName(ev.type);
            const digest = ev.id?.txDigest ?? "";
            return (
              <li
                key={`${digest}-${i}`}
                className="flex items-center justify-between gap-3 border-b border-edge/50 pb-2 text-sm last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent2" />
                  <span className="text-white">{name}</span>
                  <span className="text-muted">{detail(name, ev.parsedJson)}</span>
                </div>
                {digest && (
                  <a
                    className="link font-mono text-xs"
                    href={txUrl(digest)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shorten(digest)} ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
