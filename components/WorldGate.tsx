"use client";

import { useState } from "react";
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { AUCTION_ID, WORLD_ACTION, WORLD_APP_ID } from "@/lib/config";
import { auctionSignal } from "@/lib/world/signal";
import { Notice, TxLink } from "@/components/ui";

// Shape of the proof payload IDKit hands to onSuccess (World ID v3 / idkit 2.x).
type WorldProof = {
  proof: string;
  merkle_root: string;
  nullifier_hash: string;
  verification_level: string;
};

type Status = "idle" | "verifying" | "verified" | "error";

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
  const [error, setError] = useState<string>("");
  const [digest, setDigest] = useState<string>("");

  const signal = auctionSignal(AUCTION_ID, wallet);

  async function handleSuccess(result: WorldProof) {
    setStatus("verifying");
    setError("");
    try {
      const res = await fetch("/api/world/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proof: result, auctionId: AUCTION_ID, wallet }),
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

      {!WORLD_APP_ID ? (
        <Notice tone="warn">
          NEXT_PUBLIC_WORLD_APP_ID is not set — configure a World app to enable
          verification.
        </Notice>
      ) : (
        <IDKitWidget
          app_id={WORLD_APP_ID as `app_${string}`}
          action={WORLD_ACTION}
          signal={signal}
          verification_level={VerificationLevel.Orb}
          onSuccess={handleSuccess}
        >
          {({ open }) => (
            <button
              className="btn-primary w-full"
              onClick={open}
              disabled={status === "verifying"}
            >
              {status === "verifying"
                ? "Verifying proof…"
                : "Verify with World ID to join"}
            </button>
          )}
        </IDKitWidget>
      )}

      {status === "error" && <Notice tone="danger">{error}</Notice>}
      <p className="text-xs text-muted">
        Until verification succeeds, bidding stays locked. Cancelling the World
        dialog leaves the auction inaccessible.
      </p>
    </div>
  );
}
