# Demo and Submission Guide

## Demo objective

The demo should prove one simple thesis:

> A real industrial machine can be auctioned with verifiable human participation and programmable onchain settlement.

Do not spend demo time explaining architecture before the audience sees the product work.

## 3-minute demo script

### 0:00–0:20 — Problem

Show the machine passport.

Suggested narration:

> Cross-border used machinery trades are high-value, but buyers still rely on fragmented records, opaque bidder access, and manual settlement. MachineProof connects the machine passport, verified bidder access, auction, and settlement in one flow.

### 0:20–0:45 — MachineProof RWA

Show:

- manufacturer/model
- stable MachineProof ID
- provenance/inspection status
- auction price and countdown

Explain that the onchain object represents the machine and trade state, not automatic legal title.

### 0:45–1:15 — World ID gate

Click **Join Auction**.

Show World IDKit.

First show one negative path quickly if practical:

- cancel/reject → auction remains locked

Then complete verification.

Narration:

> Every auction entrant must pass a unique-human check. The proof is bound to this auction and this wallet, so it cannot simply be reused for another bidder context.

### 1:15–1:50 — Sui bidding

Place a live testnet bid.

Show:

- wallet confirmation
- confirmed transaction digest
- highest bidder update

Then switch to a second verified wallet and outbid.

Show refund/recoverable state for the first bidder.

### 1:50–2:25 — Winner + purchase right

Finalize the auction.

Show:

- winning wallet
- winning amount
- `PurchaseRight`
- link back to the MachineProof machine ID

Narration:

> The winner receives an onchain purchase entitlement linked to the exact machine. This does not pretend to replace the legal sales contract; it makes the auction and settlement state independently inspectable.

### 2:25–2:50 — Programmable settlement

Trigger one milestone.

Show:

- locked amount
- milestone
- released amount
- transaction/event

### 2:50–3:00 — Close

> MachineProof turns a used industrial machine into a programmable trade object: the asset history is visible, auction access is human-gated, bids are onchain, and settlement is programmable.

## Prize-specific evidence

### World

README/submission should explicitly show:

- where IDKit is used;
- why it is a meaningful trust moment;
- action/signal design;
- server-side verification;
- one or more failure paths;
- what World ID proves and does not prove.

### Sui

Show real testnet evidence:

- package ID;
- auction object ID;
- bid transaction digests;
- finalization transaction;
- purchase entitlement object;
- settlement transaction.

### Curvegrid / RWA

Show that RWA functionality is not “NFT decoration”:

- machine identity;
- provenance/inspection references;
- permissions/auction state;
- purchase entitlement;
- settlement linkage.

If MultiBaas is actually integrated, document exactly which reads, tx composition, or event queries use it.

## README final structure

Before submission, README should contain:

1. one-sentence pitch
2. demo video / live app
3. what was built at ETHGlobal Tokyo 2026
4. architecture diagram
5. World integration
6. Sui integration
7. RWA model
8. live testnet deployments
9. local setup
10. tests
11. prize tracks
12. pre-existing MachineProof disclosure
13. limitations / legal-title disclaimer
14. license

## Pre-existing work disclosure

Keep a transparent section such as:

```text
Before ETHGlobal Tokyo 2026:
- MachineProof product concept
- machine passport / equipment information concepts
- provenance and trade workflow concepts

Built during ETHGlobal Tokyo 2026:
- verified-human auction entry with World ID
- Sui Move auction and bidder gating
- bid escrow / refund flow
- PurchaseRight
- programmable settlement
- hackathon demo UI and integrations
```

Only claim items that match actual history.

## Submission screenshots

Capture at least:

- machine passport + auction page
- World verification gate
- active bidding state
- winner / purchase entitlement
- settlement milestone
- explorer transaction/object pages

## Reliability checklist

Before recording:

- fresh browser profile tested;
- wallet has enough testnet gas and bid funds;
- two bidder wallets ready;
- World sandbox/production-like verification tested;
- auction start/end timing predictable;
- fallback seeded auction available;
- explorer links open;
- frontend deployment healthy;
- all secrets removed from public repo;
- README commands work from clean clone.

## Fallback behavior

If a sponsor sandbox is unstable during the live demo, the submission may show a previously recorded successful testnet transaction only as evidence, but the application itself should still contain the real integration code. Do not replace the actual integration with a fake success response.

## One-line prize descriptions

World:

> World ID gates scarce auction access at the moment a bidder joins, reducing bot/Sybil registration while binding verification to the bidder wallet and auction.

Sui:

> Sui Move controls the auction, locked bids, refunds, winner entitlement, and programmable settlement milestones.

RWA:

> The MachineProof machine passport links physical-asset identity and provenance to auction permissions, purchase entitlement, and settlement state.