import { test } from "node:test";
import assert from "node:assert/strict";
import {
  environmentAllowed,
  expectedSignalHash,
  responsesBindWallet,
} from "../lib/world/verify-logic";

const AUCTION = "0xc054d931";
const WALLET = "0xabc123";

test("expectedSignalHash is deterministic and binds wallet + auction", () => {
  const h = expectedSignalHash(AUCTION, WALLET);
  assert.equal(h, expectedSignalHash(AUCTION, WALLET));
  assert.notEqual(h, expectedSignalHash(AUCTION, "0xdifferent")); // wallet binding
  assert.notEqual(h, expectedSignalHash("0xother", WALLET)); // auction binding
});

test("responsesBindWallet accepts a matching signal_hash (with or without 0x)", () => {
  const h = expectedSignalHash(AUCTION, WALLET);
  assert.equal(responsesBindWallet([{ signal_hash: h }], AUCTION, WALLET), true);
  assert.equal(
    responsesBindWallet([{ signal_hash: `0x${h}` }], AUCTION, WALLET),
    true,
  );
});

test("responsesBindWallet rejects a proof made for a different wallet", () => {
  const forOtherWallet = expectedSignalHash(AUCTION, "0xother");
  assert.equal(
    responsesBindWallet([{ signal_hash: forOtherWallet }], AUCTION, WALLET),
    false,
  );
});

test("responsesBindWallet rejects a proof made for a different auction", () => {
  const forOtherAuction = expectedSignalHash("0xother", WALLET);
  assert.equal(
    responsesBindWallet([{ signal_hash: forOtherAuction }], AUCTION, WALLET),
    false,
  );
});

test("responsesBindWallet rejects when no signal_hash is present", () => {
  assert.equal(responsesBindWallet([{}], AUCTION, WALLET), false);
  assert.equal(responsesBindWallet([], AUCTION, WALLET), false);
});

test("environmentAllowed matches expected, tolerates missing, rejects mismatch", () => {
  assert.equal(environmentAllowed("staging", "staging"), true);
  assert.equal(environmentAllowed(undefined, "staging"), true);
  assert.equal(environmentAllowed("production", "staging"), false);
});
