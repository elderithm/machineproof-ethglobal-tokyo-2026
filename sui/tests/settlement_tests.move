#[test_only]
module machineproof::settlement_tests;

use sui::balance;
use sui::sui::SUI;
use sui::test_scenario as ts;
use machineproof::admin;
use machineproof::settlement::{Self, Settlement};

const ADMIN: address = @0xAD;
const WINNER: address = @0x1237;
const SELLER: address = @0x5E11E4;

const LOCKED: u64 = 1_000;

#[test]
fun releases_all_milestones_and_completes() {
    let mut sc = ts::begin(ADMIN);
    let cap = admin::mint_for_testing(ts::ctx(&mut sc));

    // Create a settlement funded with 1000, default milestones (10/40/40/10).
    {
        let ctx = ts::ctx(&mut sc);
        let funds = balance::create_for_testing<SUI>(LOCKED);
        settlement::create_for_testing(WINNER, SELLER, funds, settlement::default_milestones(), ctx);
    };

    ts::next_tx(&mut sc, ADMIN);
    {
        let mut s = ts::take_shared<Settlement>(&sc);
        settlement::release_milestone(&cap, &mut s, 0, ts::ctx(&mut sc)); // 100
        settlement::release_milestone(&cap, &mut s, 1, ts::ctx(&mut sc)); // 400
        settlement::release_milestone(&cap, &mut s, 2, ts::ctx(&mut sc)); // 400
        settlement::release_milestone(&cap, &mut s, 3, ts::ctx(&mut sc)); // 100
        assert!(settlement::is_completed(&s), 0);
        assert!(settlement::released_amount(&s) == LOCKED, 1);
        ts::return_shared(s);
    };

    admin::burn_for_testing(cap);
    ts::end(sc);
}

#[test]
#[expected_failure(abort_code = machineproof::settlement::EMilestoneAlreadyReleased)]
fun duplicate_milestone_rejected() {
    let mut sc = ts::begin(ADMIN);
    let cap = admin::mint_for_testing(ts::ctx(&mut sc));
    {
        let ctx = ts::ctx(&mut sc);
        let funds = balance::create_for_testing<SUI>(LOCKED);
        settlement::create_for_testing(WINNER, SELLER, funds, settlement::default_milestones(), ctx);
    };
    ts::next_tx(&mut sc, ADMIN);
    {
        let mut s = ts::take_shared<Settlement>(&sc);
        settlement::release_milestone(&cap, &mut s, 0, ts::ctx(&mut sc));
        settlement::release_milestone(&cap, &mut s, 0, ts::ctx(&mut sc)); // duplicate -> abort
        ts::return_shared(s);
    };
    admin::burn_for_testing(cap);
    ts::end(sc);
}

#[test]
#[expected_failure]
fun over_release_rejected() {
    // Milestones whose basis points exceed 100% must fail closed: the second
    // release would exceed the locked balance and `balance::split` aborts.
    let mut sc = ts::begin(ADMIN);
    let cap = admin::mint_for_testing(ts::ctx(&mut sc));
    {
        let ctx = ts::ctx(&mut sc);
        let funds = balance::create_for_testing<SUI>(LOCKED);
        let ms = settlement::milestones_for_testing(vector[10_000, 5_000]);
        settlement::create_for_testing(WINNER, SELLER, funds, ms, ctx);
    };
    ts::next_tx(&mut sc, ADMIN);
    {
        let mut s = ts::take_shared<Settlement>(&sc);
        settlement::release_milestone(&cap, &mut s, 0, ts::ctx(&mut sc)); // releases full 1000
        settlement::release_milestone(&cap, &mut s, 1, ts::ctx(&mut sc)); // wants 500 more -> abort
        ts::return_shared(s);
    };
    admin::burn_for_testing(cap);
    ts::end(sc);
}
