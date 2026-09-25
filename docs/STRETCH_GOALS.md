# Stretch Goals

These are optional. Do not start them until the World + Sui auction path can already be demonstrated and recorded.

## 1. Human-authorized bidding agent

Goal: show how a verified human could delegate a narrow policy to an agent without giving the agent unlimited control.

Example policy:

```text
Auction: MP-JP-0001
Maximum bid: 150 test units
Expiry: 2026-09-27T06:00:00Z
Allowed action: bid only
Settlement authority: none
```

Flow:

```text
World-verified human
   ↓
creates bounded delegation
   ↓
agent evaluates auction state
   ↓
agent may bid only within explicit ceiling
   ↓
Move contract / app rejects action outside policy
```

This should be presented as a future-facing extension, not as the primary demo unless it is exceptionally stable.

## 2. Monid-powered machine due diligence

Reference:

- https://monid.ai/

Potential use:

- summarize MachineProof passport data;
- explain provenance/inspection records;
- surface missing machine information before the user bids;
- compare the listed machine with structured reference data if Monid provides appropriate tools/data access;
- produce a due-diligence checklist.

Do not invent a Monid API. Claude Code must inspect the current Monid product/docs and use only documented capabilities.

Potential UX:

```text
Before you bid

✓ Machine identity present
✓ Inspection record linked
△ Service history incomplete
✓ Seller provided export documentation

Ask the MachineProof Agent →
```

Important: the agent must not claim that it independently verified a physical condition unless such evidence actually exists.

## 3. Curvegrid / MultiBaas event dashboard

If sponsor mentor feedback indicates that using Curvegrid technology directly materially improves prize eligibility, add a small Sepolia provenance registry and use MultiBaas to:

- read machine records;
- index provenance/inspection events;
- show activity in the MachineProof dashboard.

Do not duplicate the Sui auction/settlement.

## 4. Multi-machine marketplace

Only if everything else is done:

- list 3–5 sample machines;
- filter by manufacturer/category;
- each machine can have independent auction state.

This is visual polish, not core technical value.

## 5. Better seller/buyer workflow

Future production features to mention, not necessarily implement:

- company/KYB verification;
- sanctions/AML checks;
- third-party inspection signatures;
- logistics milestones;
- export documentation;
- fiat/stablecoin settlement choices;
- dispute resolution;
- legal-title / contract integration.

## Rule

A polished working demo of one machine is stronger than five partially integrated sponsor features.