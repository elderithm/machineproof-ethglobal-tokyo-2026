import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

// Deploy the provenance registry and seed the demo machine so MultiBaas can
// index a MachineRegistered event.
//   npm run deploy:sepolia   (needs SEPOLIA_RPC_URL + EVM_DEPLOYER_PRIVATE_KEY)
//
// The seed tx explicitly reads the latest nonce and retries on nonce races,
// which public Sepolia RPCs occasionally cause right after the deploy tx.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const [deployer] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("MachineRWARegistry");
  const registry = await factory.deploy();
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  console.log("MachineRWARegistry deployed:", address);

  const machineId = keccak256(toUtf8Bytes("MP-JP-0001"));

  // Seed with an explicit, freshly-read nonce; retry on nonce lag.
  let seeded = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const nonce = await ethers.provider.getTransactionCount(
        deployer.address,
        "latest",
      );
      const tx = await registry.registerMachine(
        machineId,
        keccak256(toUtf8Bytes("provenance:MP-JP-0001")),
        keccak256(toUtf8Bytes("inspection:MP-JP-0001")),
        "ipfs://demo/machineproof/MP-JP-0001/provenance.json",
        { nonce },
      );
      await tx.wait();
      console.log("Seeded MP-JP-0001. machineId:", machineId);
      seeded = true;
      break;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/nonce/i.test(msg)) {
        console.log(`seed retry ${attempt} (nonce lag) …`);
        await sleep(5000);
        continue;
      }
      throw e;
    }
  }
  if (!seeded) {
    console.warn(
      "Deploy succeeded but seeding failed after retries. The contract is live; " +
        "re-run the seed, or call registerMachine once from MultiBaas/Etherscan.",
    );
  }

  console.log("\n# --- paste into .env.local ---");
  console.log(`NEXT_PUBLIC_EVM_REGISTRY_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_EVM_MACHINE_ID=${machineId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
