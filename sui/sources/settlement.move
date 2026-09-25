/// Programmable settlement escrow for a won auction.
///
/// When an auction closes with a winner, the winning funds are moved out of the
/// auction escrow and into a `Settlement` shared object. Funds are released to
/// the seller in milestone tranches (basis points of the locked amount). Each
/// milestone can be released at most once, releases can never exceed the locked
/// amount, and every release emits an event for the activity timeline.
module machineproof::settlement;

use sui::balance::{Self, Balance};
use sui::coin;
use sui::event;
use sui::sui::SUI;
use machineproof::admin::AdminCap;

// ---- Status ----
const STATUS_OPEN: u8 = 0;
const STATUS_COMPLETED: u8 = 1;

// ---- Milestone codes (for off-chain labelling) ----
const MS_AUCTION_WON: u8 = 1;
const MS_INSPECTION_CONFIRMED: u8 = 2;
const MS_SHIPPED: u8 = 3;
const MS_ACCEPTED: u8 = 4;

const BPS_DENOMINATOR: u64 = 10_000;

// ---- Errors ----
const EMilestoneOutOfRange: u64 = 1;
const EMilestoneAlreadyReleased: u64 = 2;
const EAlreadyCompleted: u64 = 3;

/// One settlement tranche.
public struct Milestone has store, copy, drop {
    code: u8,
    /// Basis points of `amount_locked` released by this milestone.
    bps: u64,
    released: bool,
}

/// Escrow holding the winning funds, released across milestones.
public struct Settlement has key {
    id: UID,
    auction_id: ID,
    machine_asset_id: ID,
    winner: address,
    seller: address,
    locked: Balance<SUI>,
    amount_locked: u64,
    released_amount: u64,
    milestones: vector<Milestone>,
    status: u8,
}

// ---- Events ----
public struct SettlementCreated has copy, drop {
    settlement_id: ID,
    auction_id: ID,
    winner: address,
    seller: address,
    amount_locked: u64,
}

public struct MilestoneReleased has copy, drop {
    settlement_id: ID,
    milestone_index: u64,
    milestone_code: u8,
    amount: u64,
    released_total: u64,
    seller: address,
}

public struct SettlementCompleted has copy, drop {
    settlement_id: ID,
    released_total: u64,
}

/// The default milestone policy (a demo policy, not a production recommendation):
///   10% on auction won, 40% on inspection confirmed, 40% on shipped, 10% on accepted.
public fun default_milestones(): vector<Milestone> {
    vector[
        Milestone { code: MS_AUCTION_WON, bps: 1_000, released: false },
        Milestone { code: MS_INSPECTION_CONFIRMED, bps: 4_000, released: false },
        Milestone { code: MS_SHIPPED, bps: 4_000, released: false },
        Milestone { code: MS_ACCEPTED, bps: 1_000, released: false },
    ]
}

/// Create and share a settlement funded with the winning balance. Called by the
/// `auction` module during finalization. Returns the new settlement's ID.
public(package) fun create_and_share(
    auction_id: ID,
    machine_asset_id: ID,
    winner: address,
    seller: address,
    funds: Balance<SUI>,
    milestones: vector<Milestone>,
    ctx: &mut TxContext,
): ID {
    let amount_locked = balance::value(&funds);
    let settlement = Settlement {
        id: object::new(ctx),
        auction_id,
        machine_asset_id,
        winner,
        seller,
        locked: funds,
        amount_locked,
        released_amount: 0,
        milestones,
        status: STATUS_OPEN,
    };
    let settlement_id = object::id(&settlement);
    event::emit(SettlementCreated {
        settlement_id,
        auction_id,
        winner,
        seller,
        amount_locked,
    });
    transfer::share_object(settlement);
    settlement_id
}

/// Release one milestone tranche to the seller. Gated by `AdminCap` (the
/// seller/admin role). Fails closed on duplicate release, out-of-range index,
/// or an already-completed settlement. `balance::split` additionally aborts if a
/// tranche would exceed the remaining locked funds.
public fun release_milestone(
    _cap: &AdminCap,
    settlement: &mut Settlement,
    milestone_index: u64,
    ctx: &mut TxContext,
) {
    assert!(settlement.status == STATUS_OPEN, EAlreadyCompleted);
    assert!(milestone_index < vector::length(&settlement.milestones), EMilestoneOutOfRange);

    let amount_locked = settlement.amount_locked;
    let seller = settlement.seller;
    let milestone = &mut settlement.milestones[milestone_index];
    assert!(!milestone.released, EMilestoneAlreadyReleased);
    milestone.released = true;
    let code = milestone.code;

    let amount = mul_bps(amount_locked, milestone.bps);
    settlement.released_amount = settlement.released_amount + amount;

    // `split` aborts if `amount` exceeds the remaining locked balance, giving a
    // hard on-chain guarantee that releases never exceed the locked amount.
    let part = balance::split(&mut settlement.locked, amount);
    transfer::public_transfer(coin::from_balance(part, ctx), seller);

    let settlement_id = object::id(settlement);
    event::emit(MilestoneReleased {
        settlement_id,
        milestone_index,
        milestone_code: code,
        amount,
        released_total: settlement.released_amount,
        seller,
    });

    if (all_released(&settlement.milestones)) {
        // Sweep any basis-point rounding dust to the seller and complete.
        let remaining = balance::value(&settlement.locked);
        if (remaining > 0) {
            let rest = balance::withdraw_all(&mut settlement.locked);
            transfer::public_transfer(coin::from_balance(rest, ctx), seller);
            settlement.released_amount = settlement.amount_locked;
        };
        settlement.status = STATUS_COMPLETED;
        event::emit(SettlementCompleted {
            settlement_id,
            released_total: settlement.released_amount,
        });
    }
}

fun mul_bps(amount: u64, bps: u64): u64 {
    (((amount as u128) * (bps as u128)) / (BPS_DENOMINATOR as u128)) as u64
}

fun all_released(milestones: &vector<Milestone>): bool {
    let mut i = 0;
    let n = vector::length(milestones);
    while (i < n) {
        if (!milestones[i].released) return false;
        i = i + 1;
    };
    true
}

// ---- Read-only accessors ----
public fun amount_locked(self: &Settlement): u64 { self.amount_locked }
public fun released_amount(self: &Settlement): u64 { self.released_amount }
public fun status(self: &Settlement): u8 { self.status }
public fun winner(self: &Settlement): address { self.winner }
public fun is_completed(self: &Settlement): bool { self.status == STATUS_COMPLETED }

#[test_only]
public fun milestones_for_testing(bps: vector<u64>): vector<Milestone> {
    let mut out: vector<Milestone> = vector[];
    let mut i = 0;
    while (i < vector::length(&bps)) {
        out.push_back(Milestone { code: (i as u8), bps: bps[i], released: false });
        i = i + 1;
    };
    out
}

#[test_only]
public fun create_for_testing(
    winner: address,
    seller: address,
    funds: Balance<SUI>,
    milestones: vector<Milestone>,
    ctx: &mut TxContext,
): ID {
    create_and_share(
        object::id_from_address(@0xA),
        object::id_from_address(@0xB),
        winner,
        seller,
        funds,
        milestones,
        ctx,
    )
}
