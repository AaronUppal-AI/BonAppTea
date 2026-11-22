import type { Driver } from "neo4j-driver";
import { tregCall } from "./tregClient";
import { getRestaurant, ensureHospitalitySeed, DEFAULT_RESTAURANT_ID } from "./hospitalityGraph";

/**
 * Live creator discovery through Treg, written into the Neo4j graph.
 *
 * 1. Collect recent Instagram posts tagged at the restaurant's own location (warm leads), plus the
 *    restaurant's hashtag and the neighborhood's food hashtags.
 * 2. Look up each poster's profile; drop restaurants and other business accounts.
 * 3. Read each creator's recent posts for followers, engagement and where they post.
 * 4. MERGE them into Neo4j as LocalCreator nodes, so Creator Scout and Chef Pepper vet them
 *    with the same rules as every other creator.
 *
 * Instagram does not expose audience location publicly, so "local %" for live creators is the
 * share of their geo-tagged posts that are in the city (stored as local_metric = 'posting').
 */

const TOOLS = {
  hashtag: "scrapecreators.x.v1-instagram-search-hashtag",
  profile: "tikhub.instagram.user.profile",
  posts: "scrapecreators.instagram.user.posts",
};

export const SCAN_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const MAX_CANDIDATES = 8;
const LOCATION_POSTS = "tikhub.x.instagram-v1-fetch-location-posts";
// Cuisines a creator covers, inferred from their captions
const CUISINE_PATTERNS: Record<string, RegExp> = {
  Korean: /korean|k-?food|kbbq|bibimbap|kimchi|bulgogi|soju|tteok|banchan|gochujang/i,
  Desserts: /dessert|ice cream|gelato|pastry|pastries|cake|bakery|cookie/i,
  Japanese: /japanese|sushi|omakase|ramen|izakaya|yakitori/i,
  Italian: /italian|pasta|pizza|trattoria/i,
};
const norm = (s: string) => s.toLowerCase().replace(/[’'`]/g, "");
// Instagram location tags often carry coordinates but no city text; within this radius counts as local.
const LOCAL_RADIUS_KM = 25;
function kmBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(toRad(lat2 - lat1) / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}
const BUSINESS_CATEGORY = /restaurant|caf[eé]|coffee|bakery|\bbar\b|pub|pizza|food & beverage|grocery|shopping|retail|hotel|deli|brewery|winery|catering|local business|dessert shop/i;
const CITY_PATTERN = /new york|manhattan|brooklyn|queens|bronx|staten island|\bnyc\b/i;
// Restaurants often leave the Instagram category blank; their bios give them away.
const BUSINESS_BIO =
  /\b\d{1,5}\s+[\w.]+(\s[\w.]+)?\s(st|street|ave|avenue|blvd|rd|road|pl|place)\b|\b(mon|tue|wed|thu|fri|sat|sun)\w*\s?[-–]\s?(mon|tue|wed|thu|fri|sat|sun)|\b\d{1,2}(:\d\d)?\s?(am|pm)\b|open (daily|now|late)|order (online|now|here)|reservations?|delivery|takeout|catering|\bwe('|’)(re|ll)\b|\bour (menu|kitchen|restaurant|food)\b/i;
// Above this, likes are boosted, bought or from collab posts; not a real engagement rate.
const MAX_PLAUSIBLE_ENGAGEMENT = 40;

export interface DiscoveredCreator {
  handle: string;
  followers: number;
  engagement: number | null;
  localPct: number | null;
  geotagged: number;
  audienceHood: string;
  category: string | null;
  samplePostUrl: string | null;
  covers: string[];
  /** Found through a post tagged at the restaurant */
  postedFromUs: boolean;
}

export interface ScanResult {
  skipped: boolean;
  lastScanAt: string | null;
  nextScanAt: string | null;
  hashtags: string[];
  postsScanned: number;
  added: DiscoveredCreator[];
  businessesSkipped: { handle: string; category: string }[];
  failures: string[];
  costUsd: number;
}

export async function getLastScan(driver: Driver, rid = DEFAULT_RESTAURANT_ID) {
  const session = driver.session();
  try {
    const res = await session.run(
      `MATCH (r:Restaurant {id: $rid}) RETURN toString(r.last_creator_scan_at) AS at, r.last_creator_scan_cost AS cost`,
      { rid }
    );
    const at = res.records[0]?.get("at") as string | null;
    return { at: at ?? null, cost: (res.records[0]?.get("cost") as number | null) ?? null };
  } finally {
    await session.close();
  }
}

export async function discoverCreators(driver: Driver, opts: { rid?: string; force?: boolean } = {}): Promise<ScanResult> {
  const rid = opts.rid ?? DEFAULT_RESTAURANT_ID;
  await ensureHospitalitySeed(driver, rid);
  const restaurant = await getRestaurant(driver, rid);
  const slug = restaurant.neighborhood.toLowerCase().replace(/[^a-z]/g, "");
  const citySlug = restaurant.city === "New York" ? "nyc" : restaurant.city.toLowerCase().replace(/[^a-z]/g, "");
  const hashtags = [`${slug}food`, `${slug}eats`, restaurant.instagram ? restaurant.instagram : `${citySlug}foodie`];

  const last = await getLastScan(driver, rid);
  if (!opts.force && last.at && Date.now() - new Date(last.at).getTime() < SCAN_COOLDOWN_MS) {
    return {
      skipped: true,
      lastScanAt: last.at,
      nextScanAt: new Date(new Date(last.at).getTime() + SCAN_COOLDOWN_MS).toISOString(),
      hashtags,
      postsScanned: 0,
      added: [],
      businessesSkipped: [],
      failures: [],
      costUsd: 0,
    };
  }

  let costMicro = 0;
  const failures: string[] = [];

  // 1. Hashtag posts
  const tagResults = await Promise.allSettled(
    hashtags.map((hashtag) => tregCall(TOOLS.hashtag, { hashtag, date_posted: "last-month" }))
  );
  const posts: any[] = [];
  tagResults.forEach((r, i) => {
    if (r.status === "fulfilled") {
      costMicro += r.value.costMicro;
      posts.push(...(r.value.data?.posts ?? []));
    } else failures.push(`#${hashtags[i]}: ${r.reason?.message ?? r.reason}`);
  });

  // Posts tagged at the restaurant itself: these people already came in.
  const warmPosts: any[] = [];
  if (restaurant.instagramLocationId) {
    const locResults = await Promise.allSettled(
      ["recent", "ranked"].map((tab) => tregCall(LOCATION_POSTS, { location_id: restaurant.instagramLocationId!, tab }))
    );
    locResults.forEach((r, i) => {
      if (r.status === "fulfilled") {
        costMicro += r.value.costMicro;
        for (const e of r.value.data?.data?.edges ?? []) warmPosts.push(e.node ?? e);
      } else failures.push(`location posts (${i === 0 ? "recent" : "top"}): ${r.reason?.message ?? r.reason}`);
    });
  }

  // Rank posters: people who posted from the restaurant first, then by how often they show up, then likes.
  const byUser = new Map<string, { count: number; likes: number; url: string | null; warmPost: any | null }>();
  const bump = (username: string | undefined, likes: number, url: string | null, warmPost: any | null) => {
    if (!username || username.toLowerCase() === (restaurant.instagram ?? "").toLowerCase()) return;
    const prev = byUser.get(username) ?? { count: 0, likes: 0, url: null, warmPost: null };
    byUser.set(username, { count: prev.count + 1, likes: prev.likes + likes, url: prev.url ?? url, warmPost: prev.warmPost ?? warmPost });
  };
  for (const p of posts) {
    bump(p?.owner?.username, Number(p.like_count) || 0, p.url ?? (p.shortcode ? `https://www.instagram.com/p/${p.shortcode}/` : null), null);
  }
  for (const p of warmPosts) {
    bump(p?.user?.username, Number(p.like_count) || 0, p.code ? `https://www.instagram.com/p/${p.code}/` : null, p);
  }
  // Spend lookups on new accounts: skip anyone scanned (or flagged as a business) in the last week.
  const recentlySeen = await listRecentlyScanned(driver);
  const candidates = Array.from(byUser.entries())
    .filter(([username]) => !recentlySeen.has(username.toLowerCase()))
    .sort((a, b) => Number(!!b[1].warmPost) - Number(!!a[1].warmPost) || b[1].count - a[1].count || b[1].likes - a[1].likes)
    .slice(0, MAX_CANDIDATES);

  const knownHoods = await listNeighborhoods(driver);
  const knownVenues = await listVenues(driver);
  const added: DiscoveredCreator[] = [];
  const postsByCreator = new Map<string, PostRow[]>();
  const businessesSkipped: { handle: string; category: string }[] = [];

  // 2 + 3. Profile, then recent posts for non-business accounts.
  await Promise.all(
    candidates.map(async ([username, seen]) => {
      try {
        const profile = await tregCall(TOOLS.profile, { username });
        costMicro += profile.costMicro;
        const user = profile.data?.data?.data?.user ?? {};
        const category: string | null = user.category_name ?? user.business_category_name ?? null;
        if (user.is_private) return;
        const bio: string = user.biography ?? "";
        if (user.is_business_account || (category && BUSINESS_CATEGORY.test(category)) || BUSINESS_BIO.test(bio)) {
          businessesSkipped.push({ handle: `@${username}`, category: category || "Business (from bio)" });
          return;
        }

        const recent = await tregCall(TOOLS.posts, { handle: username });
        costMicro += recent.costMicro;
        // Only the creator's own posts: collab and tagged posts carry someone else's audience.
        const items: any[] = (recent.data?.items ?? []).filter(
          (it: any) => !it?.user?.username || it.user.username.toLowerCase() === username.toLowerCase()
        );
        const followers = Number(recent.data?.user?.follower_count ?? user.edge_followed_by?.count ?? 0);

        // Median, not mean: one viral reel shouldn't define a creator's engagement.
        const rates = items
          .filter((it) => typeof it.like_count === "number")
          .map((it) => (it.like_count + (it.comment_count ?? 0)) / Math.max(followers, 1))
          .sort((a, b) => a - b);
        const median = rates.length ? rates[Math.floor(rates.length / 2)] : null;
        const rawEngagement = followers > 0 && median !== null ? Math.round(median * 1000) / 10 : null;
        const engagement = rawEngagement !== null && rawEngagement <= MAX_PLAUSIBLE_ENGAGEMENT ? rawEngagement : null;

        const located = items.map((it) => it.location).filter((l) => l && typeof l === "object");
        const isLocal = (l: any) => {
          const lat = Number(l.lat ?? l.latitude);
          const lng = Number(l.lng ?? l.longitude);
          if (restaurant.lat !== undefined && restaurant.lng !== undefined && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
            return kmBetween(restaurant.lat, restaurant.lng, lat, lng) <= LOCAL_RADIUS_KM;
          }
          const text = `${l.city ?? ""} ${l.name ?? ""}`;
          return CITY_PATTERN.test(text) || knownHoods.some((h) => norm(text).includes(norm(h)));
        };
        const inCity = located.filter(isLocal).length;
        const localPct = located.length >= 3 ? Math.round((inCity / located.length) * 100) : null;

        // Neighborhood they post from most, among the graph's known neighborhoods.
        const hoodCounts = new Map<string, number>();
        for (const l of located) {
          const text = norm(`${l.city ?? ""} ${l.name ?? ""}`);
          for (const hood of knownHoods) if (text.includes(norm(hood))) hoodCounts.set(hood, (hoodCounts.get(hood) ?? 0) + 1);
        }
        const topHood = Array.from(hoodCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        const audienceHood = topHood ?? (inCity > 0 ? `Elsewhere in ${restaurant.city}` : "Outside the city");

        // Every post becomes a node; tagged locations become Places linked into the neighborhood graph.
        const toRow = (it: any): PostRow => {
            const code = it.code ?? it.shortcode ?? String(it.pk ?? it.id);
            const caption = typeof it.caption === "string" ? it.caption : it.caption?.text ?? "";
            const loc = it.location && typeof it.location === "object" ? it.location : null;
            const locText = loc ? `${loc.city ?? ""} ${loc.name ?? ""}` : "";
            const hood = loc ? knownHoods.find((h) => norm(locText).includes(norm(h))) ?? null : null;
            const venueId = loc ? matchVenue(knownVenues, loc) : null;
            return {
              id: `ig-post-${code}`,
              takenAt: typeof it.taken_at === "number" ? it.taken_at : null,
              sponsored: Boolean(it.is_paid_partnership),
              likes: typeof it.like_count === "number" ? it.like_count : null,
              comments: typeof it.comment_count === "number" ? it.comment_count : null,
              caption: caption.slice(0, 200),
              url: `https://www.instagram.com/p/${code}/`,
              venueId,
              place: loc && !venueId
                ? { id: `ig-loc-${loc.pk ?? loc.facebook_places_id ?? loc.name}`, name: String(loc.name ?? "Unknown place"), city: loc.city ?? null, hood, inCity: hood !== null || isLocal(loc) }
                : null,
            };
        };
        const rows = items.slice(0, 12).map(toRow);
        // The post that brought them in from the restaurant's location tag is always linked to the restaurant.
        if (seen.warmPost) {
          const warm = toRow(seen.warmPost);
          warm.venueId = restaurant.id;
          warm.place = null;
          const i = rows.findIndex((r) => r.id === warm.id);
          if (i >= 0) rows[i] = { ...rows[i], venueId: restaurant.id, place: null };
          else rows.push(warm);
        }
        postsByCreator.set(`ig-${username}`, rows);

        const captions = [...items, ...(seen.warmPost ? [seen.warmPost] : [])]
          .map((it) => (typeof it.caption === "string" ? it.caption : it.caption?.text ?? ""))
          .join(" ");
        const covers = Object.entries(CUISINE_PATTERNS)
          .filter(([, re]) => re.test(captions))
          .map(([cuisine]) => cuisine);

        added.push({
          covers,
          postedFromUs: Boolean(seen.warmPost),
          handle: `@${username}`,
          followers,
          engagement,
          localPct,
          geotagged: located.length,
          audienceHood,
          category,
          samplePostUrl: seen.url,
        });
      } catch (e: any) {
        failures.push(`@${username}: ${e?.message ?? e}`);
      }
    })
  );

  // 4. Write into the graph.
  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      // Accounts now recognized as businesses are restaurants, not creators.
      if (businessesSkipped.length) {
        const ids = businessesSkipped.map((b) => `ig-${b.handle.slice(1)}`);
        await tx.run(
          `MATCH (c:LocalCreator) WHERE c.source = 'treg' AND c.id IN $ids
           OPTIONAL MATCH (c)-[:POSTED]->(p:Post)
           DETACH DELETE p, c`,
          { ids }
        );
        // Remember them so later scans don't pay to look them up again.
        await tx.run(
          `UNWIND $ids AS id MERGE (b:ScannedBusiness {id: id}) SET b.scanned_at = datetime()`,
          { ids }
        );
      }
      for (const c of added) {
        const id = `ig-${c.handle.slice(1)}`;
        const posts = postsByCreator.get(id) ?? [];
        // Local reach, home neighborhood and rival sponsorships are derived from these posts at query time.
        await tx.run(
          `MERGE (c:LocalCreator {id: $id})
           SET c.handle = $handle, c.followers = $followers, c.engagement_rate = $engagement,
               c.category = $category, c.sample_post_url = $samplePostUrl, c.source = 'treg',
               c.profile_url = 'https://www.instagram.com/' + substring($handle, 1) + '/',
               c.discovered_at = datetime()
           REMOVE c.local_audience_pct
           WITH c
           UNWIND $posts AS p
           MERGE (post:Post {id: p.id})
           SET post.posted_at = CASE WHEN p.takenAt IS NULL THEN NULL ELSE datetime({epochSeconds: toInteger(p.takenAt)}) END,
               post.sponsored = p.sponsored, post.likes = p.likes, post.comments = p.comments,
               post.caption = p.caption, post.url = p.url, post.source = 'treg'
           MERGE (c)-[:POSTED]->(post)`,
          { id, ...c, posts }
        );
        await tx.run(
          `MATCH (c:LocalCreator {id: $id})
           UNWIND $covers AS cu
           MATCH (k:Cuisine {name: cu})
           MERGE (c)-[:COVERS]->(k)`,
          { id, covers: c.covers }
        );
        // Posts tagged at a venue already in the graph (a rival, or us)
        await tx.run(
          `UNWIND $posts AS p
           MATCH (post:Post {id: p.id}), (v:Place {id: p.venueId})
           MERGE (post)-[:AT]->(v)`,
          { posts: posts.filter((p) => p.venueId) }
        );
        // Posts tagged at other places: link the place to its neighborhood, or to the city
        await tx.run(
          `MATCH (city:City {name: $city})
           UNWIND $posts AS p
           MATCH (post:Post {id: p.id})
           MERGE (pl:Place {id: p.place.id})
           SET pl.name = p.place.name, pl.city_text = p.place.city, pl.kind = 'instagram-location', pl.source = 'treg'
           MERGE (post)-[:AT]->(pl)
           WITH pl, p, city
           OPTIONAL MATCH (h:Neighborhood {name: p.place.hood})
           FOREACH (_ IN CASE WHEN h IS NOT NULL THEN [1] ELSE [] END | MERGE (pl)-[:IN]->(h))
           FOREACH (_ IN CASE WHEN h IS NULL AND p.place.inCity THEN [1] ELSE [] END | MERGE (pl)-[:IN_CITY]->(city))`,
          { city: restaurant.city, posts: posts.filter((p) => p.place) }
        );
      }
      await tx.run(
        `MATCH (r:Restaurant {id: $rid}) SET r.last_creator_scan_at = datetime(), r.last_creator_scan_cost = $cost`,
        { rid, cost: costMicro / 1e6 }
      );
    });
  } finally {
    await session.close();
  }

  return {
    skipped: false,
    lastScanAt: new Date().toISOString(),
    nextScanAt: new Date(Date.now() + SCAN_COOLDOWN_MS).toISOString(),
    hashtags,
    postsScanned: posts.length,
    added,
    businessesSkipped,
    failures,
    costUsd: Math.round(costMicro) / 1e6,
  };
}

async function listRecentlyScanned(driver: Driver): Promise<Set<string>> {
  const session = driver.session();
  try {
    const res = await session.run(
      `CALL {
         MATCH (c:LocalCreator {source: 'treg'}) WHERE c.discovered_at > datetime() - duration('P7D') RETURN c.id AS id
         UNION
         MATCH (b:ScannedBusiness) WHERE b.scanned_at > datetime() - duration('P7D') RETURN b.id AS id
       }
       RETURN collect(id) AS ids`
    );
    const ids = (res.records[0]?.get("ids") as string[]) ?? [];
    return new Set(ids.map((id) => id.replace(/^ig-/, "").toLowerCase()));
  } finally {
    await session.close();
  }
}

interface PostRow {
  id: string;
  takenAt: number | null;
  sponsored: boolean;
  likes: number | null;
  comments: number | null;
  caption: string;
  url: string;
  venueId: string | null;
  place: { id: string; name: string; city: string | null; hood: string | null; inCity: boolean } | null;
}

async function listNeighborhoods(driver: Driver): Promise<string[]> {
  const session = driver.session();
  try {
    const res = await session.run(`MATCH (n:Neighborhood) RETURN n.name AS name`);
    return res.records.map((r) => r.get("name") as string);
  } finally {
    await session.close();
  }
}

interface Venue {
  id: string;
  name: string;
  igLocationId: string | null;
}

/** The restaurant and its rivals, so a tagged post links to the venue already in the graph. */
async function listVenues(driver: Driver): Promise<Venue[]> {
  const session = driver.session();
  try {
    const res = await session.run(
      `MATCH (v) WHERE v:Restaurant OR v:Competitor RETURN v.id AS id, v.name AS name, v.instagram_location_id AS igLocationId`
    );
    return res.records.map((r) => ({ id: r.get("id"), name: norm(String(r.get("name"))), igLocationId: r.get("igLocationId") ?? null }));
  } finally {
    await session.close();
  }
}

/** Match an Instagram location to a venue by location id, or by name ("Kochi NYC" → Kochi, "Danji" → Danji). */
function matchVenue(venues: Venue[], loc: any): string | null {
  const pk = String(loc.pk ?? loc.id ?? "");
  const byId = venues.find((v) => v.igLocationId && v.igLocationId === pk);
  if (byId) return byId.id;
  const name = norm(String(loc.name ?? ""));
  if (!name) return null;
  const byName = venues.find((v) => name === v.name || name.startsWith(`${v.name} `) || v.name.startsWith(`${name} `));
  return byName?.id ?? null;
}
