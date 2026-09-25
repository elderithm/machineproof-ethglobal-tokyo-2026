/// On-chain representation of a physical industrial machine (the RWA anchor).
///
/// A `MachineAsset` is the MachineProof passport: it carries the stable machine
/// identity plus privacy-preserving provenance/inspection references. It does
/// NOT by itself transfer legal title to the physical machine — it anchors the
/// auction/settlement flow to a specific real-world asset.
module machineproof::machine_asset;

use std::string::String;
use sui::event;

/// Shared object representing one machine and its passport metadata.
public struct MachineAsset has key, store {
    id: UID,
    /// Stable, human-readable MachineProof ID, e.g. "MP-JP-0001".
    machine_id: String,
    manufacturer: String,
    model: String,
    /// Redacted / hashed serial. Never store a raw serial number on-chain.
    serial_hash: vector<u8>,
    /// URI pointing at the off-chain provenance document set.
    provenance_uri: String,
    /// Hash committing to the provenance document set.
    provenance_hash: vector<u8>,
    /// Hash / commitment for the inspection record.
    inspection_hash: vector<u8>,
    /// Free-form inspection status label, e.g. "Verified".
    inspection_status: String,
    seller: address,
    created_at_ms: u64,
}

/// Emitted when a machine passport is registered on-chain.
public struct MachineRegistered has copy, drop {
    machine_object_id: ID,
    machine_id: String,
    manufacturer: String,
    model: String,
    seller: address,
}

/// Register a machine passport as a shared object owned conceptually by the
/// seller. Returns the object ID via the emitted event.
public fun register(
    machine_id: String,
    manufacturer: String,
    model: String,
    serial_hash: vector<u8>,
    provenance_uri: String,
    provenance_hash: vector<u8>,
    inspection_hash: vector<u8>,
    inspection_status: String,
    created_at_ms: u64,
    ctx: &mut TxContext,
) {
    let asset = MachineAsset {
        id: object::new(ctx),
        machine_id,
        manufacturer,
        model,
        serial_hash,
        provenance_uri,
        provenance_hash,
        inspection_hash,
        inspection_status,
        seller: ctx.sender(),
        created_at_ms,
    };
    event::emit(MachineRegistered {
        machine_object_id: object::id(&asset),
        machine_id: asset.machine_id,
        manufacturer: asset.manufacturer,
        model: asset.model,
        seller: asset.seller,
    });
    transfer::share_object(asset);
}

// ---- Read-only accessors (used by the auction module and off-chain reads) ----

public fun id(self: &MachineAsset): ID {
    object::id(self)
}

public fun machine_id(self: &MachineAsset): String {
    self.machine_id
}

public fun seller(self: &MachineAsset): address {
    self.seller
}

#[test_only]
public fun new_for_testing(seller: address, ctx: &mut TxContext): MachineAsset {
    MachineAsset {
        id: object::new(ctx),
        machine_id: b"MP-TEST-0001".to_string(),
        manufacturer: b"MAZAK".to_string(),
        model: b"QUICK TURN 200".to_string(),
        serial_hash: b"hash",
        provenance_uri: b"ipfs://provenance".to_string(),
        provenance_hash: b"phash",
        inspection_hash: b"ihash",
        inspection_status: b"Verified".to_string(),
        seller,
        created_at_ms: 0,
    }
}
