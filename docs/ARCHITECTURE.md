# Architecture — MachineProof Verified Auction

## 1. Recommended architecture

```text
Browser / Next.js
  ├─ Machine passport + auction UI
  ├─ Sui wallet adapter
  └─ World IDKit widget
          │
          │ proof payload
          ▼
Next.js server route
  ├─ verifies World proof with World API
  ├─ binds verification to auctionId + wallet address
  ├─ records/guards nullifier reuse
  └─ returns short-lived bidder authorization
          │
          ▼
Sui testnet
  ├─ MachineAsset
  ├─ Auction
  ├─ BidderRegistry / authorization consumption
  ├─ escrowed bids / refunds
  ├─ PurchaseRight
  └─ Settlement
          │
          ▼
UI reads objects/events and shows live state
```

## 2. Why this split

### World verification is offchain-server verified
World proof verification uses a server-side request. Never expose a secret/API credential to the browser. The browser initiates IDKit and sends the returned proof payload to the backend.

### Sui is the source of financial truth
Bid balances, auction winner, refundability, entitlement, and settlement status must come from Sui state/events rather than a client-side mock database.

### MachineProof passport provides RWA context
The machine is not just a fungible payment target. The passport connects the auction to a specific physical industrial asset and its provenance/inspection metadata.

## 3. Data model

Exact Move syntax may change after reading the current Sui docs. Preserve these semantics.

### `MachineAsset`

```text
id
machine_id: String
manufacturer: String
model: String
serial_hash: vector<u8>       // optional privacy-preserving representation
provenance_uri: String
provenance_hash: vector<u8>
inspection_hash: vector<u8>
seller: address
created_at_ms: u64
```

### `Auction`

```text
id
machine_asset_id: ID
seller: address
reserve_price: u64
min_increment: u64
start_ms: u64
end_ms: u64
status: CREATED | OPEN | CLOSED | SETTLED | CANCELLED
highest_bid: u64
highest_bidder: Option<address>
```

Use Sui-compatible enums/struct patterns actually supported by the current Move compiler.

### `VerifiedBidder`

Two valid implementation patterns are allowed:

**A. Onchain registry**

```text
auction_id -> wallet -> verified
```

**B. Signed authorization**

A backend authorization is consumed once by the Move entry function, if a safe and clean Sui-compatible verification mechanism is available.

Prefer A if B adds cryptographic complexity that jeopardizes delivery.

### `PurchaseRight`

```text
auction_id
machine_asset_id
winner
winning_amount
issued_at_ms
status
```

This is a demo purchase entitlement, not a legal-title NFT.

### `Settlement`

```text
auction_id
winner
seller
locked_amount
released_amount
milestones[]
status
```

Keep milestone logic minimal and deterministic.

## 4. World verification binding

The proof must be contextual to the specific auction and wallet.

Conceptually compute a signal from:

```text
machineproof-auction:{auctionId}:{normalizedWalletAddress}
```

Use the exact signal hashing/format required by the current World IDKit/API docs. Do not invent hashing behavior.

The World action should be stable, for example:

```text
machineproof-auction-entry
```

Then use auction+wallet in the signal to prevent one proof payload from being detached from the intended entry context.

The backend must:

1. receive proof + auction ID + wallet address;
2. reconstruct expected signal;
3. verify with World;
4. reject invalid/rejected/cancelled/ineligible cases;
5. reject replay according to World/nullifier semantics;
6. authorize the wallet for exactly that auction.

## 5. Auction funds model

Do not keep each bidder's full historical bid locked indefinitely if a simpler refundable design is possible.

Recommended high-level behavior:

1. Bidder submits a coin/payment object with bid transaction.
2. Contract verifies auction is open and bidder is eligible.
3. New bid must exceed current bid by `min_increment`.
4. Previous high bidder receives/refunds their locked value through a safe Move pattern.
5. New high bid becomes auction escrow.
6. At close:
   - if reserve not met, refundable/cancelled;
   - if reserve met, winning amount moves into settlement state.

Choose the exact Sui coin/balance implementation from official Sui examples and current APIs.

## 6. State machine

```text
Machine listed
   ↓
Auction CREATED
   ↓ open
Auction OPEN
   ├─ World-verified bidder → BID
   ├─ unverified bidder → REJECT
   └─ outbid → REFUNDABLE/REFUNDED
   ↓ close
Auction CLOSED
   ├─ reserve not met → CANCELLED / funds recoverable
   └─ reserve met → winner + PurchaseRight + Settlement
                                  ↓
                         milestones released
                                  ↓
                              SETTLED
```

## 7. Curvegrid / MultiBaas position

Curvegrid's sample app shows a useful EVM architecture:

```text
React → MultiBaas → unsigned tx → MetaMask → chain
                    ↑
               event indexing
```

The sample demonstrates ERC20 payment + non-transferable ERC721 voucher and requires MultiBaas for contract reads, unsigned transaction construction, and event indexing.

For this hackathon build, **do not force MultiBaas into the Sui core path** unless current Curvegrid prize rules or mentor feedback require it. Treat the Curvegrid sample as:

- reference architecture for an RWA/payment UX;
- evidence for the type of event/activity dashboard judges can inspect;
- optional EVM adapter/stretch integration if time remains.

MachineProof's RWA story must stand on its own even if MultiBaas is not used in the Sui implementation.

## 8. Security invariants

The implementation must preserve these invariants:

- unverified wallets cannot bid;
- World proof cannot be replayed to authorize another auction/wallet;
- bid cannot be lower than required increment;
- seller cannot silently replace the winner after close;
- losing bidder funds are recoverable;
- winning funds cannot be released twice;
- settlement cannot release more than locked amount;
- only the authorized role can advance seller-controlled milestones;
- frontend status is derived from confirmed chain state, not optimistic UI alone.

## 9. Hackathon simplifications

Allowed simplifications:

- one seller/admin;
- one primary machine listing;
- fixed testnet payment coin if simpler;
- seeded inspection/provenance hashes;
- two or three settlement milestones;
- a server-side ephemeral store for replay/verification metadata, provided critical fund logic remains onchain.

Do not simplify away World gating or actual onchain funds; those are central to the submission.