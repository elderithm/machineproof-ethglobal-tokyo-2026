// Replay / duplicate-authorization guard for World proofs.
//
// World's `nullifier_hash` is unique per (action, human identity) and is stable
// regardless of the signal. Persisting it here means a single human can register
// exactly one wallet for the auction-entry action — the Sybil property we want.
// A replayed proof (same nullifier) is rejected even if every other field is
// valid.
//
// This is an intentionally ephemeral in-process store, which the architecture
// docs permit for verification metadata. Critical fund logic remains on-chain;
// this only gates the off-chain -> on-chain registration step. In production
// this would be a shared/persistent store (e.g. Postgres/Redis).

type Consumption = {
  nullifierHash: string;
  auctionId: string;
  wallet: string;
  consumedAt: number;
};

// Survive Next.js dev hot-reloads by hanging the map off globalThis.
const g = globalThis as unknown as {
  __mp_nullifiers?: Map<string, Consumption>;
};
const store: Map<string, Consumption> = (g.__mp_nullifiers ??= new Map());

export function isNullifierUsed(nullifierHash: string): boolean {
  return store.has(nullifierHash);
}

export function consumeNullifier(
  nullifierHash: string,
  auctionId: string,
  wallet: string,
): void {
  store.set(nullifierHash, {
    nullifierHash,
    auctionId,
    wallet,
    consumedAt: Date.now(),
  });
}

export function getConsumption(nullifierHash: string): Consumption | undefined {
  return store.get(nullifierHash);
}
