// Central client-safe configuration, sourced from NEXT_PUBLIC_* env vars.
// Server-only secrets (e.g. the admin key) live in lib/sui/admin.ts and are
// never imported into client components.

export type SuiNetwork = "testnet" | "devnet" | "mainnet" | "localnet";

export const SUI_NETWORK: SuiNetwork =
  (process.env.NEXT_PUBLIC_SUI_NETWORK as SuiNetwork) || "testnet";

// NOTE: Mysten's public fullnodes (fullnode.*.sui.io) have removed JSON-RPC
// (they return -32601 "JSON-RPC ... has been deprecated"). Until this app
// migrates to gRPC/@mysten/dapp-kit-react, we default to a JSON-RPC-compatible
// endpoint. Override with NEXT_PUBLIC_SUI_RPC_URL. publicnode serves permissive
// CORS (access-control-allow-origin: *) so it works from the browser too.
const DEFAULT_RPC: Record<SuiNetwork, string> = {
  testnet: "https://sui-testnet-rpc.publicnode.com",
  devnet: "https://fullnode.devnet.sui.io:443",
  mainnet: "https://sui-rpc.publicnode.com",
  localnet: "http://127.0.0.1:9000",
};

export const SUI_RPC_URL =
  process.env.NEXT_PUBLIC_SUI_RPC_URL || DEFAULT_RPC[SUI_NETWORK];

// Deployed identifiers (filled in .env.local after deploy + seed).
export const PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || "";
export const MACHINE_ASSET_ID = process.env.NEXT_PUBLIC_MACHINE_ASSET_ID || "";
export const AUCTION_ID = process.env.NEXT_PUBLIC_AUCTION_ID || "";
export const ADMIN_CAP_ID = process.env.NEXT_PUBLIC_ADMIN_CAP_ID || "";

// World ID
export const WORLD_APP_ID = (process.env.NEXT_PUBLIC_WORLD_APP_ID || "") as
  | `app_${string}`
  | "";
export const WORLD_ACTION =
  process.env.NEXT_PUBLIC_WORLD_ACTION || "machineproof-auction-entry";

export const IS_CONFIGURED = Boolean(PACKAGE_ID && AUCTION_ID);

// Move module/function targets.
export const target = (module: string, fn: string) =>
  `${PACKAGE_ID}::${module}::${fn}` as const;

// SUI has 9 decimals (1 SUI = 1e9 MIST).
export const MIST_PER_SUI = 1_000_000_000n;

export function suiToMist(sui: number): bigint {
  // Avoid floating point drift: work in integer MIST.
  return BigInt(Math.round(sui * 1e9));
}

export function mistToSui(mist: bigint | string | number): number {
  return Number(BigInt(mist)) / 1e9;
}

// Explorer (SuiScan) URL helpers.
const SCAN_BASE = `https://suiscan.xyz/${SUI_NETWORK}`;
export const txUrl = (digest: string) => `${SCAN_BASE}/tx/${digest}`;
export const objectUrl = (id: string) => `${SCAN_BASE}/object/${id}`;
export const addressUrl = (addr: string) => `${SCAN_BASE}/account/${addr}`;

export function shorten(id: string, head = 6, tail = 4): string {
  if (!id) return "";
  if (id.length <= head + tail + 2) return id;
  return `${id.slice(0, head)}…${id.slice(-tail)}`;
}
