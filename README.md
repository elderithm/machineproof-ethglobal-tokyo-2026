# MachineProof — ETHGlobal Tokyo 2026

**A verified-human auction and programmable settlement flow for used industrial machinery.**

> World ID gates auction entry, Sui Move executes on-chain bids and programmable
> settlement, and the MachineProof passport anchors the real-world machine being traded.

## Demo video / live app

- Live app: _deploy the app and add the URL here_
- Demo video: _add link_

## What was built at ETHGlobal Tokyo 2026

A full P0 vertical slice — machine passport → World-gated bidder → on-chain bid →
outbid refund → finalize → `PurchaseRight` → milestone settlement — plus the P1
programmable-settlement layer:

- **Sui Move contracts** (`sui/sources/`): RWA machine passport, an auction with a
  per-auction verified-bidder registry, escrowed bids with immediate outbid
  refunds, permissionless finalization, a winner `PurchaseRight`, and a
  milestone-based `Settlement` escrow. Covered by **10 Move unit tests**.
- **World ID gate**: `IDKitWidget` in the browser, a server route that
  reconstructs the `auctionId + wallet` signal, verifies the proof with
  `verifyCloudProof`, guards nullifier replay, then registers the wallet on-chain.
- **Next.js app**: wallet connect (dapp-kit), live passport + auction UI, bid /
  outbid / close, settlement panel with milestone releases, and an on-chain event
  timeline. All financial state is read from Sui — no optimistic fake success.

## Architecture

```text
Browser (Next.js App Router)
  ├─ Machine passport + auction UI
  ├─ Sui wallet (@mysten/dapp-kit)          ── signs place_bid / close_auction
  └─ World IDKit widget                       ── proof bound to auctionId+wallet
          │ proof payload
          ▼
Next.js server route  /api/world/verify
  ├─ reconstruct expected signal (server-side)
  ├─ verifyCloudProof (World v2 cloud verify)
  ├─ reject invalid / replayed (nullifier) proofs — fail closed
  └─ admin signer submits auction::register_verified_bidder
          │
          ▼
Sui testnet (Move: machineproof::*)
  machine_asset · admin · auction · settlement
  → BidderRegistry check → escrowed bids → refunds → PurchaseRight → Settlement
          │  objects + events
          ▼
UI reads live state (getObject / queryEvents) and links to the explorer
```

See `docs/` for the full spec, and `CLAUDE.md` for scope/priority.

## World ID integration

- **Where**: `components/WorldGate.tsx` (widget) and `app/api/world/verify/route.ts`
  (verification + on-chain registration).
- **Why it's load-bearing**: a wallet cannot be registered — and therefore cannot
  bid — without a valid World proof. `auction::place_bid` aborts (`ENotVerified`)
  for any wallet not in the auction's verified registry.
- **Action / signal**: action `machineproof-auction-entry`; signal
  `machineproof-auction:{auctionId}:{normalizedWallet}` (`lib/world/signal.ts`),
  reconstructed server-side so a proof cannot be detached to another wallet/auction.
- **Failure paths** (all fail closed): cancelled dialog → auction stays locked;
  invalid proof → rejected; wrong-wallet / wrong-auction signal → verification
  fails; replayed nullifier → 409.
- **What it proves / doesn't**: reduces bot/Sybil auction-entry; it does **not**
  prove corporate authority or creditworthiness.

## Sui integration

- Package: `sui/` (Move 2024). Modules: `machine_asset`, `admin`, `auction`,
  `settlement`. Client: `@mysten/sui` 2.x + `@mysten/dapp-kit`.
- On-chain truth: auction status, high bid/bidder, escrow, refunds, winner,
  `PurchaseRight`, and settlement releases are all Sui state/events.
- Evidence surfaced in-app: package / auction / machine / settlement object links,
  bid/close/release transaction digests (SuiScan).

## RWA model

```text
Physical machine → MachineProof passport (machine_asset)
  → Auction → PurchaseRight → Settlement   (all linked by machine/auction ids)
```

The on-chain object represents the machine, its provenance/inspection references,
auction state, and the winning entitlement. It does **not** by itself transfer
legal title — that remains subject to the underlying sales contract and law.

## Live testnet deployments

_Filled in after deploy:_

| Item | Id |
| --- | --- |
| Package | `NEXT_PUBLIC_SUI_PACKAGE_ID` |
| Machine | `NEXT_PUBLIC_MACHINE_ASSET_ID` |
| Auction | `NEXT_PUBLIC_AUCTION_ID` |

## Local setup

Prereqns: Node 20+, the [Sui CLI](https://docs.sui.io/references/cli), a Sui wallet
(e.g. Slush/Sui Wallet) on testnet, and a World app + action from
[developer.worldcoin.org](https://developer.worldcoin.org).

```bash
npm install
cp env.example .env.local          # then fill in values as you go

# 1) Contracts: build + test
npm run sui:test

# 2) Deploy to testnet (auto-generates & faucet-funds a deployer key if needed)
npm run sui:deploy                  # prints PACKAGE_ID + ADMIN_CAP_ID (+ key)
#    paste the printed values into .env.local

# 3) Seed the demo machine + auction
npm run sui:seed                    # prints MACHINE_ASSET_ID + AUCTION_ID
#    paste into .env.local, add your NEXT_PUBLIC_WORLD_APP_ID

# 4) Run
npm run dev                         # http://localhost:3000
```

The World action's **signal** setting must be enabled so the proof binds to the
auction+wallet signal.

## Tests

```bash
npm run sui:test     # 10 Move unit tests (auction + settlement invariants)
npm run typecheck    # strict TS
npm run build        # production build
```

Move tests cover: unverified-bidder rejection, minimum/increment enforcement,
outbid refunds, no early close, no double finalize, reserve-not-met cancel+refund,
`PurchaseRight` issuance, milestone release, duplicate-milestone rejection, and
over-release protection.

## Prize tracks

- **World — Best Use of IDKit**: human verification is a hard gate before auction
  entry, bound to the bidder wallet + auction, with real failure paths.
- **Sui — DeFi & Payments**: bids, refunds, winner funds, `PurchaseRight`, and
  milestone settlement are programmable in Move.
- **Curvegrid — Best RWA Tokenization**: the machine passport links physical-asset
  identity/provenance to auction permissions, entitlement, and settlement state.

## Pre-existing MachineProof disclosure

Before ETHGlobal Tokyo 2026, MachineProof existed as an early product/concept for
machine identity/passports, equipment information, provenance records, and trade
documentation (maintained separately). This repository's auction, World ID, Sui,
and settlement implementation was **built during** ETHGlobal Tokyo 2026.

## Limitations / legal-title disclaimer

- World ID reduces bot/Sybil registration; it does not establish corporate
  authority, creditworthiness, or sanctions status.
- `PurchaseRight` is a demo purchase entitlement, not automatic legal title.
- Settlement milestones are seller/admin-triggered for the demo; a production
  system would gate them on oracles/logistics attestations.
- The nullifier replay store is an in-process demo store (see
  `lib/world/nullifier-store.ts`); production would use a shared/persistent store.

## License

Apache License 2.0
