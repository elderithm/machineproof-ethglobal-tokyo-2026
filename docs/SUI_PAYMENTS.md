# Sui Payments and Auction Escrow

## Goal

Use Sui as the primary settlement chain for the hackathon demo.

The Sui integration is not decorative. It must control:

- auction state;
- bidder eligibility checks;
- bid funds;
- outbid refunds/recovery;
- winner finalization;
- purchase entitlement;
- programmable settlement milestones.

Official starting point:

- https://docs.sui.io/getting-started
- current Sui Move documentation under https://docs.sui.io/
- current Sui TypeScript SDK / dApp kit documentation under https://docs.sui.io/

Claude Code must check the current package names and APIs before implementation.

## Suggested package layout

```text
sui/
  Move.toml
  sources/
    machine_asset.move
    auction.move
    settlement.move
  tests/
    auction_tests.move
    settlement_tests.move

app/
  lib/sui/
    client.ts
    wallet.ts
    auction.ts
    settlement.ts
```

If the chosen Next.js template or current Sui starter uses a different canonical layout, follow the official starter while preserving responsibilities.

## Core objects

### MachineAsset

Represents the onchain identity and RWA context of the physical machine.

Required fields:

- stable machine ID
- manufacturer/model
- seller
- provenance URI/hash
- inspection hash/status
- optional metadata URI

Do not put sensitive serial numbers or customer data onchain. A hash or redacted identifier is preferred.

### Auction

The auction should be a shared object if that is the appropriate current Sui pattern for multiple independent bidders. Confirm with official docs.

Required behavior:

- seller creates auction for one `MachineAsset`;
- opening and closing time;
- reserve price;
- minimum increment;
- current high bid;
- current high bidder;
- eligibility check before bid;
- finalize exactly once.

### BidderRegistry

Maps or otherwise records eligibility scoped to an auction.

Semantics:

```text
is_verified(auction_id, wallet) == true
```

must be necessary before `place_bid` can succeed.

### PurchaseRight

Issued to the winner on successful finalization.

Suggested fields:

- auction ID
- machine asset ID
- winner
- winning amount
- issued timestamp
- settlement ID/status

Use object ownership/transfer semantics that match current Sui Move patterns.

### Settlement

Holds/controls the winning funds after auction finalization.

Keep the first implementation simple. Example milestones:

```text
10%   auction confirmed
40%   inspection / seller conditions confirmed
40%   shipment confirmed
10%   buyer acceptance
```

These percentages are a demo policy, not a production recommendation.

If percentage arithmetic complicates Move correctness, use fixed basis points or explicit amounts created at settlement initialization.

## Payment coin

Use a testnet-compatible coin that can be reliably obtained and demonstrated.

Do not claim a token is USDC unless it is actually the corresponding testnet asset or clearly label it as a demo coin.

If official Sui hackathon guidance provides a preferred stablecoin/payment asset, follow that.

## Bid algorithm

The exact Move implementation must be based on current Sui primitives. Preserve this logical behavior:

```text
place_bid(auction, bidder, payment)

require auction is OPEN
require now < end time
require bidder is verified for this auction
require amount >= reserve/minimum rules
require amount >= highest_bid + min_increment

if previous highest bid exists:
    make previous funds safely refundable / return them using chosen Sui pattern

set highest_bidder = bidder
set highest_bid = amount
lock new high bid
emit BidPlaced
```

## Refund design

Prioritize safety and demo reliability over cleverness.

Choose one of these patterns after checking current Sui examples:

1. return previous high bidder funds immediately if transaction/object model permits cleanly;
2. credit a withdrawable/refundable balance that the losing bidder claims later.

A pull-style refund is acceptable and may be simpler to reason about.

Tests must prove that funds cannot be lost on normal outbid flow.

## Auction finalization

```text
close_auction(...)

require auction ended
require not previously finalized

if no bid or reserve not met:
    mark cancelled
    make locked bid recoverable if necessary
else:
    create PurchaseRight for winner
    create Settlement funded with winning amount
    mark auction CLOSED
    emit AuctionWon
```

Do not allow seller/admin to arbitrarily replace the recorded winner.

## Settlement milestones

Recommended P1 model:

```text
Settlement
  amount_locked
  amount_released
  milestone bitmap/status
  seller
  buyer
```

Entry functions should:

- validate caller role;
- prevent duplicate milestone execution;
- prevent over-release;
- emit an event after each release.

For a hackathon, seller/admin-triggered milestones are acceptable if documented. A future oracle/logistics integration can be described as production work.

## Events

Emit enough data for a compelling activity timeline:

- `MachineRegistered`
- `AuctionCreated`
- `BidderVerified`
- `BidPlaced`
- `BidRefunded` or `RefundAvailable`
- `AuctionWon`
- `PurchaseRightIssued`
- `MilestoneReleased`
- `SettlementCompleted`

Use current Sui Move event syntax.

## Tests

Must cover at least:

- unverified bidder rejected;
- verified bidder accepted;
- bid below minimum rejected;
- valid outbid changes winner;
- prior bidder can recover funds;
- auction cannot close early unless explicitly allowed;
- auction cannot finalize twice;
- reserve-not-met path;
- winner receives purchase right;
- settlement cannot release the same milestone twice;
- settlement cannot release more than locked amount.

## Frontend transaction rules

- always wait for chain confirmation before showing final state;
- surface transaction digest and explorer link;
- refresh object/event state from Sui after each confirmed write;
- do not fake a successful bid locally;
- show actionable errors for insufficient balance, verification missing, auction ended, and bid too low.

## Environment/config

```dotenv
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=
NEXT_PUBLIC_SUI_PACKAGE_ID=
NEXT_PUBLIC_MACHINE_ASSET_ID=
NEXT_PUBLIC_AUCTION_ID=
```

Prefer wallet-based signing for user actions. Never commit a funded private key.

A deployer/admin key used only for testnet setup must live outside Git and should not be exposed to the browser.