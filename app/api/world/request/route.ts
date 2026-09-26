import { NextResponse } from "next/server";
import { WORLD_ACTION } from "@/lib/config";
import { buildRpContext, rpConfigured } from "@/lib/world/rp";

// Returns a freshly signed rp_context for the auction-entry action so the
// browser can open the World ID request widget. No secrets are returned — only
// the RP's signature over a short-lived nonce.
export const runtime = "nodejs";

export async function GET() {
  try {
    if (!rpConfigured()) {
      return NextResponse.json(
        { ok: false, error: "World RP not configured on the server." },
        { status: 500 },
      );
    }
    const rpContext = buildRpContext(WORLD_ACTION);
    return NextResponse.json({ ok: true, rpContext });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Server error." },
      { status: 500 },
    );
  }
}
