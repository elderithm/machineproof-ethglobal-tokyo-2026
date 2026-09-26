import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

// Emit a fresh provenance event so MultiBaas (with Starting Block = latest)
// indexes something immediately, without needing to backfill old blocks.
//   REGISTRY_ADDRESS=0x<linked address> npm run emit:sepolia
// The machine (MP-JP-0001) must already be registered at that address.
async function main() {
  const address = process.env.REGISTRY_ADDRESS;
  if (!address) {
    throw new Error("Set REGISTRY_ADDRESS=0x... (the linked contract address).");
  }
  const [deployer] = await ethers.getSigners();
  const registry = await ethers.getContractAt("MachineRWARegistry", address);
  const machineId = keccak256(toUtf8Bytes("MP-JP-0001"));

  // A fresh provenance commitment (timestamped) to guarantee a new event.
  const nonce = await ethers.provider.getTransactionCount(
    deployer.address,
    "latest",
  );
  const tx = await registry.updateProvenance(
    machineId,
    keccak256(toUtf8Bytes(`provenance:MP-JP-0001:${Date.now()}`)),
    { nonce },
  );
  await tx.wait();
  console.log("Emitted ProvenanceUpdated. tx:", tx.hash);
  console.log("It should appear in the MultiBaas events feed within a minute.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
