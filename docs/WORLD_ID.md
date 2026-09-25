# World ID Integration

## Goal

Use World ID as a **meaningful trust gate** before a user can enter a MachineProof auction.

Do not bolt World ID onto login or show a verification badge that has no consequence. If World verification is removed, auction participation should stop working for new bidders.

## Product rule

A wallet may bid in auction `A` only after a World proof has been verified for:

```text
action = machineproof-auction-entry
signal = auctionId + walletAddress
```

Use the exact action/signal configuration and hashing expected by the current World IDKit docs. Do not invent SDK methods from memory.

Official references:

- https://docs.world.org/
- https://docs.world.org/world-id/idkit
- https://sandbox.auth.world.org/docs

## Recommended flow

```text
Bidder browser
   │
   │ Connect Sui wallet
   ▼
Join Auction
   │
   │ Launch World IDKit
   ▼
World verification UI
   │
   │ proof payload
   ▼
POST /api/world/verify
   │
   ├ reconstruct expected auction + wallet signal
   ├ verify proof using official World verification endpoint/SDK
   ├ validate action/signal/nullifier semantics
   ├ reject invalid/replayed/mismatched proof
   └ mark this wallet eligible for this auction
   │
   ▼
Onchain bidder registration / authorization
   │
   ▼
Bid enabled
```

## Why bind wallet + auction

A generic proof such as `I am human` is not enough. The verified result must not be detachable and reused by a different wallet or for a different auction.

Conceptual signal input:

```text
machineproof-auction:{auctionId}:{walletAddress}
```

Normalize the Sui address consistently before signal construction.

## Backend requirements

The verify route must:

1. accept only the minimum required proof fields plus `auctionId` and connected wallet address;
2. reconstruct expected action/signal server-side rather than trusting client-provided hashes blindly;
3. verify through World’s current official verification flow;
4. fail closed on API/network errors;
5. validate the returned verification result;
6. prevent replay/duplicate authorization as required by World’s nullifier semantics;
7. return an authorization result that can be tied to the Sui wallet;
8. avoid logging sensitive proof material unnecessarily.

Do not put World API secrets in `NEXT_PUBLIC_*` variables.

## Onchain bridging pattern

World verification itself is not natively executed by a Sui Move contract in this architecture. The secure backend attests that the World verification succeeded, then the Sui side records/consumes that eligibility.

Preferred P0 implementation:

```text
World proof verified server-side
        ↓
Server/admin transaction registers
(wallet, auctionId) as verified bidder
        ↓
Move auction checks registry before accepting bid
```

This is acceptable for the hackathon if the trust boundary is documented honestly.

If a robust Sui-native signature verification path can be implemented safely, the backend may issue a short-lived signed authorization consumed onchain instead. Do not choose this merely because it sounds more decentralized; choose it only if it is reliable in the available time.

## Failure paths to implement and demo

World judges explicitly care about real integration quality. Build more than the happy path.

At minimum show:

- user cancels verification → auction remains locked;
- invalid verification payload → rejected;
- proof/signal generated for wallet A but submitted for wallet B → rejected;
- proof for auction A used for auction B → rejected;
- already-used/replayed authorization → rejected;
- successful verification → bid button becomes usable only after eligibility is recorded.

## UI copy

Before verification:

> Prove you are a unique human to enter this auction. This helps prevent bots and duplicate identities from flooding bidder registration.

After verification:

> Human verification complete for this auction.

Avoid:

- “World ID guarantees a fair auction.”
- “This bidder is trustworthy.”
- “This proves the bidder represents a legitimate company.”

World verification does not establish those claims.

## Sandbox-first development

Use World’s sandbox/dev tooling before attempting any production-style flow.

Development sequence:

1. create/configure the World app/action;
2. verify IDKit renders locally;
3. wire cancellation/error callbacks;
4. send proof payload to server route;
5. make server verification pass in sandbox;
6. bind wallet+auction signal;
7. only then connect successful verification to Sui eligibility.

## Environment variables

Names below are placeholders; Claude Code must replace them with names appropriate to the current World SDK/docs.

```dotenv
NEXT_PUBLIC_WORLD_APP_ID=
NEXT_PUBLIC_WORLD_ACTION=machineproof-auction-entry
WORLD_API_SECRET=
```

Never commit real credentials.

## Stretch — World ID for Agents

Only after the human-bidder flow works:

- human verifies once;
- human delegates a narrow bidding policy to an agent;
- agent may bid only within an explicit ceiling / auction / expiry;
- human-backed authorization remains inspectable.

This must not replace the primary human-auction flow.