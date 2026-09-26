// Shared helpers for the deploy/seed scripts. Self-contained (no Next.js alias).
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { fromBase64 } from "@mysten/sui/utils";
import { getFaucetHost, requestSuiFromFaucetV2 } from "@mysten/sui/faucet";

/**
 * Minimal .env loader (dotenv precedence): a real environment variable always
 * wins, so a CLI override like `AUCTION_DURATION_MINUTES=180 npm run sui:seed`
 * is respected. Among files, .env.local overrides .env.
 */
export function loadEnv() {
  const fromRealEnv = new Set(Object.keys(process.env));
  for (const file of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      // Never clobber a real environment variable; .env.local may override .env.
      if (val.length > 0 && !fromRealEnv.has(key)) process.env[key] = val;
    }
  }
}

export function network(): "testnet" | "devnet" | "mainnet" | "localnet" {
  return (process.env.NEXT_PUBLIC_SUI_NETWORK as never) || "testnet";
}

// Mysten's public fullnodes dropped JSON-RPC; default to a JSON-RPC-compatible
// endpoint (override with NEXT_PUBLIC_SUI_RPC_URL). getJsonRpcFullnodeUrl is kept
// as a fallback for localnet.
const DEFAULT_RPC: Record<string, string> = {
  testnet: "https://sui-testnet-rpc.publicnode.com",
  mainnet: "https://sui-rpc.publicnode.com",
};

export function getClient(): SuiJsonRpcClient {
  const net = network();
  const url =
    process.env.NEXT_PUBLIC_SUI_RPC_URL ||
    DEFAULT_RPC[net] ||
    getJsonRpcFullnodeUrl(net);
  return new SuiJsonRpcClient({ url, network: net });
}

export function keypairFromSecret(secret: string): Ed25519Keypair {
  if (secret.startsWith("suiprivkey")) {
    return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(secret.trim()).secretKey);
  }
  return Ed25519Keypair.fromSecretKey(fromBase64(secret.trim()));
}

export function getKeypair(): Ed25519Keypair {
  const sk = process.env.SUI_ADMIN_SECRET_KEY;
  if (!sk) throw new Error("SUI_ADMIN_SECRET_KEY not set in .env.local");
  return keypairFromSecret(sk);
}

export async function ensureFunds(client: SuiJsonRpcClient, address: string) {
  const { totalBalance } = await client.getBalance({ owner: address });
  if (BigInt(totalBalance) > 200_000_000n) return; // ~0.2 SUI is plenty
  console.log(`Requesting testnet gas from faucet for ${address} …`);
  try {
    await requestSuiFromFaucetV2({
      host: getFaucetHost(network() as "testnet" | "devnet" | "localnet"),
      recipient: address,
    });
    // Give the faucet a moment to land.
    await new Promise((r) => setTimeout(r, 4000));
  } catch (e) {
    console.warn(
      `Faucet request failed (${e instanceof Error ? e.message : e}). ` +
        `Fund ${address} manually and re-run.`,
    );
  }
}

type ObjectChange = {
  type: string;
  objectType?: string;
  objectId?: string;
  packageId?: string;
};

export function findPackageId(changes: ObjectChange[] | undefined): string {
  const pub = (changes ?? []).find((c) => c.type === "published");
  return pub?.packageId ?? "";
}

/** Find the id of the first created object whose type ends with `suffix`. */
export function findCreated(
  changes: ObjectChange[] | undefined,
  suffix: string,
): string {
  const hit = (changes ?? []).find(
    (c) => c.type === "created" && (c.objectType ?? "").endsWith(suffix),
  );
  return hit?.objectId ?? "";
}
