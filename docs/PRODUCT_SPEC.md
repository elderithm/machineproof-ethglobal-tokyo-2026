# Product Spec — MachineProof Verified Auction

## 1. Product thesis

MachineProof already models used industrial machinery as a structured digital passport. For ETHGlobal Tokyo 2026, extend it with a **verified-human auction and programmable settlement layer**.

The core problem is not merely “put an auction onchain.” Cross-border used-machinery transactions suffer from multiple trust failures at once:

- buyers cannot easily evaluate provenance and inspection claims;
- online bidding can be distorted by bots or Sybil identities;
- bidder deposits and refunds are operationally awkward;
- the winning bid does not automatically create a transparent settlement workflow;
- the relationship between the physical machine and the financial transaction is fragmented.

The hackathon extension should connect these into one end-to-end flow.

## 2. One-sentence pitch

> MachineProof is a verified-human auction and settlement layer for industrial machinery: World ID gates real bidders, Sui executes programmable bids and escrow, and the machine passport anchors the real-world asset being traded.

## 3. Target user

### Seller
A machinery dealer, factory, liquidator, or exporter selling a used industrial machine.

### Bidder / buyer
A human representative of an overseas machinery buyer who wants to participate in a scarce auction without bot/Sybil spam.

### Inspector
A party that contributes inspection/provenance evidence to the machine passport. For the hackathon this may be pre-seeded rather than a full role workflow.

## 4. Demo asset

Use one believable sample machine as the primary demo asset, for example:

- Manufacturer: MAZAK
- Model: QUICK TURN 200
- Machine ID: `MP-JP-0001`
- Origin: Japan
- Year: sample data
- Inspection status: Verified / sample
- Reserve price: testnet-denominated amount

Do not use copyrighted third-party photos unless licensing is clear. A generated or neutral placeholder machine image is fine.

## 5. Core user journey

1. User opens the MachineProof machine passport.
2. User sees provenance/inspection summary and auction status.
3. User clicks **Join auction**.
4. World ID verification is required before entry.
5. The proof is verified server-side and bound to `auctionId + walletAddress`.
6. The verified wallet becomes eligible for this auction.
7. User places a Sui testnet bid with real onchain funds.
8. Another verified bidder can outbid them.
9. Losing funds are safely recoverable/refunded according to contract design.
10. Seller/admin closes the auction after end time.
11. Winner receives an onchain `PurchaseRight` object/record.
12. Winning funds enter programmable settlement/escrow.
13. Settlement milestones can release funds in configured portions.

## 6. World ID trust statement

Use World ID precisely:

- It demonstrates that the bidder passed the configured World verification flow.
- It is used to reduce bot/Sybil participation at the auction-entry boundary.
- It does **not** prove corporate authority, creditworthiness, sanctions status, or that one company only has one employee bidding.
- Do not say “World ID makes the auction perfectly fair.”

Preferred product copy:

> Verified-human access helps prevent bots and duplicate identities from flooding bidder registration.

## 7. RWA statement

The onchain machine representation is a digital representation of an industrial machine and its auction/settlement state.

For the hackathon:

- `MachineAsset` / passport data identifies the physical asset.
- `PurchaseRight` represents the winner's contractual purchase entitlement in the demo.
- It does **not** by itself claim to transfer statutory/legal title to the physical machine.

This distinction must appear in README/submission material.

## 8. Functional requirements

### Machine passport

- machine ID
- manufacturer/model
- provenance hash or URI
- inspection hash/status
- seller
- auction link/state

### Auction

- seller/admin creates auction
- start and end timestamps
- reserve/minimum bid
- verified-human gating
- highest bidder and highest bid
- close/finalize
- failure-safe handling when reserve is not met

### Bidder verification

- World IDKit flow
- proof verified server-side
- signal binds proof to wallet and auction
- replay/duplicate protection
- onchain eligibility registration or signed authorization consumed by auction entry

### Funds

- bidder funds are controlled by Sui Move logic
- losing bidder refund path
- winning amount moves to settlement state
- no fake “payment succeeded” UI without a confirmed testnet transaction

### Settlement

Hackathon-friendly milestone model:

- `AUCTION_WON`
- `INSPECTION_CONFIRMED`
- `SHIPPED`
- `ACCEPTED`

Example percentages are configurable. Keep the first implementation simple; two or three milestones are enough if robust.

## 9. Non-goals

Do not build these before the vertical slice works:

- fiat on/off ramp
- production KYC/KYB
- real legal title transfer
- shipping-carrier integrations
- production stablecoin issuance
- complex DAO governance
- full autonomous bidding agent
- multi-chain bridging
- generative valuation model

## 10. Success criteria

A successful hackathon build has:

- a live public frontend;
- a reproducible public repository;
- live Sui testnet transactions;
- World IDKit verification in the critical entry path;
- at least one negative/failure verification path;
- a real auction state transition from listing → verified bidder → bid → winner → settlement;
- clear RWA provenance/passport context;
- tests for important financial and authorization invariants.
