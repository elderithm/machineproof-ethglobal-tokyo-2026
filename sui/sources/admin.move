/// Administrative capability for MachineProof.
///
/// A single `AdminCap` is minted to the package publisher at deploy time. In
/// the hackathon architecture the backend holds this capability (as the
/// seller/admin signer) and uses it to:
///   * register World-verified bidders for an auction,
///   * open an auction, and
///   * advance seller-controlled settlement milestones.
///
/// Keeping the capability in its own module lets both `auction` and
/// `settlement` depend on it without creating a dependency cycle.
module machineproof::admin;

/// Capability that authorizes privileged auction/settlement actions.
public struct AdminCap has key, store {
    id: UID,
}

/// Mint the single `AdminCap` and transfer it to the publisher.
fun init(ctx: &mut TxContext) {
    transfer::transfer(
        AdminCap { id: object::new(ctx) },
        ctx.sender(),
    );
}

#[test_only]
/// Test helper: mint an `AdminCap` outside of module init.
public fun mint_for_testing(ctx: &mut TxContext): AdminCap {
    AdminCap { id: object::new(ctx) }
}

#[test_only]
public fun burn_for_testing(cap: AdminCap) {
    let AdminCap { id } = cap;
    id.delete();
}
