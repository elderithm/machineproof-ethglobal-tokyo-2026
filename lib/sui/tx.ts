// Transaction builders for wallet-signed (bidder) actions. These are executed
// in the browser via dapp-kit's useSignAndExecuteTransaction.

import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, target } from "@/lib/config";

// The framework Clock is a well-known shared object at 0x6.
const CLOCK_ID = "0x6";

/**
 * Place a bid of `amountMist` MIST on `auctionId`. The payment coin is split off
 * the wallet's gas coin, so no separate funded coin object is required.
 */
export function buildPlaceBidTx(
  auctionId: string,
  amountMist: bigint,
): Transaction {
  if (!PACKAGE_ID || !auctionId) {
    throw new Error("Sui package/auction not configured (.env.local).");
  }
  const tx = new Transaction();
  const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(amountMist)]);
  tx.moveCall({
    target: target("auction", "place_bid"),
    arguments: [tx.object(auctionId), payment, tx.object(CLOCK_ID)],
  });
  return tx;
}

/**
 * Finalize `auctionId` after its end time. Permissionless: the winner is fixed
 * by the standing high bid, so any wallet may trigger this.
 */
export function buildCloseAuctionTx(auctionId: string): Transaction {
  if (!PACKAGE_ID || !auctionId) {
    throw new Error("Sui package/auction not configured (.env.local).");
  }
  const tx = new Transaction();
  tx.moveCall({
    target: target("auction", "close_auction"),
    arguments: [tx.object(auctionId), tx.object(CLOCK_ID)],
  });
  return tx;
}
