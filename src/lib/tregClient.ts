/**
 * Minimal Treg client: calls a catalog tool by id over HTTP with the team token (TREG_API_KEY).
 * Treg injects the provider credential server-side and bills the team balance per call.
 */

export interface TregResult<T = any> {
  data: T;
  costMicro: number;
  callId: string | null;
}

export class TregError extends Error {
  constructor(message: string, public status: number, public tregRefused: boolean) {
    super(message);
  }
}

export function isTregConfigured(): boolean {
  return Boolean(process.env.TREG_API_KEY);
}

export async function tregCall<T = any>(toolId: string, query: Record<string, string>, timeoutMs = 45000): Promise<TregResult<T>> {
  const token = process.env.TREG_API_KEY;
  if (!token) throw new TregError("TREG_API_KEY is not set", 0, true);

  const url = `https://treg.to/call/${encodeURIComponent(toolId)}?${new URLSearchParams(query)}`;
  const res = await fetch(url, {
    headers: { "X-Treg-Token": token },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const costMicro = Number(res.headers.get("x-treg-cost-micro") ?? 0) || 0;
  const callId = res.headers.get("x-treg-call-id");
  const text = await res.text();
  if (!res.ok) {
    const refused = res.headers.get("x-treg-error") === "1";
    throw new TregError(`${toolId} failed (${res.status}${refused ? ", refused by Treg" : ""}): ${text.slice(0, 200)}`, res.status, refused);
  }
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new TregError(`${toolId} returned non-JSON`, res.status, false);
  }
  return { data, costMicro, callId };
}
