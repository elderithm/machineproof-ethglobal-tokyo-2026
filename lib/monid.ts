// SERVER-ONLY. Monid integration — the honest role of Monid here is a runtime
// TOOL ROUTER: it lets our assistant discover (and optionally run) external
// data tools (market comps, manufacturer/recall lookups, web data). Monid does
// NOT analyze content — our own LLM does the reasoning. Endpoints/shapes pinned
// to the documented Monid REST API (POST /v1/discover, /v1/run; Bearer auth).

import "server-only";

const BASE = "https://api.monid.ai/v1";

export type MonidTool = {
  provider: string;
  providerName: string;
  endpoint: string;
  description: string;
  price: string;
};

export function monidConfigured(): boolean {
  return Boolean(process.env.MONID_API_KEY);
}

async function monidPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.MONID_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Monid ${path} → ${res.status}`);
  return res.json();
}

/** Discover external tools relevant to a natural-language task. */
export async function monidDiscover(
  query: string,
  limit = 5,
): Promise<MonidTool[]> {
  const data = (await monidPost("/discover", { query, limit })) as {
    results?: Array<{
      provider?: string;
      providerName?: string;
      endpoint?: string;
      description?: string;
      price?: { type?: string; amount?: number; currency?: string };
    }>;
  };
  return (data.results ?? []).map((r) => ({
    provider: r.provider ?? "",
    providerName: r.providerName ?? r.provider ?? "",
    endpoint: r.endpoint ?? "",
    description: r.description ?? "",
    price: r.price
      ? `${r.price.amount} ${r.price.currency}/${r.price.type}`
      : "",
  }));
}

/** Run a discovered tool with an input matching its schema. */
export async function monidRun(
  provider: string,
  endpoint: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const data = (await monidPost("/run", { provider, endpoint, input })) as {
    output?: unknown;
  };
  return data.output ?? data;
}
