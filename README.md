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

## World ID integration (World ID 4.0)

Built on the current **relying-party (RP) model** with `@worldcoin/idkit` 4.x +
`@worldcoin/idkit-server`.

- **Where**: `components/WorldGate.tsx` (`IDKitRequestWidget`),
  `app/api/world/request/route.ts` (signs a short-lived `rp_context` with the RP
  key), and `app/api/world/verify/route.ts` (v4 verify + on-chain registration).
- **Why it's load-bearing**: a wallet cannot be registered — and therefore cannot
  bid — without a valid World proof. `auction::place_bid` aborts (`ENotVerified`)
  for any wallet not in the auction's verified registry.
- **RP request signing**: the browser first fetches an `rp_context` (`rp_id`,
  nonce, timestamps, RP signature) from the server, which signs it with the
  relying party's key via `signRequest`. The signing key never reaches the browser.
- **Action / signal**: action `machineproof-auction-entry`; the proof carries a
  `signal` of `machineproof-auction:{auctionId}:{normalizedWallet}`
  (`lib/world/signal.ts`). The server re-derives `hashSignal(signal)` and compares
  it to the proof's `signal_hash`, so a proof cannot be detached to another
  wallet/auction.
- **Verification**: server POSTs the IDKit result to
  `https://developer.world.org/api/v4/verify/{rp_id}` (`orbLegacy` preset,
  `allow_legacy_proofs`), fails closed on any non-success, checks environment,
  and tracks `nullifier` to reject replays.
- **Failure paths** (all fail closed): cancelled dialog → auction stays locked;
  invalid proof → rejected; wrong-wallet / wrong-auction signal → `signal_hash`
  mismatch → rejected; replayed nullifier → 409.
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

Network: **Sui testnet**. Package and machine are stable; the auction object is
re-created each `npm run sui:seed` run (auctions have an end time).

| Item | Id / link |
| --- | --- |
| Package | [`0x682b7ffd…69d20`](https://suiscan.xyz/testnet/object/0x682b7ffd56d971e53c3df5a261dcbd45afcad8e33d99024c72ac07bbc2169d20) |
| Publish tx | [`FzVrvreG…WLKYA`](https://suiscan.xyz/testnet/tx/FzVrvreGBDka2xHGpj7eDDegjSQGv1sJLhM2fXfWLKYA) |
| MachineAsset (MP-JP-0001) | [`0xe089b7fe…621f99`](https://suiscan.xyz/testnet/object/0xe089b7fe82ed21b525c8cc5da3ed4f3cd0eff8afad2499ce2715b48b22621f99) |
| AdminCap | [`0xff420aa0…7857e`](https://suiscan.xyz/testnet/object/0xff420aa0bfd06a0187de83f741e84083e31ccc3cada7569ac4ef3d6db187857e) |
| Auction (latest seed) | [`0xc054d931…d00571`](https://suiscan.xyz/testnet/object/0xc054d931a539f1c6dfdf859a2bf36cb0c2258ed741b73e86261f8962f6d00571) |

### On-chain end-to-end run (evidence)

A full auction lifecycle executed on Sui testnet by `npm run sui:e2e`
(World-independent: the admin key performs the World-gated registration step, and
bidders are funded from the deployer). Every step is a real transaction:

| Step | Transaction |
| --- | --- |
| Fund two bidders | [`2HbxHQD4…`](https://suiscan.xyz/testnet/tx/2HbxHQD4uJZRB5pZtxLdB18E1FohvEAeZwx94xS6Pvaz) |
| Create auction | [`54KzA5yS…`](https://suiscan.xyz/testnet/tx/54KzA5ySFtpqDMyaj78H7UsMfnfaLscg28pD6SLxn9xp) |
| Register verified bidders | [`FerYMhPi…`](https://suiscan.xyz/testnet/tx/FerYMhPifqofTUqsy8B8JCWZb7rj7hb481PBZ1cSguyn) |
| Bid A (0.02 SUI) | [`EphKhkmn…`](https://suiscan.xyz/testnet/tx/EphKhkmna4sahxkYpyi1bQGveYGGvSTv5ERtQzeTc1i3) |
| Bid B outbids (0.04) → A refunded 0.02 | [`Cp42U3mV…`](https://suiscan.xyz/testnet/tx/Cp42U3mVLTPvGcw5xy32mym9Mc3TTEDmChKz117tVMAT) |
| Close → PurchaseRight + Settlement | [`HPGtXdkp…`](https://suiscan.xyz/testnet/tx/HPGtXdkpwgrk9hmu1X36iD1T8oFJkqTz2SzoT4VpAh5f) |
| Release settlement milestone | [`C1QG1pz5…`](https://suiscan.xyz/testnet/tx/C1QG1pz5PkN14qC6LxKkmTfzMF2sDb3mVfqTRWDX25dD) |

Resulting objects:
[Settlement `0x083854db…`](https://suiscan.xyz/testnet/object/0x083854db6303975e0396a5c056e26b298e9ba13883b3483a4c7ac790072f7b32) ·
[PurchaseRight `0x0f9a29c7…`](https://suiscan.xyz/testnet/object/0x0f9a29c7094dfb88d5d925c26e66af41acf8df78ca510fec88b209f04440ab87).

## Local setup

Prereqns: Node 20+, the [Sui CLI](https://docs.sui.io/references/cli), a Sui wallet
(e.g. Slush/Sui Wallet) on testnet, and a World app at
[developer.world.org](https://developer.world.org) with the **relying party
registered** (this yields an `rp_id` and an RP signing key) and an action
`machineproof-auction-entry` created.

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

World env vars: set `NEXT_PUBLIC_WORLD_APP_ID` (`app_...`),
`NEXT_PUBLIC_WORLD_RP_ID` (`rp_...`), `WORLD_RP_SIGNING_KEY` (server-only hex),
and `NEXT_PUBLIC_WORLD_ENVIRONMENT` (`staging`, or `sandbox` when testing with the
World ID Sandbox app). Verification always posts to the `developer.world.org` v4
endpoint; the `environment` field distinguishes sandbox/staging/production.

## Tests

```bash
npm run sui:test     # 10 Move unit tests (auction + settlement invariants)
npm test             # 14 server verification tests (signal binding, replay, env)
npm run typecheck    # strict TS
npm run build        # production build
npm run sui:e2e      # optional: full on-chain lifecycle on testnet (real txs)
```

Move tests cover: unverified-bidder rejection, minimum/increment enforcement,
outbid refunds, no early close, no double finalize, reserve-not-met cancel+refund,
`PurchaseRight` issuance, milestone release, duplicate-milestone rejection, and
over-release protection.

Server verification tests cover the load-bearing World checks: a proof for the
wrong wallet or wrong auction is rejected (signal binding), replayed nullifiers
are flagged, and environment mismatch fails closed.

## Prize tracks

- **World — Best Use of IDKit**: human verification is a hard gate before auction
  entry, bound to the bidder wallet + auction, with real failure paths.
- **Sui — DeFi & Payments**: bids, refunds, winner funds, `PurchaseRight`, and
  milestone settlement are programmable in Move.
- **Curvegrid — Best RWA Tokenization**: the machine passport links physical-asset
  identity/provenance to auction permissions, entitlement, and settlement state.

## Curvegrid / MultiBaas — EVM provenance mirror (optional)

An optional EVM-side mirror of the machine's provenance, indexed by MultiBaas —
**not** a second auction. Bids, `PurchaseRight`, and settlement stay on Sui.

- Contract: `evm/contracts/MachineRWARegistry.sol` (owner-gated; emits
  `MachineRegistered` / `ProvenanceUpdated` / `InspectionAnchored`). 5 Hardhat
  tests: `cd evm && npm test`.
- Read layer: `lib/multibaas.ts` (`@curvegrid/multibaas-sdk`) + the EvmProvenance
  panel (env-gated).

Setup:
1. `cd evm && npm install && npm test`
2. Create a MultiBaas deployment; connect it to Sepolia.
3. Set `SEPOLIA_RPC_URL` + `EVM_DEPLOYER_PRIVATE_KEY`, then
   `npm run deploy:sepolia` (prints the address + `machineId`).
4. Link the contract in MultiBaas (UI, or `hardhat-multibaas-plugin`) with address
   alias `provenance_registry` and turn on **Sync Events**.
5. Create a **DApp User API key**; add your app origin under MultiBaas CORS.
6. Set `NEXT_PUBLIC_MULTIBAAS_DEPLOYMENT_URL`,
   `NEXT_PUBLIC_MULTIBAAS_DAPP_USER_API_KEY`, and `NEXT_PUBLIC_EVM_MACHINE_ID` in
   `.env.local`. Keep the admin key server-side only.

## Due-diligence assistant (optional Monid data)

A "Before you bid" assistant reviews the machine passport for completeness. Our
own LLM (Anthropic) does the reasoning; **Monid** is used for what it actually is
— a runtime **tool router** that surfaces external data sources (market
comparables, manufacturer/recall lookups) via `/v1/discover`. Monid does not
analyze content, and our own output is never branded as Monid.

- Works out of the box with a deterministic rule-based checklist (no keys).
- Set `ANTHROPIC_API_KEY` for LLM analysis; set `MONID_API_KEY`
  (from app.monid.ai/access/api-keys, funded wallet) to add external data.
  Both are server-only.
- Honest boundary: a data-completeness review, not a physical inspection or title
  check — Monid supplies data, our LLM reasons.

## Stretch — World ID for Agents (bounded bidding agent)

A future-facing extension, not the primary demo: a World-verified human delegates
a **narrow** policy to an agent — one auction, a max-bid ceiling, an expiry, and
bid-only (never settlement). The agent places the minimum winning bid when
outbid, but refuses to exceed the ceiling, bid after expiry, or act on any other
auction (`scripts/agent-bid.ts`, policy enforced in-app).

```bash
AGENT_MAX_BID_SUI=1.5 AGENT_EXPIRY_MINUTES=30 npm run agent:bid
# bring a registered AGENT_BIDDER_KEY, or AGENT_SELF_SETUP=1 for a self-contained demo
```

Live example: the agent autonomously placed a within-ceiling winning bid
([`GiL6QgEP…`](https://suiscan.xyz/testnet/tx/GiL6QgEPMgauLapDZuRULLVpo8qhTscqRFXi8ksFGKpZ))
and then held its lead. The primary human-auction flow is unchanged.

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
