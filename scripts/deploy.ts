// Publish the Move package to Sui testnet using the admin keypair, then print
// the env values to paste into .env.local.
//
//   npm run sui:deploy
//
// If SUI_ADMIN_SECRET_KEY is not set, a fresh testnet keypair is generated and
// printed (SERVER-ONLY — save it, never commit it).
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import {
  ensureFunds,
  findCreated,
  findPackageId,
  getClient,
  keypairFromSecret,
  loadEnv,
} from "./lib";

async function main() {
  loadEnv();
  const client = getClient();

  let generated = false;
  let keypair: Ed25519Keypair;
  if (process.env.SUI_ADMIN_SECRET_KEY) {
    keypair = keypairFromSecret(process.env.SUI_ADMIN_SECRET_KEY);
  } else {
    keypair = new Ed25519Keypair();
    generated = true;
  }
  const address = keypair.getPublicKey().toSuiAddress();
  console.log(`Admin/deployer address: ${address}`);

  await ensureFunds(client, address);

  // Compile to base64 modules + dependency ids.
  const suiDir = resolve(process.cwd(), "sui");
  console.log("Building Move package…");
  const out = execSync("sui move build --dump-bytecode-as-base64", {
    cwd: suiDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const { modules, dependencies } = JSON.parse(out) as {
    modules: string[];
    dependencies: string[];
  };

  const tx = new Transaction();
  const [upgradeCap] = tx.publish({ modules, dependencies });
  tx.transferObjects([upgradeCap], tx.pure.address(address));

  console.log("Publishing package…");
  const res = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: { showObjectChanges: true, showEffects: true },
  });
  await client.waitForTransaction({ digest: res.digest });

  const changes = res.objectChanges ?? undefined;
  const packageId = findPackageId(changes as never);
  const adminCapId = findCreated(changes as never, "::admin::AdminCap");

  if (!packageId) {
    console.error("Publish succeeded but packageId not found. Tx:", res.digest);
    process.exit(1);
  }

  console.log("\n✅ Published. Tx digest:", res.digest);
  console.log("\n# --- paste into .env.local ---");
  if (generated) {
    console.log(`SUI_ADMIN_SECRET_KEY=${keypair.getSecretKey()}`);
  }
  console.log(`NEXT_PUBLIC_SUI_PACKAGE_ID=${packageId}`);
  console.log(`NEXT_PUBLIC_ADMIN_CAP_ID=${adminCapId}`);
  console.log(
    "\nThen run:  npm run sui:seed   (registers the machine + creates the auction)",
  );
  if (generated) {
    console.log(
      "\n⚠️  SUI_ADMIN_SECRET_KEY above is a server-only testnet key. Save it to .env.local and never commit it.",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
