"use client";

import { useMemo, useState } from "react";
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { buildPlaceBidTx } from "@/lib/sui/tx";
import { mistToSui, suiToMist } from "@/lib/config";
import type { AuctionView } from "@/lib/sui/queries";
import { Notice, TxLink } from "@/components/ui";

export function BidForm({
  auction,
  verified,
  onBid,
}: {
  auction: AuctionView;
  verified: boolean;
  onBid: () => void;
}) {
  const { mutate, isPending } = useSignAndExecuteTransaction();
  const [error, setError] = useState("");
  const [digest, setDigest] = useState("");

  const minMist = useMemo(
    () =>
      auction.highestBidder
        ? auction.highestBid + auction.minIncrement
        : auction.minIncrement,
    [auction],
  );
  const [amount, setAmount] = useState<string>(mistToSui(minMist).toString());

  const isOpen = auction.status === "OPEN";
  const canBid = verified && isOpen;

  function submit() {
    setError("");
    setDigest("");
    let mist: bigint;
    try {
      mist = suiToMist(Number(amount));
    } catch {
      setError("Enter a valid amount.");
      return;
    }
    if (mist < minMist) {
      setError(`Bid must be at least ${mistToSui(minMist)} SUI.`);
      return;
    }
    let tx;
    try {
      tx = buildPlaceBidTx(mist);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to build transaction.");
      return;
    }
    mutate(
      { transaction: tx },
      {
        onSuccess: (res) => {
          setDigest(res.digest);
          onBid();
        },
        onError: (e) =>
          setError(e instanceof Error ? e.message : "Transaction failed."),
      },
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="label">Your bid (SUI)</span>
          <input
            className="mt-1 w-full rounded-lg border border-edge bg-panel2 px-3 py-2.5 font-mono text-white outline-none focus:border-accent2"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!canBid || isPending}
          />
        </label>
        <button
          className="btn-primary h-[46px]"
          onClick={submit}
          disabled={!canBid || isPending}
        >
          {isPending ? "Confirming…" : "Place bid"}
        </button>
      </div>

      <p className="text-xs text-muted">
        Minimum next bid: <span className="font-mono">{mistToSui(minMist)} SUI</span>
        . Reserve: <span className="font-mono">{mistToSui(auction.reservePrice)} SUI</span>
        . The payment is split from your wallet&apos;s gas coin and locked
        on-chain; being outbid refunds you automatically.
      </p>

      {!verified && (
        <Notice tone="warn">
          Bidding is locked until World verification registers your wallet for
          this auction.
        </Notice>
      )}
      {verified && !isOpen && (
        <Notice tone="warn">Auction is {auction.status.toLowerCase()} — bidding is closed.</Notice>
      )}
      {error && <Notice tone="danger">{error}</Notice>}
      {digest && (
        <Notice tone="success">
          Bid confirmed on-chain: <TxLink digest={digest} />
        </Notice>
      )}
    </div>
  );
}
