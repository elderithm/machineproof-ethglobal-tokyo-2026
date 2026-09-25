# CLAUDE.md

## Mission

Build the ETHGlobal Tokyo 2026 version of **MachineProof** as a working, public, testnet demo of a **verified-human auction and programmable settlement flow for used industrial machinery**.

The product story is:

> A real industrial machine is represented by a MachineProof passport. A bidder must prove they are a unique human before entering the auction. Verified bidders can place onchain bids. The winning bid creates a purchase entitlement and moves into programmable settlement.

The primary prize targets are:

1. **World — Best Use of IDKit**: human verification is a load-bearing gate before auction entry.
2. **Sui — DeFi & Payments**: bids, refunds, winner funds, escrow, and settlement are programmable on Sui.
3. **Curvegrid — Best RWA Tokenization Project**: the machine is modeled as a programmable RWA with provenance, auction state, permissions, and settlement.

Stretch only after the core works:

4. **World ID for Agents**: an optional human-authorized bidding agent.
5. **Monid**: optional agent tooling for market/due-diligence assistance. Monid is not required for the core World ID flow.

## Read first

Before changing code, read all files under `docs/` in this order:

1. `docs/PRODUCT_SPEC.md`
2. `docs/ARCHITECTURE.md`
3. `docs/WORLD_ID.md`
4. `docs/SUI_PAYMENTS.md`
5. `docs/CURVEGRID_RWA.md`
6. `docs/IMPLEMENTATION_PLAN.md`
7. `docs/DEMO_AND_SUBMISSION.md`
8. `docs/STRETCH_GOALS.md`

Also read the official resources linked in those documents when an API, SDK, contract interface, or package name is uncertain. **Do not invent SDK APIs.** Prefer current official examples.

## Core implementation constraints

- Use **TypeScript + Next.js App Router** for the web app and server routes unless the repository already contains a better compatible structure.
- Use **Sui testnet** as the primary chain for the hackathon implementation.
- Write the onchain logic in **Move**.
- World ID proof verification must happen on a **secure server route** or another secure backend path. Never expose World signing secrets to the browser.
- World verification must be bound to both the **auction** and the **bidder wallet**.
- A bidder that has not passed World verification must not be able to enter or bid.
- Duplicate/replayed World verification must fail closed.
- Keep the demo honest: a `PurchaseRight` or equivalent represents the winning contractual entitlement in the demo; do **not** claim that an NFT/object automatically transfers legal title to a physical machine.
- No production private keys, secrets, personal data, or customer data in Git.
- All testnet addresses, package IDs, action IDs, and public configuration belong in `.env.example` or deployment docs.
- Add meaningful tests for Move state transitions and server verification logic.

## Scope priority

Implement in this order. Do not jump to stretch features before P0/P1 work end-to-end.

### P0 — Working vertical slice

- Machine listing/passport page
- Sui wallet connection
- World IDKit verification before auction entry
- Server-side proof verification
- Onchain verified-bidder registration
- One live auction
- Place bid
- Outbid/refund behavior
- Close auction
- Winner receives `PurchaseRight`

### P1 — Programmable settlement

- Winning funds remain in escrow
- Settlement milestones and release logic
- Clear payment/escrow UI
- Onchain events / receipts visible in UI

### P2 — RWA quality and submission polish

- Provenance/inspection fields on MachineProof asset
- Timeline/activity view
- README setup and testing instructions
- Failure-path demo
- Prize-specific feedback/debrief text

### P3 — Stretch

- World ID for Agents bidding assistant
- Monid-powered due-diligence/comparable lookup
- Optional Curvegrid MultiBaas integration only if it adds clear value and the core remains stable

## Git discipline

ETHGlobal judging values real hackathon work and a credible commit history.

- Commit coherent increments as they are completed.
- Prefer commits such as `feat: add World-gated bidder registration`, `feat: implement Sui auction escrow`, `test: cover outbid refunds`.
- Do not squash the entire implementation into a single final commit.
- Keep the repository public and runnable.

## Definition of done

The demo is done when a judge can watch this exact flow without explanation gaps:

1. Open a real MachineProof machine listing.
2. Click **Join auction**.
3. An unverified path is denied/cancelled and the auction remains inaccessible.
4. Complete World ID verification.
5. The verified wallet is registered for that auction.
6. Place a real Sui testnet bid.
7. A second verified wallet outbids the first and the first bidder can recover/refund funds according to the contract design.
8. Close the auction.
9. The winner receives a purchase entitlement and the winning funds enter settlement/escrow.
10. Trigger at least one settlement milestone and show the resulting onchain state/event.

Do not optimize for breadth until this path works reliably.