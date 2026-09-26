import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

// Deploy the provenance registry to the configured network and seed the demo
// machine so MultiBaas can index a MachineRegistered event.
//   npm run deploy:sepolia   (needs SEPOLIA_RPC_URL + EVM_DEPLOYER_PRIVATE_KEY)
async function main() {
  const factory = await ethers.getContractFactory("MachineRWARegistry");
  const registry = await factory.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log("MachineRWARegistry deployed:", address);

  const machineId = keccak256(toUtf8Bytes("MP-JP-0001"));
  const tx = await registry.registerMachine(
    machineId,
    keccak256(toUtf8Bytes("provenance:MP-JP-0001")),
    keccak256(toUtf8Bytes("inspection:MP-JP-0001")),
    "ipfs://demo/machineproof/MP-JP-0001/provenance.json",
  );
  await tx.wait();
  console.log("Seeded MP-JP-0001. machineId:", machineId);

  console.log("\n# --- paste into .env.local ---");
  console.log(`NEXT_PUBLIC_EVM_REGISTRY_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_EVM_MACHINE_ID=${machineId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
