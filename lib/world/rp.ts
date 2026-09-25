// SERVER-ONLY. Builds the World ID 4.0 `rp_context` a client needs before it can
// open the IDKit request widget.
//
// The relying party (registered in the World developer portal) has an ECDSA
// signing key. The server signs a fresh nonce + timestamps (+ the action) with
// that key via idkit-server's signRequest; the resulting RpContext proves to the
// World App that this proof request comes from our registered RP. The signing
// key never leaves the server.

import "server-only";
import { signRequest } from "@worldcoin/idkit-server";
import { WORLD_RP_ID } from "@/lib/config";

export type RpContext = {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
};

export function rpConfigured(): boolean {
  return Boolean(process.env.WORLD_RP_SIGNING_KEY && WORLD_RP_ID);
}

/**
 * Build a signed rp_context for the given action. `ttl` bounds how long the
 * request stays valid (seconds).
 */
export function buildRpContext(action: string, ttl = 300): RpContext {
  const signingKeyHex = process.env.WORLD_RP_SIGNING_KEY;
  if (!signingKeyHex || !WORLD_RP_ID) {
    throw new Error(
      "World RP not configured (WORLD_RP_SIGNING_KEY / NEXT_PUBLIC_WORLD_RP_ID).",
    );
  }
  const sig = signRequest({ signingKeyHex, action, ttl });
  return {
    rp_id: WORLD_RP_ID,
    nonce: sig.nonce,
    created_at: sig.createdAt,
    expires_at: sig.expiresAt,
    signature: sig.sig,
  };
}
