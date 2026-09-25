/// Verified-human auction with on-chain bid escrow and refunds.
///
/// Flow: an admin creates an auction for a `MachineAsset`, registers
/// World-verified bidders (after off-chain proof verification), and opens it.
/// Verified bidders place SUI bids; being outbid refunds the previous bidder
/// immediately. After the end time anyone may close the auction: if the reserve
/// is met the winning funds move into a `Settlement` and the winner receives a
/// `PurchaseRight`; otherwise the auction is cancelled and any funds refunded.
module machineproof::auction;

use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui::table::{Self, Table};
use machineproof::admin::AdminCap;
use machineproof::machine_asset::MachineAsset;
use machineproof::settlement;

// ---- Auction status ----
const STATUS_CREATED: u8 = 0;
const STATUS_OPEN: u8 = 1;
const STATUS_CLOSED: u8 = 2;
const STATUS_CANCELLED: u8 = 4;

// ---- Errors ----
const ENotCreated: u64 = 1;
const ENotOpen: u64 = 2;
const ENotStarted: u64 = 3;
const EEnded: u64 = 4;
const ENotEnded: u64 = 5;
const ENotVerified: u64 = 6;
const EBidTooLow: u64 = 7;
const EAlreadyFinalized: u64 = 8;

/// Shared auction object. Holds the current high bid in escrow and the set of
/// bidders that passed World verification for THIS auction.
public struct Auction has key {
    id: UID,
    machine_asset_id: ID,
    seller: address,
    reserve_price: u64,
    /// Minimum first bid, and minimum step over the current high bid.
    min_increment: u64,
    start_ms: u64,
    end_ms: u64,
    status: u8,
    highest_bid: u64,
    highest_bidder: Option<address>,
    /// The current high bid, locked on-chain.
    escrow: Balance<SUI>,
    /// Bidders verified (via World ID, off-chain) and registered for this auction.
    verified: Table<address, bool>,
    finalized: bool,
}

/// The winner's purchase entitlement. A demo entitlement — it does NOT by itself
/// transfer legal title to the physical machine.
public struct PurchaseRight has key, store {
    id: UID,
    auction_id: ID,
    machine_asset_id: ID,
    winner: address,
    winning_amount: u64,
    settlement_id: ID,
    issued_at_ms: u64,
}

// ---- Events ----
public struct AuctionCreated has copy, drop {
    auction_id: ID,
    machine_asset_id: ID,
    seller: address,
    reserve_price: u64,
    min_increment: u64,
    start_ms: u64,
    end_ms: u64,
}

public struct BidderVerified has copy, drop { auction_id: ID, wallet: address }
public struct AuctionOpened has copy, drop { auction_id: ID }
public struct BidPlaced has copy, drop { auction_id: ID, bidder: address, amount: u64 }
public struct BidRefunded has copy, drop { auction_id: ID, bidder: address, amount: u64 }
public struct AuctionCancelled has copy, drop { auction_id: ID }
public struct AuctionWon has copy, drop {
    auction_id: ID,
    winner: address,
    winning_amount: u64,
    settlement_id: ID,
}
public struct PurchaseRightIssued has copy, drop {
    purchase_right_id: ID,
    auction_id: ID,
    machine_asset_id: ID,
    winner: address,
    winning_amount: u64,
}

/// Create an auction for a machine. Admin-only. Seller is taken from the machine
/// passport so the auction cannot be created against a machine you do not list.
public fun create_auction(
    _cap: &AdminCap,
    machine: &MachineAsset,
    reserve_price: u64,
    min_increment: u64,
    start_ms: u64,
    end_ms: u64,
    ctx: &mut TxContext,
) {
    let auction = new_auction_internal(
        machine_asset_id_of(machine),
        machineproof::machine_asset::seller(machine),
        reserve_price,
        min_increment,
        start_ms,
        end_ms,
        ctx,
    );
    let auction_id = object::id(&auction);
    event::emit(AuctionCreated {
        auction_id,
        machine_asset_id: auction.machine_asset_id,
        seller: auction.seller,
        reserve_price,
        min_increment,
        start_ms,
        end_ms,
    });
    transfer::share_object(auction);
}

fun machine_asset_id_of(machine: &MachineAsset): ID {
    machineproof::machine_asset::id(machine)
}

fun new_auction_internal(
    machine_asset_id: ID,
    seller: address,
    reserve_price: u64,
    min_increment: u64,
    start_ms: u64,
    end_ms: u64,
    ctx: &mut TxContext,
): Auction {
    Auction {
        id: object::new(ctx),
        machine_asset_id,
        seller,
        reserve_price,
        min_increment,
        start_ms,
        end_ms,
        status: STATUS_CREATED,
        highest_bid: 0,
        highest_bidder: option::none(),
        escrow: balance::zero<SUI>(),
        verified: table::new(ctx),
        finalized: false,
    }
}

/// Register a bidder wallet as verified for this auction. Admin-only: the
/// backend calls this only AFTER it has verified the bidder's World proof bound
/// to (auctionId, wallet). This is the on-chain consumption of the off-chain
/// human-verification attestation.
public fun register_verified_bidder(
    _cap: &AdminCap,
    auction: &mut Auction,
    wallet: address,
) {
    if (!table::contains(&auction.verified, wallet)) {
        table::add(&mut auction.verified, wallet, true);
    };
    event::emit(BidderVerified { auction_id: object::id(auction), wallet });
}

/// Open an auction for bidding (CREATED -> OPEN). Admin-only.
public fun open_auction(_cap: &AdminCap, auction: &mut Auction) {
    assert!(auction.status == STATUS_CREATED, ENotCreated);
    auction.status = STATUS_OPEN;
    event::emit(AuctionOpened { auction_id: object::id(auction) });
}

/// Place a bid. The bidder must be World-verified for this auction, the auction
/// must be open and within its time window, and the amount must clear the
/// minimum. If there is a previous high bidder they are refunded immediately.
public fun place_bid(
    auction: &mut Auction,
    payment: Coin<SUI>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(auction.status == STATUS_OPEN, ENotOpen);
    let now = clock.timestamp_ms();
    assert!(now >= auction.start_ms, ENotStarted);
    assert!(now < auction.end_ms, EEnded);

    let bidder = ctx.sender();
    assert!(is_verified(auction, bidder), ENotVerified);

    let amount = coin::value(&payment);
    let auction_id = object::id(auction);

    if (option::is_some(&auction.highest_bidder)) {
        // Must beat the standing bid by at least the increment.
        assert!(amount >= auction.highest_bid + auction.min_increment, EBidTooLow);
        // Refund the previous high bidder in full.
        let prev = *option::borrow(&auction.highest_bidder);
        let prev_amount = auction.highest_bid;
        let refund = balance::withdraw_all(&mut auction.escrow);
        transfer::public_transfer(coin::from_balance(refund, ctx), prev);
        event::emit(BidRefunded { auction_id, bidder: prev, amount: prev_amount });
    } else {
        // Opening bid must clear the minimum opening amount.
        assert!(amount >= auction.min_increment, EBidTooLow);
    };

    balance::join(&mut auction.escrow, coin::into_balance(payment));
    auction.highest_bid = amount;
    auction.highest_bidder = option::some(bidder);
    event::emit(BidPlaced { auction_id, bidder, amount });
}

/// Close the auction after its end time. Permissionless: the winner is already
/// determined by the standing high bid, so anyone may trigger finalization and
/// no admin can substitute a different winner.
public fun close_auction(
    auction: &mut Auction,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(!auction.finalized, EAlreadyFinalized);
    let now = clock.timestamp_ms();
    assert!(now >= auction.end_ms, ENotEnded);
    auction.finalized = true;

    let auction_id = object::id(auction);
    let machine_asset_id = auction.machine_asset_id;
    let seller = auction.seller;

    let has_bid = option::is_some(&auction.highest_bidder);
    let reserve_met = has_bid && auction.highest_bid >= auction.reserve_price;

    if (!reserve_met) {
        auction.status = STATUS_CANCELLED;
        if (has_bid) {
            // Reserve not met: refund the (only) locked bidder.
            let bidder = *option::borrow(&auction.highest_bidder);
            let amount = auction.highest_bid;
            let refund = balance::withdraw_all(&mut auction.escrow);
            transfer::public_transfer(coin::from_balance(refund, ctx), bidder);
            event::emit(BidRefunded { auction_id, bidder, amount });
        };
        event::emit(AuctionCancelled { auction_id });
        return
    };

    // Reserve met: create settlement + purchase right.
    let winner = *option::borrow(&auction.highest_bidder);
    let winning_amount = auction.highest_bid;
    auction.status = STATUS_CLOSED;

    let funds = balance::withdraw_all(&mut auction.escrow);
    let settlement_id = settlement::create_and_share(
        auction_id,
        machine_asset_id,
        winner,
        seller,
        funds,
        settlement::default_milestones(),
        ctx,
    );

    let purchase_right = PurchaseRight {
        id: object::new(ctx),
        auction_id,
        machine_asset_id,
        winner,
        winning_amount,
        settlement_id,
        issued_at_ms: now,
    };
    let purchase_right_id = object::id(&purchase_right);
    transfer::transfer(purchase_right, winner);

    event::emit(AuctionWon { auction_id, winner, winning_amount, settlement_id });
    event::emit(PurchaseRightIssued {
        purchase_right_id,
        auction_id,
        machine_asset_id,
        winner,
        winning_amount,
    });
}

// ---- Read-only accessors ----
public fun is_verified(auction: &Auction, wallet: address): bool {
    table::contains(&auction.verified, wallet) && *table::borrow(&auction.verified, wallet)
}

public fun status(self: &Auction): u8 { self.status }
public fun highest_bid(self: &Auction): u64 { self.highest_bid }
public fun highest_bidder(self: &Auction): Option<address> { self.highest_bidder }
public fun reserve_price(self: &Auction): u64 { self.reserve_price }
public fun min_increment(self: &Auction): u64 { self.min_increment }
public fun end_ms(self: &Auction): u64 { self.end_ms }
public fun machine_asset_id(self: &Auction): ID { self.machine_asset_id }
public fun escrow_value(self: &Auction): u64 { balance::value(&self.escrow) }

// Status code accessors for off-chain use / tests.
public fun status_created(): u8 { STATUS_CREATED }
public fun status_open(): u8 { STATUS_OPEN }
public fun status_closed(): u8 { STATUS_CLOSED }
public fun status_cancelled(): u8 { STATUS_CANCELLED }

// PurchaseRight accessors.
public fun pr_winner(self: &PurchaseRight): address { self.winner }
public fun pr_winning_amount(self: &PurchaseRight): u64 { self.winning_amount }
public fun pr_machine_asset_id(self: &PurchaseRight): ID { self.machine_asset_id }
public fun pr_settlement_id(self: &PurchaseRight): ID { self.settlement_id }

#[test_only]
public fun create_auction_for_testing(
    machine_asset_id: ID,
    seller: address,
    reserve_price: u64,
    min_increment: u64,
    start_ms: u64,
    end_ms: u64,
    ctx: &mut TxContext,
): Auction {
    new_auction_internal(machine_asset_id, seller, reserve_price, min_increment, start_ms, end_ms, ctx)
}

#[test_only]
public fun share_for_testing(auction: Auction) {
    transfer::share_object(auction);
}
