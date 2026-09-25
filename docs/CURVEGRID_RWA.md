# Curvegrid / RWA Integration Notes

## Goal

Make the MachineProof submission clearly satisfy the spirit of an RWA project:

- the onchain object represents a specific physical industrial machine;
- provenance/inspection references are connected to that asset;
- auction rights and permissions are programmable;
- the settlement flow is tied to that same machine asset.

Curvegrid sample app provided by the user:

- https://github.com/curvegrid/matsuri-stablecoin-sample-app

The current sample architecture is useful as an implementation reference:

```text
React
  ↓
MultiBaas TypeScript SDK / REST
  ├─ contract reads
  ├─ unsigned transaction construction
  └─ event queries / indexing
  ↓
MetaMask signs and submits
  ↓
EVM chain
```

The sample contains:

- an ERC20 demo stablecoin;
- an ERC721 non-transferable voucher;
- Hardhat deployment;
- MultiBaas contract linking;
- event indexing / activity history;
- frontend wallet/network helpers.

It also demonstrates a useful separation between payment token, entitlement object, and activity history.

## Important architectural decision

The hackathon core for MachineProof is planned on **Sui testnet**, because Sui is itself a target prize and the payment/escrow logic belongs there.

Therefore:

- do **not** blindly copy the Matsuri sample into the MachineProof codebase;
- do **not** create a second EVM payment system merely to say Curvegrid is used;
- first complete the Sui + World vertical slice;
- only add MultiBaas/EVM if it is genuinely useful and can be demoed end-to-end.

## RWA model

The primary RWA model is chain-agnostic conceptually:

```text
Physical machine
   ↓
MachineProof passport
   ├ machineId
   ├ manufacturer/model
   ├ serial-derived/redacted identity
   ├ provenance URI/hash
   └ inspection hash/status
   ↓
Auction
   ↓
PurchaseRight
   ↓
Settlement
```

The digital object must not overclaim legal effect.

Recommended wording:

> MachineProof creates an onchain representation of the machine, its provenance references, auction state, and the winning purchase entitlement. Legal title transfer remains subject to the underlying sales contract and applicable law.

## If MultiBaas is integrated

Only do this after the P0/P1 Sui flow works.

A good optional integration is **an EVM-side RWA provenance mirror / event dashboard**, not a duplicate auction.

Possible flow:

```text
MachineProof RWA registry on Sepolia
   ↓
MultiBaas
   ├ links ABI/address
   ├ reads machine/provenance state
   └ indexes MachineRegistered / InspectionAnchored events
   ↓
MachineProof UI activity/provenance dashboard
```

This is closer to the Curvegrid sample's strengths than forcing MultiBaas into Sui.

### Optional EVM contract

Keep it tiny:

```solidity
struct MachineRecord {
    bytes32 machineId;
    bytes32 provenanceHash;
    bytes32 inspectionHash;
    string metadataURI;
}
```

Events:

```text
MachineRegistered
ProvenanceUpdated
InspectionAnchored
```

Do not put the auction/escrow here if Sui is the primary financial chain.

## MultiBaas setup lessons from Matsuri sample

The sample indicates the following operational pattern:

1. create a MultiBaas deployment for the chosen EVM network;
2. deploy contracts using Hardhat;
3. link deployed contracts/ABIs to MultiBaas;
4. configure event indexing;
5. create a DApp User API key for frontend-level reads/calls;
6. configure exact frontend CORS origins;
7. keep admin API keys and deployer private keys out of frontend env;
8. use the TypeScript SDK/REST for state reads and event queries;
9. use MetaMask for user signatures/submission where applicable.

The Matsuri sample specifically warns that wallet network, MultiBaas deployment network, and configured contract aliases must stay aligned.

## Prize narrative

The RWA story should be told as:

> MachineProof turns a used industrial machine into a programmable trade object. The passport anchors identity and provenance; verified humans bid for the purchase right; the winning bid moves into programmable settlement. The token/object is not decorative — it connects the physical machine to permissions, auction state, and payment state.

Avoid:

> We minted an NFT for a machine.

That framing is too shallow.

## Minimum evidence for the RWA story

The final demo should show all of these visibly:

- one specific machine passport;
- one stable machine ID;
- provenance/inspection references;
- the auction created for that exact machine;
- winning bidder / winning amount;
- purchase entitlement linked back to the same machine;
- settlement linked to the same auction/machine;
- explorer transaction/object links.

## References

- Curvegrid sample: https://github.com/curvegrid/matsuri-stablecoin-sample-app
- MultiBaas docs: https://docs.curvegrid.com/multibaas/
- MultiBaas API: https://docs.curvegrid.com/multibaas/api/multibaas-api
- MultiBaas SDKs: https://docs.curvegrid.com/multibaas/sdks/
- Event indexing: https://docs.curvegrid.com/multibaas/event-indexing/

When implementing, Claude Code must inspect the current official docs/sample code rather than infer method names.