// Replay / duplicate-authorization guard for World proofs.
//
// World's `nullifier_hash` is unique per (action, human identity) and is stable
// regardless of the signal. Persisting it means a single human can register
// exactly one wallet for the auction-entry action — the Sybil property we want.
// A replayed proof (same nullifier) is rejected even if every other field is
// valid.
//
// State is kept in-process (surviving dev hot-reloads via globalThis) and, best
// effort, mirrored to `.data/nullifiers.json` so replay protection also survives
// a server restart. All file I/O is guarded so a read-only/serverless
// environment degrades gracefully to in-memory only. Critical fund logic remains
// on-chain; this only gates the off-chain -> on-chain registration step.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type Consumption = {
  nullifierHash: string;
  auctionId: string;
  wallet: string;
  consumedAt: number;
};

const DIR = resolve(process.cwd(), ".data");
const FILE = resolve(DIR, "nullifiers.json");

const g = globalThis as unknown as {
  __mp_nullifiers?: Map<string, Consumption>;
};

function load(): Map<string, Consumption> {
  if (g.__mp_nullifiers) return g.__mp_nullifiers;
  const map = new Map<string, Consumption>();
  try {
    if (existsSync(FILE)) {
      const arr = JSON.parse(readFileSync(FILE, "utf8")) as Consumption[];
      for (const c of arr) map.set(c.nullifierHash, c);
    }
  } catch {
    // Corrupt/unreadable file → start empty; not fatal.
  }
  g.__mp_nullifiers = map;
  return map;
}

const store = load();

function persist(): void {
  try {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(FILE, JSON.stringify([...store.values()], null, 2));
  } catch {
    // Read-only FS (e.g. serverless) → in-memory only; still correct per process.
  }
}

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
  persist();
}

export function getConsumption(nullifierHash: string): Consumption | undefined {
  return store.get(nullifierHash);
}
