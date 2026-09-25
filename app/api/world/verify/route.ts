import { NextResponse } from "next/server";
import { verifyCloudProof, type ISuccessResult } from "@worldcoin/idkit";
import { WORLD_ACTION, WORLD_APP_ID } from "@/lib/config";
import { auctionSignal, normalizeSuiAddress } from "@/lib/world/signal";
import {
  consumeNullifier,
  getConsumption,
  isNullifierUsed,
} from "@/lib/world/nullifier-store";
import { adminConfigured, registerVerifiedBidder } from "@/lib/sui/admin";

// Must run on Node (uses the admin signer + outbound RPC), not the edge.
export const runtime = "nodejs";

type Body = {
  proof?: ISuccessResult;
  auctionId?: string;
  wallet?: string;
};

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  try {
    const { proof, auctionId, wallet } = (await req.json()) as Body;
    if (!proof || !auctionId || !wallet) {
      return fail("Missing proof, auctionId, or wallet.");
    }
    if (!WORLD_APP_ID) {
      return fail("World app is not configured on the server.", 500);
    }

    // Reconstruct the expected signal server-side. We never trust a
    // client-provided hash; the proof must have been generated for exactly this
    // (auction, wallet) pair or verification fails.
    const signal = auctionSignal(auctionId, wallet);

    const result = await verifyCloudProof(
      proof,
      WORLD_APP_ID,
      WORLD_ACTION,
      signal,
    );
    if (!result.success) {
      return fail(
        result.detail || result.code || "World verification rejected.",
      );
    }

    // Replay / duplicate-authorization guard. World's nullifier_hash is unique
    // per human per action, so a second wallet from the same human is rejected.
    const normalizedWallet = normalizeSuiAddress(wallet);
    const nullifier = proof.nullifier_hash;
    if (nullifier && isNullifierUsed(nullifier)) {
      const prev = getConsumption(nullifier);
      const sameContext =
        prev &&
        prev.wallet === normalizedWallet &&
        prev.auctionId === auctionId;
      if (!sameContext) {
        return fail(
          "This human is already registered for the auction (duplicate/replayed proof).",
          409,
        );
      }
    }

    if (!adminConfigured()) {
      return fail(
        "Server admin signer is not configured (package/auction/cap/key).",
        500,
      );
    }

    // Consume the attestation on-chain: mark this wallet eligible to bid.
    const { digest } = await registerVerifiedBidder(normalizedWallet);
    if (nullifier) consumeNullifier(nullifier, auctionId, normalizedWallet);

    return NextResponse.json({ ok: true, digest });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unexpected server error.", 500);
  }
}
