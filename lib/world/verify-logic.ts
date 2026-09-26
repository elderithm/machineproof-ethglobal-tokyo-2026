// Pure, dependency-light decision logic for World proof verification. Kept
// separate from the route handler (which does the network call + on-chain
// registration) so the load-bearing checks — wallet/auction binding, environment
// match, replay — can be unit tested deterministically.

import { hashSignal } from "@worldcoin/idkit-core/hashing";
import { auctionSignal } from "./signal";

/** Normalize a hash hex for comparison (drop 0x, lowercase). */
export function stripHash(h: string): string {
  return h.replace(/^0x/i, "").toLowerCase();
}

/** The signal_hash a valid proof for (auction, wallet) must carry. */
export function expectedSignalHash(auctionId: string, wallet: string): string {
  return stripHash(hashSignal(auctionSignal(auctionId, wallet)));
}

type SignalResponse = { signal_hash?: string };

/**
 * True iff at least one response's signal_hash matches the (auction, wallet)
 * binding. This is what stops a proof generated for wallet A / auction X from
 * being replayed for wallet B or auction Y.
 */
export function responsesBindWallet(
  responses: SignalResponse[],
  auctionId: string,
  wallet: string,
): boolean {
  const expected = expectedSignalHash(auctionId, wallet);
  return responses.some(
    (r) => !!r.signal_hash && stripHash(r.signal_hash) === expected,
  );
}

/** Environment is acceptable if World returned none, or it matches expected. */
export function environmentAllowed(
  actual: string | undefined,
  expected: string,
): boolean {
  return !actual || actual === expected;
}
