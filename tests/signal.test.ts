import { test } from "node:test";
import assert from "node:assert/strict";
import { auctionSignal, normalizeSuiAddress } from "../lib/world/signal";

test("normalizeSuiAddress lowercases and 0x-prefixes", () => {
  assert.equal(normalizeSuiAddress("0xABCdef"), "0xabcdef");
  assert.equal(normalizeSuiAddress("ABCdef"), "0xabcdef");
  assert.equal(normalizeSuiAddress("  0xAbC  "), "0xabc");
});

test("auctionSignal has the documented format", () => {
  assert.equal(
    auctionSignal("0xAUCTION", "0xWALLET"),
    "machineproof-auction:0xAUCTION:0xwallet",
  );
});

test("signal differs across wallet and across auction", () => {
  const a = auctionSignal("0xauc1", "0xwallet1");
  assert.notEqual(a, auctionSignal("0xauc1", "0xwallet2")); // different wallet
  assert.notEqual(a, auctionSignal("0xauc2", "0xwallet1")); // different auction
});

test("signal is case-insensitive in the wallet", () => {
  assert.equal(
    auctionSignal("0xauc", "0xWALLET"),
    auctionSignal("0xauc", "0xwallet"),
  );
});
