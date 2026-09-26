// Stretch (World ID for Agents): a bounded, human-authorized bidding agent.
//
// A World-verified human delegates a NARROW policy to an agent:
//   - one specific auction,
//   - a maximum bid ceiling,
//   - an expiry,
//   - action = bid only (never settlement).
// The agent then watches the auction and places the minimum winning bid when
// outbid — but refuses to exceed the ceiling, bid after expiry, or touch any
// other auction. This is presented as a future-facing extension; the primary
// demo is the human auction flow.
//
//   AGENT_MAX_BID_SUI=1.5 AGENT_EXPIRY_MINUTES=30 npm run agent:bid
//
// Bring your own already-registered bidder key via AGENT_BIDDER_KEY (bech32),
// or set AGENT_SELF_SETUP=1 with SUI_ADMIN_SECRET_KEY to have the script
// generate + fund + admin-register a fresh delegated key for a self-contained
// demo (mirrors what World verification would authorize).
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { getClient, keypairFromSecret, loadEnv } from "./lib";

const CLOCK = "0x6";
const sui = (n: bigint) => `${Number(n) / 1e9} SUI`;
const suiToMist = (n: number) => BigInt(Math.round(n * 1e9));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type AuctionState = {
  status: number;
  endMs: number;
  reserve: bigint;
  increment: bigint;
  highestBid: bigint;
  highestBidder: string | null;
};

async function readAuction(
  client: SuiJsonRpcClient,
  id: string,
): Promise<AuctionState> {
  const o = await client.getObject({ id, options: { showContent: true } });
  const f = (o.data?.content as { fields?: Record<string, unknown> } | undefined)
    ?.fields as Record<string, unknown>;
  const hb = f.highest_bidder as
    | string
    | { fields?: { vec?: string[] } }
    | null;
  let highestBidder: string | null = null;
  if (typeof hb === "string") highestBidder = hb;
  else if (hb && typeof hb === "object")
    highestBidder = hb.fields?.vec?.[0] ?? null;
  return {
    status: Number(f.status),
    endMs: Number(f.end_ms),
    reserve: BigInt(String(f.reserve_price)),
    increment: BigInt(String(f.min_increment)),
    highestBid: BigInt(String(f.highest_bid)),
    highestBidder,
  };
}

async function main() {
  loadEnv();
  const client = getClient();

  const PKG = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID;
  const AUCTION =
    process.env.AGENT_AUCTION_ID || process.env.NEXT_PUBLIC_AUCTION_ID;
  if (!PKG || !AUCTION) throw new Error("Set NEXT_PUBLIC_SUI_PACKAGE_ID and an auction id.");

  // --- The bounded delegation policy ---
  const maxBid = suiToMist(Number(process.env.AGENT_MAX_BID_SUI ?? "1.5"));
  const expiryMs = Date.now() + Number(process.env.AGENT_EXPIRY_MINUTES ?? "30") * 60_000;
  const runtimeMs = Number(process.env.AGENT_MAX_RUNTIME_MINUTES ?? "6") * 60_000;
  const pollMs = Number(process.env.AGENT_POLL_SECONDS ?? "10") * 1000;

  // --- The delegated key ---
  let agent: Ed25519Keypair;
  if (process.env.AGENT_BIDDER_KEY) {
    agent = keypairFromSecret(process.env.AGENT_BIDDER_KEY);
  } else if (process.env.AGENT_SELF_SETUP === "1" && process.env.SUI_ADMIN_SECRET_KEY) {
    agent = new Ed25519Keypair();
    const admin = keypairFromSecret(process.env.SUI_ADMIN_SECRET_KEY);
    const addr = agent.getPublicKey().toSuiAddress();
    console.log("Self-setup: generated agent key", addr);
    // Fund it (small amount for a demo bid + gas).
    const fund = new Transaction();
    const [c] = fund.splitCoins(fund.gas, [fund.pure.u64(suiToMist(0.05))]);
    fund.transferObjects([c], fund.pure.address(addr));
    const fr = await client.signAndExecuteTransaction({ signer: admin, transaction: fund, options: { showEffects: true } });
    await client.waitForTransaction({ digest: fr.digest }); // avoid stale gas-coin version
    // Admin-register it (this is what World verification would authorize).
    const CAP = process.env.NEXT_PUBLIC_ADMIN_CAP_ID!;
    const reg = new Transaction();
    reg.moveCall({
      target: `${PKG}::auction::register_verified_bidder`,
      arguments: [reg.object(CAP), reg.object(AUCTION), reg.pure.address(addr)],
    });
    const r = await client.signAndExecuteTransaction({ signer: admin, transaction: reg, options: { showEffects: true } });
    await client.waitForTransaction({ digest: r.digest });
    console.log("Self-setup: funded + registered agent wallet.");
  } else {
    throw new Error("Provide AGENT_BIDDER_KEY, or AGENT_SELF_SETUP=1 with SUI_ADMIN_SECRET_KEY.");
  }
  const agentAddr = agent.getPublicKey().toSuiAddress();

  console.log("\n=== Bounded bidding agent ===");
  console.log("auction:", AUCTION);
  console.log("policy: max bid", sui(maxBid), "| expiry", new Date(expiryMs).toISOString(), "| action: bid only");
  console.log("agent wallet:", agentAddr, "\n");

  const deadline = Date.now() + runtimeMs;
  while (Date.now() < deadline) {
    const a = await readAuction(client, AUCTION);
    const now = Date.now();

    if (a.status !== 1) return console.log("Auction is not open — agent stops.");
    if (now >= a.endMs) return console.log("Auction ended — agent stops.");
    if (now >= expiryMs) return console.log("Delegation expired — agent stands down (policy).");

    if (a.highestBidder === agentAddr) {
      console.log(`Leading at ${sui(a.highestBid)} — holding.`);
      await sleep(pollMs);
      continue;
    }

    // Minimum bid that both outbids the leader and clears the reserve (to win).
    const outbid = a.highestBidder ? a.highestBid + a.increment : a.increment;
    const target = outbid > a.reserve ? outbid : a.reserve;

    if (target > maxBid) {
      return console.log(
        `Next winning bid ${sui(target)} exceeds ceiling ${sui(maxBid)} — agent stands down (policy enforced).`,
      );
    }

    console.log(`Outbid detected (leader ${sui(a.highestBid)}). Bidding ${sui(target)} (≤ ceiling)…`);
    const tx = new Transaction();
    const [pay] = tx.splitCoins(tx.gas, [tx.pure.u64(target)]);
    tx.moveCall({ target: `${PKG}::auction::place_bid`, arguments: [tx.object(AUCTION), pay, tx.object(CLOCK)] });
    try {
      const r = await client.signAndExecuteTransaction({ signer: agent, transaction: tx, options: { showEffects: true } });
      await client.waitForTransaction({ digest: r.digest });
      console.log(`  bid placed: ${r.digest}`);
    } catch (e) {
      console.log("  bid failed:", e instanceof Error ? e.message.slice(0, 80) : e);
    }
    await sleep(pollMs);
  }
  console.log("Agent runtime budget reached — stopping.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
