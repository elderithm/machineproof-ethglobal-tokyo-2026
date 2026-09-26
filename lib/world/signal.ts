// World ID signal construction — shared by the browser (passed to IDKitWidget)
// and the server (reconstructed before verifyCloudProof). The signal binds a
// proof to BOTH a specific auction and a specific wallet, so a proof produced
// for wallet A / auction X cannot be replayed for wallet B or auction Y.
//
// IDKit hashes the raw signal string internally; verifyCloudProof re-hashes the
// same raw string on the server. Both sides MUST produce the identical string,
// which is why this helper is the single source of truth.

/** Normalize a Sui address for stable, case-insensitive signal construction. */
export function normalizeSuiAddress(address: string): string {
  const a = address.trim().toLowerCase();
  return a.startsWith("0x") ? a : `0x${a}`;
}

/** The exact signal string bound into the World proof. */
export function auctionSignal(auctionId: string, walletAddress: string): string {
  return `machineproof-auction:${auctionId}:${normalizeSuiAddress(walletAddress)}`;
}
