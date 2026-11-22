import neo4j, { Driver } from "neo4j-driver";
import { getCreatorVetting, ensureHospitalitySeed, getRestaurant, DEFAULT_RESTAURANT_ID, MIN_FOLLOWERS, MAX_FOLLOWERS } from "./hospitalityGraph";
import type { VettedCreator } from "./hospitalityGraph";
import { youSearch, type WebSource } from "./youSearch";
import { tregCall, isTregConfigured } from "./tregClient";
import { normalizeHandle } from "./comps";

/**
 * Under-10-second live-web creator check (PM brief §1, §3): live You.com sources, what the graph
 * already knows, an optional quick Treg profile lookup, and FTC disclosure flags (#ad / #gifted)
 * read from the creator's real post captions. Every check is timed.
 */

const DISCLOSURE = /#ad\b|#gifted\b|#sponsored\b|#partner\b|#paidpartnership\b|paid partnership|\bgifted\b|\bcomped\b|#collab\b/i;
const PROFILE_TIMEOUT_MS = 6000;

export interface CheckFlag {
  level: "good" | "warn" | "bad";
  text: string;
}

export interface CreatorCheckResult {
  handle: string;
  elapsedMs: number;
  inGraph: boolean;
  creator: Pick<VettedCreator, "followers" | "localPct" | "localMetric" | "engagement" | "audienceHood" | "passed" | "reasons" | "scorecard" | "source" | "profileUrl" | "status"> | null;
  profile: { followers: number | null; category: string | null; bio: string | null; isBusiness: boolean } | null;
  disclosure: { postsChecked: number; disclosed: number; postsAtUs: number; atUsDisclosed: number };
  flags: CheckFlag[];
  sources: WebSource[];
  webError: string | null;
}

async function graphPosts(driver: Driver, at: string, rid: string) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.run(
      `MATCH (c:LocalCreator {handle: $at})-[:POSTED]->(p:Post)
       OPTIONAL MATCH (p)-[:AT]->(v:Place)
       RETURN p.caption AS caption, v.id = $rid AS atUs`,
      { at, rid },
      { timeout: 8000 }
    );
    return res.records.map((r) => ({ caption: String(r.get("caption") ?? ""), atUs: Boolean(r.get("atUs")) }));
  } finally {
    await session.close();
  }
}

async function recordCheck(driver: Driver, at: string, elapsedMs: number, sources: WebSource[]) {
  const session = driver.session();
  try {
    await session.executeWrite((tx) =>
      tx.run(
        `MATCH (c:LocalCreator {handle: $at})
         SET c.last_check_at = datetime(), c.last_check_ms = $ms
         WITH c
         UNWIND $sources AS s
         MERGE (w:WebSource {url: s.url})
         SET w.title = s.title, w.name = s.domain, w.domain = s.domain, w.via = 'you.com'
         MERGE (c)-[m:MENTIONED_IN]->(w)
         SET m.checked_at = datetime()`,
        { at, ms: elapsedMs, sources: sources.slice(0, 6).map((s) => ({ url: s.url, title: s.title, domain: s.domain })) }
      )
    );
  } finally {
    await session.close();
  }
}

export async function checkCreator(driver: Driver, rawHandle: string, rid = DEFAULT_RESTAURANT_ID): Promise<CreatorCheckResult | { error: string }> {
  const t0 = Date.now();
  const handle = normalizeHandle(rawHandle);
  if (!handle) return { error: "Enter an Instagram handle, like @kochinyc." };
  const at = `@${handle}`;
  await ensureHospitalitySeed(driver, rid);
  const restaurant = await getRestaurant(driver, rid);

  // Everything runs in parallel; each part has its own time limit
  const [web, vetting, posts] = await Promise.all([
    youSearch(`"${handle}" instagram ${restaurant.city} food`, { count: 6 }),
    getCreatorVetting(driver, rid),
    graphPosts(driver, at, rid),
  ]);
  const known = vetting.find((c) => c.handle.toLowerCase() === at);

  let profile: CreatorCheckResult["profile"] = null;
  if (!known && isTregConfigured()) {
    try {
      const res = await tregCall("tikhub.instagram.user.profile", { username: handle }, { timeoutMs: PROFILE_TIMEOUT_MS });
      const u = res.data?.data?.data?.user;
      if (u) {
        profile = {
          followers: u.edge_followed_by?.count ?? null,
          category: u.category_name || u.business_category_name || null,
          bio: (u.biography ?? "").slice(0, 160) || null,
          isBusiness: Boolean(u.is_business_account),
        };
      }
    } catch {
      // Profile lookup is optional; the check still returns live web sources within the time budget
    }
  }

  const disclosed = posts.filter((p) => DISCLOSURE.test(p.caption)).length;
  const atUs = posts.filter((p) => p.atUs);
  const atUsDisclosed = atUs.filter((p) => DISCLOSURE.test(p.caption)).length;
  const webDisclosure = web.sources.filter((s) => DISCLOSURE.test(`${s.title} ${s.snippet}`)).length;

  const flags: CheckFlag[] = [];
  if (known) {
    flags.push(known.passed
      ? { level: "good", text: `Passes vetting (${MIN_FOLLOWERS / 1000}k–${MAX_FOLLOWERS / 1000}k followers, ≥70% local, no paid rival posts)` }
      : { level: "warn", text: `Doesn't pass vetting: ${known.reasons.join("; ")}` });
    flags.push({
      level: known.scorecard.overall >= 6.5 ? "good" : known.scorecard.overall >= 4 ? "warn" : "bad",
      text: `Scorecard ${known.scorecard.overall}/10 (${known.scorecard.verdict.replace(/-/g, " ")})`,
    });
    if (known.status === "discontinued") flags.push({ level: "bad", text: "Discontinued: no new comps" });
  } else if (profile) {
    const f = profile.followers;
    if (profile.isBusiness || (profile.category && /restaurant|caf|bakery|bar\b|food & beverage/i.test(profile.category)))
      flags.push({ level: "bad", text: `Looks like a business account (${profile.category ?? "business"}), not a creator` });
    if (f !== null && (f < MIN_FOLLOWERS || f > MAX_FOLLOWERS))
      flags.push({ level: "warn", text: `${f.toLocaleString()} followers: outside the ${MIN_FOLLOWERS / 1000}k–${MAX_FOLLOWERS / 1000}k range` });
    else if (f !== null) flags.push({ level: "good", text: `${f.toLocaleString()} followers: in range` });
    flags.push({ level: "warn", text: "Not in the graph yet: run a Treg scan to measure local reach and rival ties" });
  } else {
    flags.push({ level: "warn", text: "Not in the graph yet, and no profile found" });
  }

  if (posts.length) {
    if (atUs.length && atUsDisclosed < atUs.length)
      flags.push({ level: "warn", text: `${atUs.length - atUsDisclosed} of ${atUs.length} posts from ${restaurant.name} have no #ad/#gifted tag. Required if the visit was comped.` });
    else if (atUs.length) flags.push({ level: "good", text: `Posts from ${restaurant.name} carry a disclosure tag` });
    if (disclosed) flags.push({ level: "good", text: `Uses disclosure tags (${disclosed} of ${posts.length} recent posts)` });
  }
  if (webDisclosure) flags.push({ level: "good", text: `${webDisclosure} web source${webDisclosure === 1 ? "" : "s"} mention sponsored or gifted work` });
  if (web.live && web.sources.length === 0) flags.push({ level: "warn", text: "Little web footprint beyond Instagram" });
  if (!web.live) flags.push({ level: "warn", text: `Live web check unavailable: ${web.error}` });

  const elapsedMs = Date.now() - t0;
  if (known && web.live) {
    try {
      await recordCheck(driver, at, elapsedMs, web.sources);
    } catch {
      // Recording is best-effort
    }
  }

  return {
    handle: at,
    elapsedMs,
    inGraph: Boolean(known),
    creator: known
      ? {
          followers: known.followers, localPct: known.localPct, localMetric: known.localMetric, engagement: known.engagement,
          audienceHood: known.audienceHood, passed: known.passed, reasons: known.reasons, scorecard: known.scorecard,
          source: known.source, profileUrl: known.profileUrl, status: known.status,
        }
      : null,
    profile,
    disclosure: { postsChecked: posts.length, disclosed, postsAtUs: atUs.length, atUsDisclosed },
    flags,
    sources: web.sources,
    webError: web.live ? null : web.error ?? null,
  };
}
