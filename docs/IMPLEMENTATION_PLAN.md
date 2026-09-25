# Implementation Plan

## Phase 0 — Repository/bootstrap

- initialize Next.js App Router app
- add TypeScript strict mode
- add Sui packages using the current official starter/package names
- add World IDKit using the current official package names
- add lint/test/build scripts
- create `.env.example`
- create deterministic sample machine data

Exit condition: app boots locally and CI/build passes.

## Phase 1 — Sui Move core

Implement and test:

- `MachineAsset`
- `BidderRegistry`
- `Auction`
- bid/refund logic
- finalization
- `PurchaseRight`
- `Settlement`

Do not connect the frontend until Move tests cover the main financial invariants.

Suggested commit sequence:

```text
feat: add MachineAsset Move module
feat: add verified bidder registry
feat: add auction state and bidding
feat: add outbid refund flow
feat: add auction finalization and purchase right
feat: add settlement milestones
 test: cover auction and settlement invariants
```

## Phase 2 — Sui frontend

- wallet connect
- machine passport page
- auction status
- bid form
- transaction confirmation
- explorer links
- refund/withdraw UI if using pull refunds
- winner/purchase-right state

Exit condition: two Sui wallets can exercise a complete auction without World gating.

## Phase 3 — World ID gating

- configure World app/action
- add IDKit to Join Auction
- implement server verify route
- bind proof to auction + Sui wallet
- register verified bidder onchain
- disable/deny bid for unverified wallet
- add replay/mismatch tests

Exit condition: an unverified wallet cannot bid; verified wallet can.

## Phase 4 — Settlement

- move winning funds into settlement state
- expose milestone actions
- release funds safely
- render settlement timeline and amounts

Exit condition: one live testnet winner can advance at least one settlement milestone and UI reflects confirmed chain state.

## Phase 5 — RWA polish

- provenance / inspection hashes and metadata
- machine → auction → purchase right → settlement links
- activity timeline
- clear legal-title disclaimer
- testnet deployment documentation

## Phase 6 — Optional Curvegrid/MultiBaas

Only start if P0–P1 submission is already stable.

Option A: add a minimal Sepolia `MachineRWARegistry` and MultiBaas event-indexed provenance dashboard.

Option B: skip technical integration and keep Curvegrid sample as design/reference material if the prize does not require Curvegrid technology specifically.

Before choosing, re-read the final ETHGlobal prize criteria and ask a sponsor mentor if available.

## Phase 7 — Optional agent features

Only after the core demo video could already be recorded.

- World ID for Agents delegation
- Monid due-diligence assistant
- capped bid policy

## Testing matrix

### Move

- create machine
- create auction
- register bidder
- reject unverified bidder
- accept valid bid
- reject too-low bid
- outbid and refund/recover prior funds
- finalize once
- reject second finalization
- reserve not met
- issue purchase right
- settlement release
- reject duplicate milestone
- reject over-release

### World backend

- valid proof
- cancelled/rejected flow
- invalid payload
- wrong wallet signal
- wrong auction signal
- replay
- World API unavailable → fail closed

### Frontend

- wallet disconnected
- wrong network
- insufficient balance
- auction not started
- auction ended
- World not verified
- bid pending
- bid confirmed
- bid failed

## Local dev scripts

Use simple root scripts where possible:

```text
npm run dev
npm run build
npm run lint
npm test
npm run sui:test
npm run sui:deploy:testnet
```

Claude Code should implement the exact commands based on the chosen tooling.

## Environment template

Create `.env.example` containing only placeholders/public defaults, e.g.:

```dotenv
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_RPC_URL=
NEXT_PUBLIC_SUI_PACKAGE_ID=
NEXT_PUBLIC_MACHINE_ASSET_ID=
NEXT_PUBLIC_AUCTION_ID=

NEXT_PUBLIC_WORLD_APP_ID=
NEXT_PUBLIC_WORLD_ACTION=machineproof-auction-entry
WORLD_API_SECRET=

# Optional Curvegrid
NEXT_PUBLIC_MULTIBAAS_URL=
NEXT_PUBLIC_MULTIBAAS_DAPP_KEY=
MULTIBAAS_ADMIN_API_KEY=
EVM_DEPLOYER_PRIVATE_KEY=
```

Never put admin keys or private keys in browser-exposed variables.

## Time-box rule

If blocked for more than ~45 minutes by an optional sponsor integration, cut it and protect the core demo.

The winning submission is a reliable vertical slice, not the largest dependency graph.