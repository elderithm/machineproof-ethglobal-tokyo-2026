import { NextResponse } from "next/server";
import { adminConfigured, releaseMilestone } from "@/lib/sui/admin";

export const runtime = "nodejs";

type Body = { settlementId?: string; milestoneIndex?: number };

export async function POST(req: Request) {
  try {
    const { settlementId, milestoneIndex } = (await req.json()) as Body;
    if (!settlementId || milestoneIndex == null) {
      return NextResponse.json(
        { ok: false, error: "Missing settlementId or milestoneIndex." },
        { status: 400 },
      );
    }
    if (!adminConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Server admin signer is not configured." },
        { status: 500 },
      );
    }
    const { digest } = await releaseMilestone(
      settlementId,
      Number(milestoneIndex),
    );
    return NextResponse.json({ ok: true, digest });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Server error." },
      { status: 500 },
    );
  }
}
