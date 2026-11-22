/**
 * You.com Search connector for BonAppTea.
 *
 * Calls the You.com Web Search API (POST https://ydc-index.io/v1/search) server-side with
 * YOU_API_KEY. Results are never faked: with no key or on an error, the caller gets an empty list
 * and `live: false` with the reason, and the UI says so.
 */

export type Freshness = "day" | "week" | "month" | "year";

export interface WebSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  publishedAt?: string;
  faviconUrl?: string;
  thumbnailUrl?: string;
}

export interface YouSearchResponse {
  query: string;
  live: boolean;
  sources: WebSource[];
  error?: string;
}

const ENDPOINT = "https://ydc-index.io/v1/search";
const CACHE_TTL_MS = 15 * 60 * 1000;
// Live search must never hold a page hostage: give up and say so after this long
const TIMEOUT_MS = 8000;
const cache = new Map<string, { at: number; value: YouSearchResponse }>();

export function isYouConfigured(): boolean {
  return Boolean(process.env.YOU_API_KEY);
}

export async function youSearch(
  query: string,
  opts: { freshness?: Freshness; count?: number } = {}
): Promise<YouSearchResponse> {
  const key = process.env.YOU_API_KEY;
  if (!key) return { query, live: false, sources: [], error: "YOU_API_KEY is not set" };

  const body: Record<string, unknown> = { query, count: opts.count ?? 6 };
  if (opts.freshness) body.freshness = opts.freshness;

  const cacheKey = JSON.stringify(body);
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "X-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      return { query, live: false, sources: [], error: `You.com search returned HTTP ${res.status}` };
    }
    const data = await res.json();
    const web: any[] = data?.results?.web ?? [];
    const news: any[] = data?.results?.news ?? [];
    const sources = dedupe([...web, ...news].map(toSource)).slice(0, opts.count ?? 6);
    const value: YouSearchResponse = { query, live: true, sources };
    cache.set(cacheKey, { at: Date.now(), value });
    return value;
  } catch (error: any) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    return { query, live: false, sources: [], error: timedOut ? `You.com didn't answer within ${TIMEOUT_MS / 1000}s` : error?.message || "You.com search failed" };
  }
}

function toSource(hit: any): WebSource {
  const url: string = hit.url || "";
  let domain = "";
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  const snippets: string[] = Array.isArray(hit.snippets) ? hit.snippets : [];
  return {
    title: hit.title || domain || "Untitled",
    url,
    domain,
    snippet: (snippets[0] || hit.description || "").trim(),
    publishedAt: hit.page_age || hit.age || undefined,
    faviconUrl: hit.favicon_url || undefined,
    thumbnailUrl: hit.thumbnail_url || undefined,
  };
}

function dedupe(sources: WebSource[]): WebSource[] {
  // The same story is often syndicated under several URLs; keep the first of each title.
  const seen = new Set<string>();
  return sources.filter((s) => {
    const titleKey = s.title.toLowerCase().replace(/\s*[|\-–].*$/, "").trim();
    if (!s.url || seen.has(s.url) || seen.has(titleKey)) return false;
    seen.add(s.url);
    seen.add(titleKey);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Restaurant-specific searches
// ---------------------------------------------------------------------------

/** What the food internet in this city is talking about this week. */
export function cityFoodPulse(city: string) {
  return youSearch(`trending dishes ${city} restaurants`, { freshness: "week", count: 6 });
}

/** Live web evidence that a specific food trend is real and current. */
export function trendEvidence(trend: string) {
  return youSearch(`${trend} trend restaurants TikTok`, { freshness: "month", count: 4 });
}

/** Recent restaurant coverage for a neighborhood (openings, closings, reviews, complaints). */
export async function neighborhoodBuzz(neighborhood: string, city: string) {
  const res = await youSearch(`${neighborhood} ${city} restaurant openings reviews`, { freshness: "month", count: 10 });
  // Keep food coverage; drop encyclopedia pages and same-name TV shows (e.g. "Hell's Kitchen").
  const FOOD = /restaurant|dining|food|eat|menu|chef|bar\b|opening|open(s|ed)?\b|brunch|dinner/i;
  const OFF_TOPIC = /wikipedia|ramsay|recap|episode|season \d|contestant/i;
  const sources = res.sources
    .filter((s) => FOOD.test(`${s.title} ${s.snippet}`) && !OFF_TOPIC.test(`${s.title} ${s.snippet} ${s.domain}`))
    .slice(0, 6);
  return { ...res, sources };
}

/** Video references for filming a dish in a trending format. */
export function filmingReferences(dish: string, trend: string) {
  return youSearch(`${trend} ${dish} viral video restaurant`, { freshness: "month", count: 4 });
}

/** Sources for checking a marketing or menu claim before it goes on a post. */
export function claimEvidence(claim: string) {
  return youSearch(claim, { count: 5 });
}
