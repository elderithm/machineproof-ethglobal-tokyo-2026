// Seed the on-chain demo state: register the sample machine, create the auction
// for it, and open it for bidding. Prints the object ids for .env.local.
//
//   npm run sui:seed
//
// Env knobs (optional): RESERVE_SUI, MIN_INCREMENT_SUI, AUCTION_DURATION_MINUTES.
import { Transaction } from "@mysten/sui/transactions";
import { SAMPLE_MACHINE } from "../lib/sample-machine";
import {
  ensureFunds,
  findCreated,
  getClient,
  getKeypair,
  loadEnv,
} from "./lib";

const bytes = (s: string): number[] => Array.from(new TextEncoder().encode(s));
const suiToMist = (sui: number): bigint => BigInt(Math.round(sui * 1e9));

async function main() {
  loadEnv();
  const client = getClient();
  const keypair = getKeypair();
  const address = keypair.getPublicKey().toSuiAddress();

  const PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID;
  const ADMIN_CAP_ID = process.env.NEXT_PUBLIC_ADMIN_CAP_ID;
  if (!PACKAGE_ID || !ADMIN_CAP_ID) {
    throw new Error(
      "NEXT_PUBLIC_SUI_PACKAGE_ID and NEXT_PUBLIC_ADMIN_CAP_ID must be set (run sui:deploy first).",
    );
  }

  const reserve = suiToMist(Number(process.env.RESERVE_SUI ?? "1"));
  const increment = suiToMist(Number(process.env.MIN_INCREMENT_SUI ?? "0.1"));
  const durationMin = Number(process.env.AUCTION_DURATION_MINUTES ?? "30");

  await ensureFunds(client, address);

  const m = SAMPLE_MACHINE;

  // 1) Register the machine passport.
  const tx1 = new Transaction();
  tx1.moveCall({
    target: `${PACKAGE_ID}::machine_asset::register`,
    arguments: [
      tx1.pure.string(m.machineId),
      tx1.pure.string(m.manufacturer),
      tx1.pure.string(m.model),
      tx1.pure.vector("u8", bytes(m.serialHash)),
      tx1.pure.string(m.provenanceUri),
      tx1.pure.vector("u8", bytes(m.provenanceHash)),
      tx1.pure.vector("u8", bytes(m.inspectionHash)),
      tx1.pure.string(m.inspectionStatus),
      tx1.pure.u64(BigInt(Date.now())),
    ],
  });
  const r1 = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx1,
    options: { showObjectChanges: true },
  });
  await client.waitForTransaction({ digest: r1.digest });
  const machineId = findCreated(
    r1.objectChanges as never,
    "::machine_asset::MachineAsset",
  );
  if (!machineId) throw new Error("MachineAsset not created. Tx: " + r1.digest);
  console.log("Machine registered:", machineId);

  // 2) Create the auction for that machine.
  const startMs = Date.now();
  const endMs = startMs + durationMin * 60 * 1000;
  const tx2 = new Transaction();
  tx2.moveCall({
    target: `${PACKAGE_ID}::auction::create_auction`,
    arguments: [
      tx2.object(ADMIN_CAP_ID),
      tx2.object(machineId),
      tx2.pure.u64(reserve),
      tx2.pure.u64(increment),
      tx2.pure.u64(BigInt(startMs)),
      tx2.pure.u64(BigInt(endMs)),
    ],
  });
  const r2 = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx2,
    options: { showObjectChanges: true },
  });
  await client.waitForTransaction({ digest: r2.digest });
  const auctionId = findCreated(r2.objectChanges as never, "::auction::Auction");
  if (!auctionId) throw new Error("Auction not created. Tx: " + r2.digest);
  console.log("Auction created:", auctionId);

  // 3) Open it for bidding.
  const tx3 = new Transaction();
  tx3.moveCall({
    target: `${PACKAGE_ID}::auction::open_auction`,
    arguments: [tx3.object(ADMIN_CAP_ID), tx3.object(auctionId)],
  });
  const r3 = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx3,
    options: { showEffects: true },
  });
  await client.waitForTransaction({ digest: r3.digest });
  console.log("Auction opened. Tx:", r3.digest);

  console.log("\n# --- paste into .env.local ---");
  console.log(`NEXT_PUBLIC_MACHINE_ASSET_ID=${machineId}`);
  console.log(`NEXT_PUBLIC_AUCTION_ID=${auctionId}`);
  console.log(
    `\nAuction ends at ${new Date(endMs).toISOString()} (${durationMin} min). ` +
      `Reserve ${process.env.RESERVE_SUI ?? "1"} SUI, min increment ${process.env.MIN_INCREMENT_SUI ?? "0.1"} SUI.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
