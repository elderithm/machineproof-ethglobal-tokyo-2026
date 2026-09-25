// Pure parsers that turn Sui object content (from getObject) into typed view
// models. Kept defensive because Move Option/Balance/vector fields can be
// serialized in more than one shape across RPC versions.

export const AUCTION_STATUS = {
  0: "CREATED",
  1: "OPEN",
  2: "CLOSED",
  3: "SETTLED",
  4: "CANCELLED",
} as const;

export type AuctionStatus =
  (typeof AUCTION_STATUS)[keyof typeof AUCTION_STATUS];

export type AuctionView = {
  machineAssetId: string;
  seller: string;
  reservePrice: bigint;
  minIncrement: bigint;
  startMs: number;
  endMs: number;
  statusCode: number;
  status: AuctionStatus;
  highestBid: bigint;
  highestBidder: string | null;
  finalized: boolean;
};

export type MilestoneView = {
  index: number;
  code: number;
  bps: number;
  released: boolean;
};

export type SettlementView = {
  auctionId: string;
  machineAssetId: string;
  winner: string;
  seller: string;
  amountLocked: bigint;
  releasedAmount: bigint;
  statusCode: number;
  completed: boolean;
  milestones: MilestoneView[];
};

type Fields = Record<string, unknown>;

function asBig(v: unknown): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(v);
  if (typeof v === "string" && v.length > 0) return BigInt(v);
  return 0n;
}

function asNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.length > 0) return Number(v);
  return 0;
}

/** Extract the inner value of a Move Option, tolerating several JSON shapes. */
function optionAddress(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return (v[0] as string) ?? null;
  if (typeof v === "object") {
    const o = v as Fields;
    const fields = (o.fields as Fields) ?? o;
    const vec = (fields.vec as unknown[]) ?? (o.vec as unknown[]);
    if (Array.isArray(vec)) return (vec[0] as string) ?? null;
  }
  return null;
}

/** Read a Balance<T> field's value. */
function balanceValue(v: unknown): bigint {
  if (v == null) return 0n;
  if (typeof v === "string" || typeof v === "number") return asBig(v);
  const o = v as Fields;
  if (o.value != null) return asBig(o.value);
  const fields = o.fields as Fields | undefined;
  if (fields?.value != null) return asBig(fields.value);
  return 0n;
}

export function parseAuction(fields: Fields): AuctionView {
  const statusCode = asNum(fields.status);
  return {
    machineAssetId: String(fields.machine_asset_id ?? ""),
    seller: String(fields.seller ?? ""),
    reservePrice: asBig(fields.reserve_price),
    minIncrement: asBig(fields.min_increment),
    startMs: asNum(fields.start_ms),
    endMs: asNum(fields.end_ms),
    statusCode,
    status:
      (AUCTION_STATUS as Record<number, AuctionStatus>)[statusCode] ??
      "CREATED",
    highestBid: asBig(fields.highest_bid),
    highestBidder: optionAddress(fields.highest_bidder),
    finalized: Boolean(fields.finalized),
  };
}

function milestoneFields(v: unknown): Fields {
  const o = (v as Fields) ?? {};
  return (o.fields as Fields) ?? o;
}

export function parseSettlement(fields: Fields): SettlementView {
  const rawMilestones = (fields.milestones as unknown[]) ?? [];
  const milestones: MilestoneView[] = rawMilestones.map((m, index) => {
    const mf = milestoneFields(m);
    return {
      index,
      code: asNum(mf.code),
      bps: asNum(mf.bps),
      released: Boolean(mf.released),
    };
  });
  const statusCode = asNum(fields.status);
  return {
    auctionId: String(fields.auction_id ?? ""),
    machineAssetId: String(fields.machine_asset_id ?? ""),
    winner: String(fields.winner ?? ""),
    seller: String(fields.seller ?? ""),
    amountLocked: balanceValue(fields.locked) || asBig(fields.amount_locked),
    releasedAmount: asBig(fields.released_amount),
    statusCode,
    completed: statusCode === 1,
    milestones,
  };
}

export const MILESTONE_LABELS: Record<number, string> = {
  1: "Auction won",
  2: "Inspection confirmed",
  3: "Shipped",
  4: "Buyer acceptance",
};
