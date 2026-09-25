import { NextResponse } from "next/server";
import { hashSignal } from "@worldcoin/idkit-core/hashing";
import { WORLD_ENVIRONMENT, WORLD_RP_ID } from "@/lib/config";
import { auctionSignal, normalizeSuiAddress } from "@/lib/world/signal";
import {
  consumeNullifier,
  getConsumption,
  isNullifierUsed,
} from "@/lib/world/nullifier-store";
import { adminConfigured, registerVerifiedBidder } from "@/lib/sui/admin";

// World ID 4.0 proof verification + on-chain bidder registration.
// Must run on Node (admin signer + outbound RPC), not the edge.
export const runtime = "nodejs";

const VERIFY_HOST = "https://developer.world.org";

type Body = {
  result?: {
    responses?: Array<{ nullifier?: string; signal_hash?: string }>;
    environment?: string;
    [k: string]: unknown;
  };
  auctionId?: string;
  wallet?: string;
};

function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

const stripHash = (h: string) => h.replace(/^0x/i, "").toLowerCase();

export async function POST(req: Request) {
  try {
    const { result, auctionId, wallet } = (await req.json()) as Body;
    if (!result || !auctionId || !wallet) {
      return fail("Missing result, auctionId, or wallet.");
    }
    if (!WORLD_RP_ID) {
      return fail("World relying party is not configured on the server.", 500);
    }

    // 1) Verify the proof with World. Forward the IDKit result as-is.
    const verifyRes = await fetch(`${VERIFY_HOST}/api/v4/verify/${WORLD_RP_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(result),
    });
    const data = (await verifyRes.json().catch(() => ({}))) as {
      success?: boolean;
      code?: string;
      detail?: string;
      nullifier?: string;
      environment?: string;
    };
    if (!verifyRes.ok || !data.success) {
      return fail(data.detail || data.code || "World verification rejected.");
    }

    // 2) Bind the proof to THIS auction + wallet: the signal it committed to must
    //    equal our reconstructed signal, so a proof for wallet A / auction X
    //    cannot be replayed for wallet B or auction Y.
    const expected = stripHash(hashSignal(auctionSignal(auctionId, wallet)));
    const responses = Array.isArray(result.responses) ? result.responses : [];
    const signalOk = responses.some(
      (r) => r.signal_hash && stripHash(r.signal_hash) === expected,
    );
    if (!signalOk) {
      return fail("Proof signal does not match this wallet and auction.", 400);
    }

    // 3) Environment must match what we requested.
    if (data.environment && data.environment !== WORLD_ENVIRONMENT) {
      return fail(`Unexpected proof environment: ${data.environment}.`, 400);
    }

    // 4) Replay / duplicate-authorization guard (the app must track nullifiers).
    const nullifier = data.nullifier || responses[0]?.nullifier || "";
    const normalizedWallet = normalizeSuiAddress(wallet);
    if (nullifier && isNullifierUsed(nullifier)) {
      const prev = getConsumption(nullifier);
      const sameContext =
        prev && prev.wallet === normalizedWallet && prev.auctionId === auctionId;
      if (!sameContext) {
        return fail(
          "This human is already registered for the auction (duplicate/replayed proof).",
          409,
        );
      }
    }

    // 5) Consume the attestation on-chain: mark this wallet eligible to bid.
    if (!adminConfigured()) {
      return fail("Server admin signer is not configured.", 500);
    }
    const { digest } = await registerVerifiedBidder(normalizedWallet);
    if (nullifier) consumeNullifier(nullifier, auctionId, normalizedWallet);

    return NextResponse.json({ ok: true, digest });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unexpected server error.", 500);
  }
}
