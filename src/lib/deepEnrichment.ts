import neo4j, { Driver } from "neo4j-driver";
import { tregCall } from "./tregClient";
import { youSearch } from "./youSearch";
import { KOCHI } from "./restaurants/kochi";
import { ensureHospitalitySeed, getRestaurant, DEFAULT_RESTAURANT_ID } from "./hospitalityGraph";

/**
 * Deep enrichment: real signals from Treg and You.com written into the Neo4j graph as nodes and
 * relationships, so GraphRAG queries can traverse them.
 *
 *   1. Trend signals   Google Trends (52 weeks) + TikTok hashtag stats   → FoodTrend velocity/stage,
 *                      (FoodTrend)-[:TRACKED_AS]->(Hashtag {tiktok_views, tiktok_videos})
 *   2. Busyness        Google Maps popular times for the restaurant and rivals
 *                      → (Place)-[:BUSY {score}]->(TimeSlot {day, hour})
 *   3. Hashtags        #tags and @mentions in stored post captions (free)
 *                      → (Post)-[:TAGGED]->(Hashtag), (Post)-[:MENTIONS]->(Account)-[:IS]->(Place)
 *                      (Post)-[:MENTIONS_TREND]->(FoodTrend) when a caption names a tracked trend
 *   4. Press           You.com coverage of the restaurant and each rival → (Place)-[:COVERED_BY]->(WebSource)
 */

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
/** Dinner service hours tracked as TimeSlots (4 PM – 10 PM). */
const SERVICE_HOURS = [16, 17, 18, 19, 20, 21, 22];

async function write(driver: Driver, cypher: string, params: Record<string, unknown>) {
  const session = driver.session();
  try {
    await session.executeWrite((tx) => tx.run(cypher, params), { timeout: 20000 });
  } finally {
    await session.close();
  }
}

async function read(driver: Driver, cypher: string, params: Record<string, unknown> = {}) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.run(cypher, params, { timeout: 12000 });
    return res.records.map((r) => r.toObject() as any);
  } finally {
    await session.close();
  }
}

// ---------------------------------------------------------------------------
// 1. Trend signals
// ---------------------------------------------------------------------------

export interface TrendSignalResult {
  trend: string;
  keyword: string;
  velocityPct: number | null;
  level: number | null;
  lowResolution?: boolean;
  stage: string | null;
  tiktokViews: number | null;
  tiktokVideos: number | null;
  error?: string;
}

/**
 * Last 4 complete weeks vs the 12 weeks before them, on Google's 0–100 interest scale.
 * The final point is the current, partial week (it often reads as a spurious 100), so it is dropped.
 */
export function velocityFrom(rawSeries: number[]) {
  const series = rawSeries.slice(0, -1);
  const peak = series.length ? Math.max(...series) : 0;
  if (series.length < 16 || peak === 0) return { velocityPct: null, level: null, lowResolution: true };
  const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const recent = mean(series.slice(-4));
  const prior = mean(series.slice(-16, -4));
  const velocityPct = prior > 0 ? Math.round((recent / prior - 1) * 100) : recent > 0 ? 100 : 0;
  // Level relative to the peak of the complete weeks (Google scales each series to its own peak,
  // and a spike in the partial week compresses everything else). Under 10 points of range the
  // series is too coarse to read small changes, so it is flagged.
  return { velocityPct, level: Math.round((recent / peak) * 100), lowResolution: peak < 10 };
}

export function stageFrom(
  velocityPct: number | null,
  level: number | null,
  lowResolution = false
): "Emerging" | "Accelerating" | "Mainstream" | "Saturated" | "Niche" | null {
  if (velocityPct === null || level === null) return null;
  if (velocityPct >= 25) return level < 35 ? "Emerging" : "Accelerating";
  if (velocityPct <= -25) return "Saturated";
  // Steady interest: a series that never clears 10 on Google's scale is low search volume (a niche);
  // otherwise steady interest is mainstream
  return lowResolution || level < 20 ? "Niche" : "Mainstream";
}

export async function enrichTrendSignals(driver: Driver) {
  let costMicro = 0;
  const results: TrendSignalResult[] = await Promise.all(
    KOCHI.trends.map(async (t: any) => {
      const out: TrendSignalResult = { trend: t.name, keyword: t.keyword, velocityPct: null, level: null, stage: null, tiktokViews: null, tiktokVideos: null };
      const [trends, tiktok] = await Promise.allSettled([
        // One keyword per call, so each series is normalised to its own peak
        tregCall("treg.google.keywords.trends", {}, { body: { keywords: [t.keyword], country: "us" }, maxCostUsd: 0.02, timeoutMs: 30000 }),
        tregCall("tikhub.tiktok.hashtag.detail", { tag_name: t.hashtag }, { timeoutMs: 20000 }),
      ]);
      let series: number[] = [];
      let weeks: string[] = [];
      if (trends.status === "fulfilled") {
        costMicro += trends.value.costMicro;
        const pts: any[] = trends.value.data?.output?.series?.[0]?.data ?? [];
        series = pts.map((p) => Number(p.values?.[0] ?? 0));
        weeks = pts.map((p) => String(p.date_from ?? ""));
        Object.assign(out, velocityFrom(series));
        out.stage = stageFrom(out.velocityPct, out.level, out.lowResolution);
      } else out.error = `trends: ${trends.reason?.message ?? trends.reason}`;
      if (tiktok.status === "fulfilled") {
        costMicro += tiktok.value.costMicro;
        const d = tiktok.value.data?.data ?? {};
        const stats = d.statsV2 ?? d.stats ?? d.challengeInfo?.statsV2 ?? {};
        out.tiktokViews = stats.viewCount !== undefined ? Number(stats.viewCount) : null;
        out.tiktokVideos = stats.videoCount !== undefined ? Number(stats.videoCount) : null;
      }

      await write(
        driver,
        `MATCH (ft:FoodTrend {id: $id})
         SET ft.search_keyword = $keyword, ft.search_series = $series, ft.search_weeks = $weeks,
             ft.signals_at = datetime(), ft.signals_source = 'Google Trends + TikTok via Treg'
         SET ft.signal_low_resolution = $lowRes
         FOREACH (_ IN CASE WHEN $velocity IS NULL THEN [] ELSE [1] END |
           SET ft.velocity_pct = $velocity, ft.search_level = $level, ft.stage = $stage, ft.illustrative = false)
         MERGE (h:Hashtag {name: $hashtag})
         SET h.tiktok_views = $views, h.tiktok_videos = $videos, h.tiktok_checked_at = datetime()
         MERGE (ft)-[:TRACKED_AS]->(h)`,
        {
          id: t.id, keyword: t.keyword, series, weeks, velocity: out.velocityPct, level: out.level, stage: out.stage,
          lowRes: Boolean(out.lowResolution),
          hashtag: t.hashtag, views: out.tiktokViews, videos: out.tiktokVideos,
        }
      );
      return out;
    })
  );
  return { results, costUsd: costMicro / 1e6 };
}

// ---------------------------------------------------------------------------
// 2. Busyness (Google Maps popular times)
// ---------------------------------------------------------------------------

const toHour = (t: string) => {
  const m = /^(\d{1,2})\s*(AM|PM)$/i.exec(t.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[2].toUpperCase() === "PM") h += 12;
  return h;
};

export async function enrichBusyness(driver: Driver, rid = DEFAULT_RESTAURANT_ID) {
  const places: { id: string; name: string; placeId: string }[] = (
    await read(
      driver,
      `MATCH (r:Restaurant {id: $rid})-[:IN]->(home:Neighborhood)
       OPTIONAL MATCH (c:Competitor)-[:IN]->(home)
       WITH r, collect(c) AS comps
       UNWIND [r] + comps AS p
       WITH p WHERE p IS NOT NULL AND coalesce(p.google_place_id, replace(p.id, 'gmaps-', '')) IS NOT NULL
       RETURN p.id AS id, p.name AS name, coalesce(p.google_place_id, replace(p.id, 'gmaps-', '')) AS placeId`,
      { rid }
    )
  ).filter((p) => p.placeId && !String(p.placeId).startsWith("rest-"));

  let costMicro = 0;
  const results = await Promise.all(
    places.map(async (p) => {
      try {
        const res = await tregCall("litescrape.google.maps.popular_times", { place_id: p.placeId, timeout: "40" }, { timeoutMs: 45000 });
        costMicro += res.costMicro;
        const graph = res.data?.popular_times?.graph_results ?? {};
        const slots: { day: string; hour: number; score: number }[] = [];
        for (const day of DAYS) {
          for (const pt of (graph[day] ?? []) as any[]) {
            const hour = toHour(String(pt.time ?? ""));
            if (hour !== null && SERVICE_HOURS.includes(hour)) slots.push({ day, hour, score: Number(pt.busyness_score ?? 0) });
          }
        }
        if (slots.length) {
          await write(
            driver,
            `MATCH (pl:Place {id: $id})
             OPTIONAL MATCH (pl)-[old:BUSY]->(:TimeSlot) DELETE old
             WITH pl
             UNWIND $slots AS s
             MERGE (t:TimeSlot {id: s.day + '-' + toString(s.hour)})
             SET t.day = s.day, t.hour = s.hour, t.name = s.day + ' ' + toString(s.hour) + ':00'
             MERGE (pl)-[b:BUSY]->(t)
             SET b.score = s.score
             SET pl.busyness_at = datetime(), pl.time_spent = $timeSpent`,
            { id: p.id, slots, timeSpent: res.data?.popular_times?.live_hash?.time_spent ?? null }
          );
        }
        return { place: p.name, slots: slots.length };
      } catch (e: any) {
        return { place: p.name, slots: 0, error: e?.message ?? String(e) };
      }
    })
  );

  // Kochi's quietest dinner slots (6–9 PM) become its data-backed slow shifts
  const quiet = await read(
    driver,
    `MATCH (r:Restaurant {id: $rid})-[b:BUSY]->(t:TimeSlot)
     WHERE t.hour >= 18 AND t.hour <= 21 AND b.score > 0
     RETURN t.day AS day, t.hour AS hour, b.score AS score
     ORDER BY b.score ASC LIMIT 3`,
    { rid }
  );
  const label = (d: string, h: number) => `${d[0].toUpperCase()}${d.slice(1)} ${h > 12 ? h - 12 : h} PM`;
  const slowShifts = quiet.map((q: any) => label(q.day, neo4j.isInt(q.hour) ? q.hour.toNumber() : q.hour));
  if (slowShifts.length) {
    await write(driver, `MATCH (r:Restaurant {id: $rid}) SET r.slow_shifts_live = $s, r.slow_shifts_source = 'Google Maps popular times via Treg'`, { rid, s: slowShifts });
  }
  return { results, slowShifts, costUsd: costMicro / 1e6 };
}

// ---------------------------------------------------------------------------
// 3. Hashtags and mentions from stored captions (no API cost)
// ---------------------------------------------------------------------------

export async function enrichHashtags(driver: Driver) {
  const posts = await read(driver, `MATCH (p:Post) WHERE p.caption IS NOT NULL RETURN p.id AS id, p.caption AS caption`);
  const venues = await read(
    driver,
    `MATCH (v) WHERE (v:Restaurant OR v:Competitor) RETURN v.id AS id, toLower(coalesce(v.instagram, '')) AS ig, toLower(v.name) AS name`
  );
  const rows = posts.map((p: any) => {
    const caption = String(p.caption);
    // Letters (incl. Korean/accented), digits and underscores
    const tags = Array.from(new Set((caption.match(/#[A-Za-z0-9_À-￿]{2,40}/g) ?? []).map((t) => t.slice(1).toLowerCase()))).slice(0, 15);
    const mentions = Array.from(new Set((caption.match(/@[a-z0-9._]{2,30}/gi) ?? []).map((m) => m.slice(1).toLowerCase().replace(/\.$/, "")))).slice(0, 10);
    return { id: p.id, tags, mentions };
  });
  const accountToVenue: Record<string, string> = {};
  for (const v of venues) if (v.ig) accountToVenue[v.ig] = v.id;

  await write(
    driver,
    `UNWIND $rows AS row
     MATCH (p:Post {id: row.id})
     FOREACH (t IN row.tags | MERGE (h:Hashtag {name: t}) MERGE (p)-[:TAGGED]->(h))
     FOREACH (m IN row.mentions | MERGE (a:Account {handle: m}) SET a.name = '@' + m MERGE (p)-[:MENTIONS]->(a))`,
    { rows }
  );
  await write(
    driver,
    `UNWIND keys($map) AS handle
     MATCH (a:Account {handle: handle}), (v:Place {id: $map[handle]})
     MERGE (a)-[:IS]->(v)`,
    { map: accountToVenue }
  );
  // Captions that name a tracked trend ("strawberry matcha", "perilla kimchi") link the post to it
  await write(
    driver,
    `MATCH (t:FoodTrend) WHERE t.search_keyword IS NOT NULL
     WITH t, toLower(t.search_keyword) AS kw, [(t)-[:TRACKED_AS]->(h:Hashtag) | h.name] AS tags
     MATCH (p:Post) WHERE p.caption IS NOT NULL
       AND (toLower(p.caption) CONTAINS kw OR any(tag IN tags WHERE toLower(p.caption) CONTAINS '#' + tag))
     MERGE (p)-[:MENTIONS_TREND]->(t)`,
    {}
  );
  const trendMentions = await read(driver, `MATCH (:Post)-[m:MENTIONS_TREND]->(:FoodTrend) RETURN count(m) AS n`);
  const tagCount = new Set(rows.flatMap((r: any) => r.tags)).size;
  const mentionCount = new Set(rows.flatMap((r: any) => r.mentions)).size;
  const n = trendMentions[0]?.n;
  return { postsRead: rows.length, hashtags: tagCount, accounts: mentionCount, trendMentions: neo4j.isInt(n) ? n.toNumber() : n ?? 0, costUsd: 0 };
}

// ---------------------------------------------------------------------------
// 4. Press coverage (You.com)
// ---------------------------------------------------------------------------

export async function enrichPress(driver: Driver, rid = DEFAULT_RESTAURANT_ID) {
  const restaurant = await getRestaurant(driver, rid);
  const places = await read(
    driver,
    `MATCH (r:Restaurant {id: $rid})-[:IN]->(home:Neighborhood)
     OPTIONAL MATCH (c:Competitor)-[:IN]->(home)
     WITH r, collect(c) AS comps
     UNWIND [r] + comps AS p
     RETURN p.id AS id, p.name AS name`,
    { rid }
  );
  const results = await Promise.all(
    places.map(async (p: any) => {
      const res = await youSearch(`"${p.name}" ${restaurant.neighborhood} ${restaurant.city} restaurant review`, { freshness: "year", count: 5 });
      // Keep sources that actually mention the place by name
      const name = String(p.name).toLowerCase();
      const sources = res.sources.filter((s) => `${s.title} ${s.snippet}`.toLowerCase().includes(name.split(" ")[0]));
      if (sources.length) {
        await write(
          driver,
          `MATCH (pl:Place {id: $id})
           UNWIND $sources AS s
           MERGE (w:WebSource {url: s.url})
           SET w.title = s.title, w.name = s.domain, w.domain = s.domain, w.published_at = s.publishedAt, w.via = 'you.com'
           MERGE (pl)-[c:COVERED_BY]->(w)
           SET c.retrieved_at = datetime()`,
          { id: p.id, sources: sources.map((s) => ({ url: s.url, title: s.title, domain: s.domain, publishedAt: s.publishedAt ?? null })) }
        );
      }
      return { place: p.name, sources: sources.length, live: res.live, error: res.error };
    })
  );
  return { results, costUsd: 0 };
}

export async function runDeepEnrichment(driver: Driver, steps: string[], rid = DEFAULT_RESTAURANT_ID) {
  await ensureHospitalitySeed(driver, rid);
  const out: Record<string, unknown> = {};
  const t0 = Date.now();
  // Independent steps run in parallel
  const jobs: [string, Promise<unknown>][] = [];
  if (steps.includes("signals")) jobs.push(["signals", enrichTrendSignals(driver)]);
  if (steps.includes("busyness")) jobs.push(["busyness", enrichBusyness(driver, rid)]);
  if (steps.includes("hashtags")) jobs.push(["hashtags", enrichHashtags(driver)]);
  if (steps.includes("press")) jobs.push(["press", enrichPress(driver, rid)]);
  const settled = await Promise.allSettled(jobs.map(([, p]) => p));
  settled.forEach((r, i) => {
    out[jobs[i][0]] = r.status === "fulfilled" ? r.value : { error: (r.reason as any)?.message ?? String(r.reason) };
  });
  out.elapsedMs = Date.now() - t0;
  return out;
}
