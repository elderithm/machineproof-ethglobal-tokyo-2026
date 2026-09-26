// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title MachineRWARegistry
/// @notice An EVM-side provenance mirror for MachineProof. It anchors the
/// machine's identity and provenance/inspection commitments and emits events
/// that MultiBaas indexes for a provenance/activity dashboard.
///
/// This is intentionally NOT an auction or escrow: the auction, bids, funds,
/// PurchaseRight, and settlement live on Sui. This contract only mirrors RWA
/// provenance so it can be inspected via MultiBaas' event indexing.
contract MachineRWARegistry {
    struct MachineRecord {
        bytes32 machineId; // stable MachineProof id (e.g. keccak of "MP-JP-0001")
        bytes32 provenanceHash;
        bytes32 inspectionHash;
        string metadataURI;
        address registrar;
        uint64 updatedAt;
        bool exists;
    }

    address public owner;
    mapping(bytes32 => MachineRecord) private records;

    event MachineRegistered(
        bytes32 indexed machineId,
        bytes32 provenanceHash,
        bytes32 inspectionHash,
        string metadataURI,
        address indexed registrar
    );
    event ProvenanceUpdated(
        bytes32 indexed machineId,
        bytes32 provenanceHash,
        address indexed registrar
    );
    event InspectionAnchored(
        bytes32 indexed machineId,
        bytes32 inspectionHash,
        address indexed registrar
    );

    error NotOwner();
    error UnknownMachine();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice Register (or overwrite) a machine's provenance mirror record.
    function registerMachine(
        bytes32 machineId,
        bytes32 provenanceHash,
        bytes32 inspectionHash,
        string calldata metadataURI
    ) external onlyOwner {
        records[machineId] = MachineRecord({
            machineId: machineId,
            provenanceHash: provenanceHash,
            inspectionHash: inspectionHash,
            metadataURI: metadataURI,
            registrar: msg.sender,
            updatedAt: uint64(block.timestamp),
            exists: true
        });
        emit MachineRegistered(
            machineId,
            provenanceHash,
            inspectionHash,
            metadataURI,
            msg.sender
        );
    }

    /// @notice Anchor a new provenance commitment for an existing machine.
    function updateProvenance(bytes32 machineId, bytes32 provenanceHash)
        external
        onlyOwner
    {
        MachineRecord storage r = records[machineId];
        if (!r.exists) revert UnknownMachine();
        r.provenanceHash = provenanceHash;
        r.updatedAt = uint64(block.timestamp);
        emit ProvenanceUpdated(machineId, provenanceHash, msg.sender);
    }

    /// @notice Anchor a new inspection commitment for an existing machine.
    function anchorInspection(bytes32 machineId, bytes32 inspectionHash)
        external
        onlyOwner
    {
        MachineRecord storage r = records[machineId];
        if (!r.exists) revert UnknownMachine();
        r.inspectionHash = inspectionHash;
        r.updatedAt = uint64(block.timestamp);
        emit InspectionAnchored(machineId, inspectionHash, msg.sender);
    }

    /// @notice Read a machine's mirror record (reverts if unknown).
    function getMachine(bytes32 machineId)
        external
        view
        returns (MachineRecord memory)
    {
        MachineRecord memory r = records[machineId];
        if (!r.exists) revert UnknownMachine();
        return r;
    }

    /// @notice Non-reverting existence check.
    function machineExists(bytes32 machineId) external view returns (bool) {
        return records[machineId].exists;
    }
}
