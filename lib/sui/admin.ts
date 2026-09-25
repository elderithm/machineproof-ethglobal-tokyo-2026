// SERVER-ONLY. Holds the admin signer that owns the AdminCap. Never import this
// from a client component — it reads SUI_ADMIN_SECRET_KEY.
//
// The backend uses this to consume off-chain attestations on-chain:
//   * after a World proof is verified for (auctionId, wallet), it calls
//     auction::register_verified_bidder to mark that wallet eligible;
//   * for the settlement demo, it advances milestones via settlement::release_milestone.

import "server-only";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { fromBase64 } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import {
  ADMIN_CAP_ID,
  AUCTION_ID,
  PACKAGE_ID,
  SUI_NETWORK,
  SUI_RPC_URL,
  target,
} from "@/lib/config";

function adminClient(): SuiJsonRpcClient {
  const url = SUI_RPC_URL || getJsonRpcFullnodeUrl(SUI_NETWORK);
  return new SuiJsonRpcClient({ url, network: SUI_NETWORK });
}

function loadAdminKeypair(): Ed25519Keypair {
  const sk = process.env.SUI_ADMIN_SECRET_KEY;
  if (!sk) {
    throw new Error(
      "SUI_ADMIN_SECRET_KEY is not set. The server cannot register verified bidders.",
    );
  }
  if (sk.startsWith("suiprivkey")) {
    const { secretKey } = decodeSuiPrivateKey(sk.trim());
    return Ed25519Keypair.fromSecretKey(secretKey);
  }
  // Fallback: raw 32-byte base64 secret key.
  return Ed25519Keypair.fromSecretKey(fromBase64(sk.trim()));
}

export function adminConfigured(): boolean {
  return Boolean(
    process.env.SUI_ADMIN_SECRET_KEY && ADMIN_CAP_ID && AUCTION_ID && PACKAGE_ID,
  );
}

export type AdminTxResult = { digest: string };

/** Mark a wallet as World-verified for the configured auction. */
export async function registerVerifiedBidder(
  wallet: string,
): Promise<AdminTxResult> {
  if (!adminConfigured()) {
    throw new Error("Admin signer not configured (package/auction/cap/key).");
  }
  const client = adminClient();
  const keypair = loadAdminKeypair();

  const tx = new Transaction();
  tx.moveCall({
    target: target("auction", "register_verified_bidder"),
    arguments: [
      tx.object(ADMIN_CAP_ID),
      tx.object(AUCTION_ID),
      tx.pure.address(wallet),
    ],
  });

  const res = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true },
  });
  await client.waitForTransaction({ digest: res.digest });
  return { digest: res.digest };
}

/** Advance one settlement milestone (seller/admin action). */
export async function releaseMilestone(
  settlementId: string,
  milestoneIndex: number,
): Promise<AdminTxResult> {
  if (!adminConfigured()) {
    throw new Error("Admin signer not configured (package/auction/cap/key).");
  }
  const client = adminClient();
  const keypair = loadAdminKeypair();

  const tx = new Transaction();
  tx.moveCall({
    target: target("settlement", "release_milestone"),
    arguments: [
      tx.object(ADMIN_CAP_ID),
      tx.object(settlementId),
      tx.pure.u64(BigInt(milestoneIndex)),
    ],
  });

  const res = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showEffects: true },
  });
  await client.waitForTransaction({ digest: res.digest });
  return { digest: res.digest };
}
