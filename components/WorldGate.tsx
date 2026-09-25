"use client";

import { useState } from "react";
import { IDKitRequestWidget, orbLegacy } from "@worldcoin/idkit";
import {
  AUCTION_ID,
  WORLD_ACTION,
  WORLD_APP_ID,
  WORLD_CONFIGURED,
  WORLD_ENVIRONMENT,
} from "@/lib/config";
import { auctionSignal } from "@/lib/world/signal";
import { Notice, TxLink } from "@/components/ui";

type RpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

type Status = "idle" | "loading" | "open" | "verifying" | "verified" | "error";

export function WorldGate({
  wallet,
  verified,
  onVerified,
}: {
  wallet: string;
  verified: boolean;
  onVerified: (digest: string) => void;
}) {
  const [status, setStatus] = useState<Status>(verified ? "verified" : "idle");
  const [error, setError] = useState("");
  const [digest, setDigest] = useState("");
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [open, setOpen] = useState(false);

  const signal = auctionSignal(AUCTION_ID, wallet);

  // 1) Fetch a fresh, server-signed rp_context, then open the widget.
  async function begin() {
    setError("");
    setStatus("loading");
    try {
      const res = await fetch("/api/world/request");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error || "Could not start World verification.");
        return;
      }
      setRpContext(data.rpContext);
      setStatus("open");
      setOpen(true);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Network error.");
    }
  }

  // 2) Widget returned a proof — verify it server-side and register on-chain.
  async function handleSuccess(result: unknown) {
    setStatus("verifying");
    setError("");
    try {
      const res = await fetch("/api/world/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ result, auctionId: AUCTION_ID, wallet }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("error");
        setError(data.error || "Verification rejected.");
        return;
      }
      setDigest(data.digest || "");
      setStatus("verified");
      onVerified(data.digest || "");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Network error.");
    }
  }

  if (verified || status === "verified") {
    return (
      <Notice tone="success">
        <p className="font-semibold">Human verification complete for this auction.</p>
        {digest && (
          <p className="mt-1 text-xs">
            Registered on-chain: <TxLink digest={digest} />
          </p>
        )}
      </Notice>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Prove you are a unique human to enter this auction. This helps prevent
        bots and duplicate identities from flooding bidder registration. The
        proof is bound to <span className="font-mono text-xs">this auction</span>{" "}
        and <span className="font-mono text-xs">your wallet</span>, so it cannot
        be reused for a different bidder context.
      </p>

      {!WORLD_CONFIGURED ? (
        <Notice tone="warn">
          World is not configured — set NEXT_PUBLIC_WORLD_APP_ID and
          NEXT_PUBLIC_WORLD_RP_ID (after registering the relying party).
        </Notice>
      ) : (
        <>
          <button
            className="btn-primary w-full"
            onClick={begin}
            disabled={status === "loading" || status === "verifying"}
          >
            {status === "loading"
              ? "Preparing request…"
              : status === "verifying"
                ? "Verifying proof…"
                : "Verify with World ID to join"}
          </button>

          {rpContext && (
            <IDKitRequestWidget
              app_id={WORLD_APP_ID as `app_${string}`}
              action={WORLD_ACTION}
              rp_context={rpContext}
              allow_legacy_proofs={true}
              preset={orbLegacy({ signal })}
              environment={WORLD_ENVIRONMENT}
              open={open}
              onOpenChange={setOpen}
              onSuccess={handleSuccess}
              onError={(e: unknown) => {
                setStatus("error");
                setError(
                  (e as { message?: string })?.message ||
                    "World verification was cancelled or failed.",
                );
              }}
            />
          )}
        </>
      )}

      {status === "error" && <Notice tone="danger">{error}</Notice>}
      <p className="text-xs text-muted">
        Until verification succeeds, bidding stays locked. Cancelling the World
        dialog leaves the auction inaccessible.
      </p>
    </div>
  );
}
