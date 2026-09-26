#[test_only]
module machineproof::auction_tests;

use sui::clock;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario as ts;
use std::unit_test::destroy;
use machineproof::admin;
use machineproof::machine_asset;
use machineproof::auction::{Self, Auction, PurchaseRight};
use machineproof::settlement::Settlement;

const ADMIN: address = @0xAD;
const ALICE: address = @0xA11CE;
const BOB: address = @0xB0B;

const RESERVE: u64 = 100;
const INCREMENT: u64 = 10;
const START_MS: u64 = 0;
const END_MS: u64 = 1_000;

/// Build a machine + auction, register the given bidders, open it, and share it.
/// Returns nothing; the shared Auction is retrieved with `ts::take_shared`.
fun setup(sc: &mut ts::Scenario, register_alice: bool, register_bob: bool) {
    let ctx = ts::ctx(sc);
    let cap = admin::mint_for_testing(ctx);
    let machine = machine_asset::new_for_testing(ADMIN, ctx);
    let mid = machine_asset::id(&machine);
    let mut auction = auction::create_auction_for_testing(
        mid, ADMIN, RESERVE, INCREMENT, START_MS, END_MS, ctx,
    );
    if (register_alice) auction::register_verified_bidder(&cap, &mut auction, ALICE);
    if (register_bob) auction::register_verified_bidder(&cap, &mut auction, BOB);
    auction::open_auction(&cap, &mut auction);
    auction::share_for_testing(auction);
    destroy(machine);
    admin::burn_for_testing(cap);
}

fun bid(sc: &mut ts::Scenario, bidder: address, amount: u64, at_ms: u64) {
    ts::next_tx(sc, bidder);
    let mut auction = ts::take_shared<Auction>(sc);
    let ctx = ts::ctx(sc);
    let mut c = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut c, at_ms);
    let pay = coin::mint_for_testing<SUI>(amount, ctx);
    auction::place_bid(&mut auction, pay, &c, ctx);
    clock::destroy_for_testing(c);
    ts::return_shared(auction);
}

fun close(sc: &mut ts::Scenario, caller: address, at_ms: u64) {
    ts::next_tx(sc, caller);
    let mut auction = ts::take_shared<Auction>(sc);
    let ctx = ts::ctx(sc);
    let mut c = clock::create_for_testing(ctx);
    clock::set_for_testing(&mut c, at_ms);
    auction::close_auction(&mut auction, &c, ctx);
    clock::destroy_for_testing(c);
    ts::return_shared(auction);
}

#[test]
fun full_happy_path_with_outbid_and_settlement() {
    let mut sc = ts::begin(ADMIN);
    setup(&mut sc, true, true);

    // Alice opens at 100; Bob outbids at 200. Alice is refunded 100.
    bid(&mut sc, ALICE, 100, 10);
    bid(&mut sc, BOB, 200, 20);

    // Alice received a full refund of her prior bid.
    ts::next_tx(&mut sc, ALICE);
    {
        let refund = ts::take_from_sender<Coin<SUI>>(&sc);
        assert!(coin::value(&refund) == 100, 0);
        coin::burn_for_testing(refund);
    };

    // Highest bid state reflects Bob at 200.
    ts::next_tx(&mut sc, ADMIN);
    {
        let auction = ts::take_shared<Auction>(&sc);
        assert!(auction::highest_bid(&auction) == 200, 1);
        assert!(auction::status(&auction) == auction::status_open(), 2);
        ts::return_shared(auction);
    };

    // Close after end time.
    close(&mut sc, ADMIN, END_MS + 1);

    // Auction is CLOSED and escrow drained into settlement.
    ts::next_tx(&mut sc, ADMIN);
    {
        let auction = ts::take_shared<Auction>(&sc);
        assert!(auction::status(&auction) == auction::status_closed(), 3);
        assert!(auction::escrow_value(&auction) == 0, 4);
        ts::return_shared(auction);
    };

    // Bob holds the PurchaseRight for 200.
    ts::next_tx(&mut sc, BOB);
    {
        let pr = ts::take_from_sender<PurchaseRight>(&sc);
        assert!(auction::pr_winner(&pr) == BOB, 5);
        assert!(auction::pr_winning_amount(&pr) == 200, 6);
        ts::return_to_sender(&sc, pr);
    };

    // A funded Settlement exists locking the winning amount.
    ts::next_tx(&mut sc, ADMIN);
    {
        let s = ts::take_shared<Settlement>(&sc);
        assert!(machineproof::settlement::amount_locked(&s) == 200, 7);
        ts::return_shared(s);
    };

    ts::end(sc);
}

#[test]
#[expected_failure(abort_code = machineproof::auction::ENotVerified)]
fun unverified_bidder_rejected() {
    let mut sc = ts::begin(ADMIN);
    setup(&mut sc, false, false); // nobody registered
    bid(&mut sc, ALICE, 100, 10); // Alice not verified -> abort
    ts::end(sc);
}

#[test]
#[expected_failure(abort_code = machineproof::auction::EBidTooLow)]
fun opening_bid_below_minimum_rejected() {
    let mut sc = ts::begin(ADMIN);
    setup(&mut sc, true, false);
    bid(&mut sc, ALICE, 5, 10); // below INCREMENT (10) opening minimum -> abort
    ts::end(sc);
}

#[test]
#[expected_failure(abort_code = machineproof::auction::EBidTooLow)]
fun outbid_below_increment_rejected() {
    let mut sc = ts::begin(ADMIN);
    setup(&mut sc, true, true);
    bid(&mut sc, ALICE, 100, 10);
    bid(&mut sc, BOB, 105, 20); // needs >= 110 -> abort
    ts::end(sc);
}

#[test]
#[expected_failure(abort_code = machineproof::auction::ENotEnded)]
fun cannot_close_before_end() {
    let mut sc = ts::begin(ADMIN);
    setup(&mut sc, true, false);
    bid(&mut sc, ALICE, 150, 10);
    close(&mut sc, ADMIN, 500); // before END_MS -> abort
    ts::end(sc);
}

#[test]
#[expected_failure(abort_code = machineproof::auction::EAlreadyFinalized)]
fun cannot_finalize_twice() {
    let mut sc = ts::begin(ADMIN);
    setup(&mut sc, true, false);
    bid(&mut sc, ALICE, 150, 10);
    close(&mut sc, ADMIN, END_MS + 1);
    close(&mut sc, ADMIN, END_MS + 2); // second finalize -> abort
    ts::end(sc);
}

#[test]
fun reserve_not_met_cancels_and_refunds() {
    let mut sc = ts::begin(ADMIN);
    setup(&mut sc, true, false);
    // Opening bid of 50 clears the opening minimum (10) but is below reserve (100).
    bid(&mut sc, ALICE, 50, 10);
    close(&mut sc, ADMIN, END_MS + 1);

    // Auction cancelled, escrow empty.
    ts::next_tx(&mut sc, ADMIN);
    {
        let auction = ts::take_shared<Auction>(&sc);
        assert!(auction::status(&auction) == auction::status_cancelled(), 0);
        assert!(auction::escrow_value(&auction) == 0, 1);
        ts::return_shared(auction);
    };

    // Alice's below-reserve bid was refunded in full.
    ts::next_tx(&mut sc, ALICE);
    {
        let refund = ts::take_from_sender<Coin<SUI>>(&sc);
        assert!(coin::value(&refund) == 50, 2);
        coin::burn_for_testing(refund);
    };

    ts::end(sc);
}
