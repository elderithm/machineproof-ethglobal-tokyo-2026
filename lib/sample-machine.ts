// Deterministic sample machine used for the demo. The on-chain MachineAsset is
// seeded from this same data (see scripts/seed.ts), so the passport shown in the
// UI matches the object registered on Sui.

export const SAMPLE_MACHINE = {
  machineId: "MP-JP-0001",
  manufacturer: "MAZAK",
  model: "QUICK TURN 200",
  category: "CNC Turning Center",
  origin: "Japan",
  year: 2016,
  // Redacted / hashed serial — never expose a raw serial on-chain.
  serialHash: "sha256:9f2c…redacted",
  inspectionStatus: "Verified",
  // Off-chain references (committed to on-chain via hashes).
  provenanceUri: "ipfs://demo/machineproof/MP-JP-0001/provenance.json",
  provenanceHash: "sha256:1a3f5c7e9b0d2f46…",
  inspectionHash: "sha256:88ad12ff90cc1e00…",
  description:
    "Twin-spindle CNC turning center. Single-owner Japanese factory use, " +
    "documented maintenance history, export inspection completed.",
  // Neutral placeholder — no third-party copyrighted photography.
  imageEmoji: "⚙️",
  provenance: [
    { label: "Origin", value: "Japan (single owner)" },
    { label: "Maintenance", value: "Documented service history" },
    { label: "Export inspection", value: "Completed / sample" },
  ],
} as const;

export type SampleMachine = typeof SAMPLE_MACHINE;
