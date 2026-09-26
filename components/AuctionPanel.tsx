"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { AUCTION_ID, mistToSui, shorten } from "@/lib/config";
import { parseAuction, type AuctionView } from "@/lib/sui/queries";
import { buildCloseAuctionTx } from "@/lib/sui/tx";
import { WorldGate } from "@/components/WorldGate";
import { BidForm } from "@/components/BidForm";
import { Notice, Stat, StatusPill, TxLink } from "@/components/ui";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "ended";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}h ` : ""}${m}m ${sec}s`;
}

export function AuctionPanel({
  onWinner,
}: {
  onWinner?: (winner: string) => void;
}) {
  const account = useCurrentAccount();
  const wallet = account?.address ?? "";
  const now = useNow();
  const [verified, setVerified] = useState(false);
  const [closeDigest, setCloseDigest] = useState("");
  const [closeError, setCloseError] = useState("");
  const closeTx = useSignAndExecuteTransaction();

  const { data, refetch, isLoading, error } = useSuiClientQuery(
    "getObject",
    { id: AUCTION_ID, options: { showContent: true } },
    { enabled: Boolean(AUCTION_ID), refetchInterval: 5000 },
  );

  const auction: AuctionView | null = useMemo(() => {
    const content = (data as { data?: { content?: unknown } } | undefined)?.data
      ?.content as { dataType?: string; fields?: Record<string, unknown> } | undefined;
    if (!content || content.dataType !== "moveObject" || !content.fields)
      return null;
    return parseAuction(content.fields);
  }, [data]);

  // Read the connected wallet's membership in the on-chain verified registry, so
  // the "verified" state survives a page reload (not just React state).
  const membership = useSuiClientQuery(
    "getDynamicFieldObject",
    {
      parentId: auction?.verifiedTableId ?? "",
      name: { type: "address", value: wallet },
    },
    {
      enabled: Boolean(auction?.verifiedTableId && wallet),
      refetchInterval: 5000,
    },
  );
  const isVerifiedOnChain = Boolean(
    (membership.data as { data?: unknown } | undefined)?.data,
  );

  // Reflect winner up to the settlement panel once closed.
  useEffect(() => {
    if (auction?.status === "CLOSED" && auction.highestBidder) {
      onWinner?.(auction.highestBidder);
    }
  }, [auction, onWinner]);

  if (!AUCTION_ID) return null;
  if (isLoading) return <div className="card text-muted">Loading auction…</div>;
  if (error || !auction)
    return (
      <div className="card">
        <Notice tone="danger">
          Could not read the auction object. Check NEXT_PUBLIC_AUCTION_ID.
        </Notice>
      </div>
    );

  const isWinner =
    !!wallet && !!auction.highestBidder && wallet === auction.highestBidder;
  const isVerified = verified || isWinner || isVerifiedOnChain;
  const ended = now >= auction.endMs;
  const canClose =
    ended && !auction.finalized && auction.status === "OPEN";

  function doClose() {
    setCloseError("");
    let tx;
    try {
      tx = buildCloseAuctionTx();
    } catch (e) {
      setCloseError(e instanceof Error ? e.message : "Build failed.");
      return;
    }
    closeTx.mutate(
      { transaction: tx },
      {
        onSuccess: (res) => {
          setCloseDigest(res.digest);
          refetch();
        },
        onError: (e) =>
          setCloseError(e instanceof Error ? e.message : "Close failed."),
      },
    );
  }

  return (
    <section className="card space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Auction</div>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Live testnet auction
          </h2>
        </div>
        <StatusPill status={auction.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Highest bid">
          <span className="font-mono text-accent">
            {mistToSui(auction.highestBid)} SUI
          </span>
        </Stat>
        <Stat label="Highest bidder">
          {auction.highestBidder ? (
            <span className="font-mono">{shorten(auction.highestBidder)}</span>
          ) : (
            <span className="text-muted">none</span>
          )}
        </Stat>
        <Stat label="Reserve">
          <span className="font-mono">{mistToSui(auction.reservePrice)} SUI</span>
        </Stat>
        <Stat label={ended ? "Time" : "Ends in"}>
          <span className="font-mono">
            {ended ? "ended" : formatCountdown(auction.endMs - now)}
          </span>
        </Stat>
      </div>

      {!account ? (
        <Notice tone="info">Connect a Sui wallet to join the auction.</Notice>
      ) : auction.status === "OPEN" && !ended ? (
        <div className="space-y-4">
          <WorldGate
            wallet={wallet}
            verified={isVerified}
            onVerified={() => {
              setVerified(true);
              refetch();
            }}
          />
          <BidForm auction={auction} verified={isVerified} onBid={refetch} />
        </div>
      ) : null}

      {canClose && (
        <div className="space-y-2 border-t border-edge pt-4">
          <p className="text-sm text-muted">
            Auction time has ended. Anyone may finalize — the winner is fixed by
            the standing high bid.
          </p>
          <button
            className="btn-secondary"
            onClick={doClose}
            disabled={closeTx.isPending}
          >
            {closeTx.isPending ? "Finalizing…" : "Close & finalize auction"}
          </button>
          {closeError && <Notice tone="danger">{closeError}</Notice>}
        </div>
      )}

      {closeDigest && (
        <Notice tone="success">
          Auction finalized: <TxLink digest={closeDigest} />
        </Notice>
      )}

      {auction.status === "CANCELLED" && (
        <Notice tone="warn">
          Auction cancelled (reserve not met). Any locked bid was refunded.
        </Notice>
      )}
      {auction.status === "CLOSED" && auction.highestBidder && (
        <Notice tone="success">
          Winner: <span className="font-mono">{shorten(auction.highestBidder)}</span>{" "}
          at {mistToSui(auction.highestBid)} SUI — a PurchaseRight was issued and
          funds moved into settlement.
        </Notice>
      )}
    </section>
  );
}
