# MachineProof — ETHGlobal Tokyo 2026 submission

> A verified-human auction and programmable settlement flow for used industrial
> machinery. World ID gates real bidders, Sui Move executes on-chain bids and
> milestone settlement, and the MachineProof passport anchors the real machine.

## One-liner

MachineProof turns a used industrial machine into a programmable trade object:
World ID human-gates auction entry, Sui controls bids/refunds/escrow, the winner
gets an on-chain `PurchaseRight`, and settlement releases funds by milestone.

## The problem

Cross-border used-machinery trades are high value but suffer several trust
failures at once: provenance/inspection claims are hard to evaluate, online
bidding is distorted by bots/Sybils, deposits and refunds are operationally
awkward, and the winning bid doesn't create a transparent settlement workflow.
MachineProof connects passport → verified bidder → auction → settlement in one
end-to-end flow.

## What we built at ETHGlobal Tokyo 2026

- **Sui Move contracts** (`sui/`): RWA machine passport, a per-auction verified-
  bidder registry, escrowed bids with immediate outbid refunds, permissionless
  finalization, a winner `PurchaseRight`, and milestone-based `Settlement`.
  **10 Move unit tests** cover the financial invariants.
- **World ID 4.0** gate (`components/WorldGate.tsx`, `app/api/world/*`): the
  relying-party model with `@worldcoin/idkit` 4.x — server-signed `rp_context`,
  the `orbLegacy` proof bound to `auctionId + wallet`, v4 verification, nullifier
  replay protection, then on-chain bidder registration. **14 server tests.**
- **Next.js app**: wallet connect, a marketplace of auctions, live bidding UI,
  milestone settlement, an on-chain activity timeline, and an on-chain passport.
- **Stretch, honest and additive**: a bounded human-authorized bidding agent
  (World ID for Agents); an EVM provenance mirror indexed by Curvegrid MultiBaas;
  and a due-diligence assistant where our own LLM reasons and Monid is used for
  what it actually is — a runtime tool router for external data.

## Prize tracks

### World — Best Use of IDKit

World verification is a **hard gate**: a wallet cannot be registered — and thus
cannot bid — without a valid World proof (`auction::place_bid` aborts
`ENotVerified` otherwise). We use World ID 4.0 (current IDKit): the server signs
an `rp_context`, the proof carries a signal of
`machineproof-auction:{auctionId}:{wallet}`, and the server re-checks
`signal_hash` so a proof can't be detached to another wallet/auction. Failure
paths (wrong wallet, wrong auction, replayed nullifier, environment mismatch) are
covered by unit tests. World ID reduces bot/Sybil auction entry; it does **not**
prove corporate authority or creditworthiness.

### Sui — DeFi & Payments

Sui Move is the source of financial truth: auction state, escrowed bids,
immediate outbid refunds, one-time finalization, the winner's `PurchaseRight`,
and a `Settlement` escrow that releases funds by milestone (10/40/40/10 bps) with
duplicate-release and over-release protection. All state is read from Sui; the UI
never fakes success.

### Curvegrid — Best RWA Tokenization

The MachineProof passport links physical-asset identity and provenance/inspection
references to auction permissions, the purchase entitlement, and settlement
state. An optional **EVM provenance mirror** (`evm/MachineRWARegistry.sol`,
Sepolia) is indexed by **MultiBaas** for a provenance/activity dashboard — a
mirror, not a second auction. The token/object is not decoration: it connects the
machine to permissions, auction state, and payment state.

## Live testnet evidence (Sui)

Network: **Sui testnet**. Package/machine are stable; auctions are re-seeded per
demo. A full lifecycle was executed on-chain by `npm run sui:e2e`:

| Item | Id / tx |
| --- | --- |
| Package | [`0x682b7ffd…69d20`](https://suiscan.xyz/testnet/object/0x682b7ffd56d971e53c3df5a261dcbd45afcad8e33d99024c72ac07bbc2169d20) |
| MachineAsset (MP-JP-0001) | [`0xe089b7fe…621f99`](https://suiscan.xyz/testnet/object/0xe089b7fe82ed21b525c8cc5da3ed4f3cd0eff8afad2499ce2715b48b22621f99) |
| Bid A → outbid B (A refunded) | [`Cp42U3mV…`](https://suiscan.xyz/testnet/tx/Cp42U3mVLTPvGcw5xy32mym9Mc3TTEDmChKz117tVMAT) |
| Close → PurchaseRight + Settlement | [`HPGtXdkp…`](https://suiscan.xyz/testnet/tx/HPGtXdkpwgrk9hmu1X36iD1T8oFJkqTz2SzoT4VpAh5f) |
| Milestone release | [`C1QG1pz5…`](https://suiscan.xyz/testnet/tx/C1QG1pz5PkN14qC6LxKkmTfzMF2sDb3mVfqTRWDX25dD) |
| Settlement object | [`0x083854db…`](https://suiscan.xyz/testnet/object/0x083854db6303975e0396a5c056e26b298e9ba13883b3483a4c7ac790072f7b32) |
| Bounded agent bid (stretch) | [`GiL6QgEP…`](https://suiscan.xyz/testnet/tx/GiL6QgEPMgauLapDZuRULLVpo8qhTscqRFXi8ksFGKpZ) |

EVM mirror (Sepolia): `MachineRWARegistry` at
`0x203648f340dCB13029601A7b8238DF0553448Db1`, machineId
`0xae406071cadb0472cbb1e04b817891c83e74d0642ab4e912e575dc18540180cc`.

## Demo flow

1. Open the machine passport (identity/provenance read on-chain).
2. Join → World ID verification (bound to this auction + wallet) → registered
   on-chain. An unverified wallet cannot bid.
3. Place a Sui testnet bid; a second verified wallet outbids and the first is
   refunded automatically.
4. Close the auction → winner receives a `PurchaseRight`; funds move into
   `Settlement`.
5. Release a settlement milestone → funds flow to the seller; every step is a
   confirmed on-chain transaction with an explorer link.

## Tech stack

Sui Move (2024) · `@mysten/sui` + `@mysten/dapp-kit` · World ID 4.0
(`@worldcoin/idkit` 4.x + `idkit-server`) · Next.js (App Router, TS) · Solidity +
Hardhat + Curvegrid MultiBaas (Sepolia) · Monid (tool router) + Anthropic (LLM).

## Testing

- `npm run sui:test` — 10 Move invariant tests
- `npm test` — 14 server verification tests (World signal binding, replay, env) +
  due-diligence checklist
- `cd evm && npm test` — 5 Solidity tests
- CI (GitHub Actions) runs the web + EVM suites on every push/PR.

## Honest boundaries

- World ID reduces bot/Sybil registration; it does not establish corporate
  authority, creditworthiness, or sanctions status.
- `PurchaseRight` is a demo purchase entitlement, not automatic legal title.
- The due-diligence assistant is a data review, not a physical inspection; Monid
  supplies external data, our own LLM does the reasoning.

## Pre-existing work disclosure

Before ETHGlobal Tokyo 2026, MachineProof existed as an early product/concept for
machine identity/passports, equipment information, provenance records, and trade
documentation. The auction, World ID, Sui, settlement, and integration work in
this repository was **built during** the hackathon.

## Repository & setup

Source and full setup instructions: see [`README.md`](README.md). License: Apache-2.0.
