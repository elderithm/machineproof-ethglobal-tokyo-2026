// World-independent end-to-end proof of the on-chain auction lifecycle on Sui
// testnet: create -> open -> register two bidders -> bid -> outbid (auto-refund)
// -> close -> PurchaseRight + Settlement -> release a milestone. Prints every
// real transaction digest.
//
//   npm run sui:e2e
//
// Bidders are funded from the deployer (not the faucet). The admin key performs
// register_verified_bidder — the only step World normally gates — so the full
// financial flow can be demonstrated without a live World proof.
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { findCreated, getClient, getKeypair, loadEnv } from "./lib";

const CLOCK = "0x6";
const S = (mist: number) => BigInt(mist);
const sui = (n: bigint) => `${Number(n) / 1e9} SUI`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ObjChange = { type: string; objectType?: string; objectId?: string };

async function main() {
  loadEnv();
  const client = getClient();
  const admin = getKeypair();
  const adminAddr = admin.getPublicKey().toSuiAddress();

  const PKG = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID;
  const CAP = process.env.NEXT_PUBLIC_ADMIN_CAP_ID;
  const MACHINE = process.env.REUSE_MACHINE_ID || process.env.NEXT_PUBLIC_MACHINE_ASSET_ID;
  if (!PKG || !CAP || !MACHINE) {
    throw new Error("Set NEXT_PUBLIC_SUI_PACKAGE_ID, NEXT_PUBLIC_ADMIN_CAP_ID, and a machine id.");
  }

  const RESERVE = S(20_000_000); // 0.02 SUI
  const INCREMENT = S(10_000_000); // 0.01 SUI
  const BID_A = S(20_000_000); // 0.02 (meets reserve)
  const BID_B = S(40_000_000); // 0.04 (outbids by > increment)
  const FUND = S(150_000_000); // 0.15 SUI to each bidder
  const WINDOW_MS = 75_000;

  const digests: Record<string, string> = {};
  async function exec(tx: Transaction, signer: Ed25519Keypair, label: string) {
    // Retry transient RPC/network hiccups (public endpoints occasionally
    // connect-timeout). Safe here: a timed-out connect never reached the node.
    let lastErr: unknown;
    for (let i = 0; i < 4; i++) {
      try {
        const res = await client.signAndExecuteTransaction({
          signer,
          transaction: tx,
          options: { showEffects: true, showObjectChanges: true },
        });
        await (client as SuiJsonRpcClient).waitForTransaction({ digest: res.digest });
        digests[label] = res.digest;
        console.log(`  ${label}: ${res.digest}`);
        return res;
      } catch (e) {
        lastErr = e;
        console.log(`  ${label} retry ${i}: ${String((e as Error).message || e).slice(0, 40)}`);
        await sleep(4000);
      }
    }
    throw lastErr;
  }

  const bidderA = new Ed25519Keypair();
  const bidderB = new Ed25519Keypair();
  const addrA = bidderA.getPublicKey().toSuiAddress();
  const addrB = bidderB.getPublicKey().toSuiAddress();
  console.log("Bidder A:", addrA);
  console.log("Bidder B:", addrB);

  // 1) Fund both bidders from the deployer.
  console.log("\n[1] Funding bidders from deployer…");
  {
    const tx = new Transaction();
    const [cA, cB] = tx.splitCoins(tx.gas, [tx.pure.u64(FUND), tx.pure.u64(FUND)]);
    tx.transferObjects([cA], tx.pure.address(addrA));
    tx.transferObjects([cB], tx.pure.address(addrB));
    await exec(tx, admin, "fund");
  }

  // 2) Create + open a short, cheap auction for the existing machine.
  console.log("\n[2] Creating + opening auction…");
  const now = Date.now();
  const end = now + WINDOW_MS;
  let auctionId = "";
  {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PKG}::auction::create_auction`,
      arguments: [
        tx.object(CAP),
        tx.object(MACHINE),
        tx.pure.u64(RESERVE),
        tx.pure.u64(INCREMENT),
        tx.pure.u64(BigInt(now)),
        tx.pure.u64(BigInt(end)),
      ],
    });
    const res = await exec(tx, admin, "create_auction");
    auctionId = findCreated(res.objectChanges as ObjChange[], "::auction::Auction");
  }
  console.log("  auction:", auctionId);
  {
    const tx = new Transaction();
    tx.moveCall({ target: `${PKG}::auction::open_auction`, arguments: [tx.object(CAP), tx.object(auctionId)] });
    await exec(tx, admin, "open_auction");
  }

  // 3) Admin registers both verified bidders (the step World normally gates).
  console.log("\n[3] Registering verified bidders…");
  {
    const tx = new Transaction();
    for (const w of [addrA, addrB]) {
      tx.moveCall({
        target: `${PKG}::auction::register_verified_bidder`,
        arguments: [tx.object(CAP), tx.object(auctionId), tx.pure.address(w)],
      });
    }
    await exec(tx, admin, "register_bidders");
  }

  // 4) Bidder A bids, Bidder B outbids (A is auto-refunded).
  console.log("\n[4] Bidding…");
  const bid = async (kp: Ed25519Keypair, amount: bigint, label: string) => {
    const tx = new Transaction();
    const [pay] = tx.splitCoins(tx.gas, [tx.pure.u64(amount)]);
    tx.moveCall({
      target: `${PKG}::auction::place_bid`,
      arguments: [tx.object(auctionId), pay, tx.object(CLOCK)],
    });
    await exec(tx, kp, label);
  };
  await bid(bidderA, BID_A, `bid_A (${sui(BID_A)})`);
  const balAbefore = BigInt((await client.getBalance({ owner: addrA })).totalBalance);
  await bid(bidderB, BID_B, `bid_B outbids (${sui(BID_B)})`);
  const balAafter = BigInt((await client.getBalance({ owner: addrA })).totalBalance);
  console.log(`  Bidder A refunded on outbid: +${sui(balAafter - balAbefore)} (≈ ${sui(BID_A)})`);

  // 5) Wait for the auction to end, then close (permissionless).
  const waitMs = end - Date.now() + 3000;
  console.log(`\n[5] Waiting ${Math.max(0, Math.round(waitMs / 1000))}s for auction end…`);
  if (waitMs > 0) await sleep(waitMs);
  let settlementId = "";
  {
    const tx = new Transaction();
    tx.moveCall({ target: `${PKG}::auction::close_auction`, arguments: [tx.object(auctionId), tx.object(CLOCK)] });
    const res = await exec(tx, admin, "close_auction");
    settlementId = findCreated(res.objectChanges as ObjChange[], "::settlement::Settlement");
    const pr = findCreated(res.objectChanges as ObjChange[], "::auction::PurchaseRight");
    console.log("  PurchaseRight:", pr);
    console.log("  Settlement:", settlementId);
  }

  // 6) Release the first settlement milestone.
  console.log("\n[6] Releasing milestone 0…");
  {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PKG}::settlement::release_milestone`,
      arguments: [tx.object(CAP), tx.object(settlementId), tx.pure.u64(0n)],
    });
    await exec(tx, admin, "release_milestone");
  }

  const net = process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet";
  const scan = (d: string) => `https://suiscan.xyz/${net}/tx/${d}`;
  console.log("\n✅ End-to-end flow complete. Transaction evidence:");
  for (const [k, d] of Object.entries(digests)) console.log(`- ${k}: ${scan(d)}`);
  console.log(`\nWinner: ${addrB}`);
  console.log(`Auction object: https://suiscan.xyz/${net}/object/${auctionId}`);
  console.log(`Settlement object: https://suiscan.xyz/${net}/object/${settlementId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
