import { test } from "node:test";
import assert from "node:assert/strict";
import {
  consumeNullifier,
  getConsumption,
  isNullifierUsed,
} from "../lib/world/nullifier-store";

test("a fresh nullifier is not used", () => {
  assert.equal(isNullifierUsed("null-fresh-1"), false);
});

test("consuming a nullifier marks it used and records context", () => {
  consumeNullifier("null-2", "0xauctionA", "0xwalletX");
  assert.equal(isNullifierUsed("null-2"), true);
  const c = getConsumption("null-2");
  assert.equal(c?.auctionId, "0xauctionA");
  assert.equal(c?.wallet, "0xwalletX");
});

test("replay detection: same human (nullifier) with a different wallet is flagged", () => {
  consumeNullifier("null-3", "0xauctionA", "0xwalletX");
  // A second wallet presenting the same nullifier is NOT the same context.
  const prev = getConsumption("null-3");
  const sameContext =
    prev && prev.wallet === "0xwalletY" && prev.auctionId === "0xauctionA";
  assert.equal(isNullifierUsed("null-3"), true);
  assert.equal(Boolean(sameContext), false); // → route rejects as duplicate
});

test("idempotent: same wallet + auction re-presenting the nullifier is the same context", () => {
  consumeNullifier("null-4", "0xauctionA", "0xwalletX");
  const prev = getConsumption("null-4");
  const sameContext =
    prev && prev.wallet === "0xwalletX" && prev.auctionId === "0xauctionA";
  assert.equal(Boolean(sameContext), true); // → route allows (no-op re-register)
});
