# MachineProof — ETHGlobal Tokyo 2026

MachineProof is a trust infrastructure for global used industrial machinery transactions.

For ETHGlobal Tokyo 2026, this repository will implement a **verified-human auction and programmable settlement flow for industrial machinery**.

> World ID gates auction entry, Sui executes onchain bids and programmable settlement, and the MachineProof passport anchors the real-world machine being traded.

## Existing Product / Pre-Hackathon State

MachineProof existed before ETHGlobal Tokyo 2026 as an early-stage product/concept for:

- machine identity and digital passports
- equipment information
- provenance records
- trade documentation and workflows

The existing commercial/application work is maintained separately.

As of the pre-hackathon baseline, this repository contains no completed ETHGlobal-specific auction, World ID, Sui, or settlement implementation.

## ETHGlobal Tokyo 2026 Scope

Planned hackathon additions:

- MachineProof onchain machine/RWA representation
- World IDKit verified-human gate before auction participation
- Sui Move auction contracts
- onchain bid funds and safe outbid/refund flow
- winner `PurchaseRight`
- programmable settlement / escrow milestones
- live testnet demo UI and explorer evidence

Potential stretch work:

- World ID for Agents / bounded human-authorized bidding agent
- Monid-assisted machine due diligence
- optional Curvegrid MultiBaas provenance/event dashboard

## Claude Code Implementation Docs

Start with [`CLAUDE.md`](CLAUDE.md), then read:

1. [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
3. [`docs/WORLD_ID.md`](docs/WORLD_ID.md)
4. [`docs/SUI_PAYMENTS.md`](docs/SUI_PAYMENTS.md)
5. [`docs/CURVEGRID_RWA.md`](docs/CURVEGRID_RWA.md)
6. [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
7. [`docs/DEMO_AND_SUBMISSION.md`](docs/DEMO_AND_SUBMISSION.md)
8. [`docs/STRETCH_GOALS.md`](docs/STRETCH_GOALS.md)

## Official References

- ETHGlobal Tokyo 2026 prizes: https://ethglobal.com/events/tokyo2026/prizes
- World docs: https://docs.world.org/
- World sandbox: https://sandbox.auth.world.org/docs
- Sui getting started: https://docs.sui.io/getting-started
- Curvegrid Matsuri stablecoin sample: https://github.com/curvegrid/matsuri-stablecoin-sample-app
- MultiBaas docs: https://docs.curvegrid.com/multibaas/
- Monid: https://monid.ai/

## Important Claims / Boundaries

- World ID is used to reduce bot/Sybil auction-entry abuse; it does not prove company authority or creditworthiness.
- The MachineProof onchain object represents the machine/passport and trade state.
- `PurchaseRight` represents a hackathon-demo purchase entitlement. It does **not** by itself transfer legal title to a physical machine.
- Financial success states shown in the UI must correspond to real confirmed testnet transactions.

## License

Apache License 2.0
