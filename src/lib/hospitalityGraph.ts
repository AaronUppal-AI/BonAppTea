import neo4j, { Driver } from "neo4j-driver";
import { KOCHI } from "./restaurants/kochi";

/**
 * BonAppTea hospitality knowledge graph (schema v3).
 *
 *   (City)<-[:IN_CITY]-(Neighborhood)-[:ADJACENT_TO]-(Neighborhood)
 *   (Place)-[:IN]->(Neighborhood)            Restaurant and Competitor are also :Place
 *   (Restaurant)-[:SERVES]->(MenuItem)-[:FEATURING]->(Ingredient)<-[:STOCKS]-(Restaurant)
 *   (FoodTrend)-[:REQUIRES]->(Ingredient)    (FoodTrend)-[:FITS]->(Cuisine)
 *   (FoodTrend)-[:EVIDENCED_BY]->(WebSource) written back from You.com searches
 *   (Restaurant|Competitor)-[:SERVES_CUISINE]->(Cuisine)
 *   (Competitor)-[:CAPITALIZES_ON]->(FoodTrend)
 *   (Competitor)-[:HAS_COMPLAINT]->(Complaint)-[:ABOUT]->(Theme)<-[:ADDRESSES]-(Strength)<-[:HAS_STRENGTH]-(Restaurant)
 *   (LocalCreator)-[:POSTED]->(Post)-[:AT]->(Place)      (LocalCreator)-[:COVERS]->(Cuisine)
 *
 * Creator location, local reach and rival sponsorships are derived by traversing posts, so seed
 * creators and creators discovered live through Treg are vetted by the same graph logic.
 */

export const DEFAULT_RESTAURANT_ID = KOCHI.restaurant.id;
const SEED_VERSION = 4;

export const HOSPITALITY_LABELS = [
  "City", "Neighborhood", "Place", "Restaurant", "Competitor", "MenuItem", "Ingredient", "FoodTrend",
  "WebSource", "Cuisine", "Theme", "Complaint", "Strength", "LocalCreator", "Post",
];

// ---------------------------------------------------------------------------
// Seed: the restaurant's own facts. Rivals, reviews and creators come from the live pipeline.
// ---------------------------------------------------------------------------

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const SEED = {
  city: KOCHI.city,
  neighborhoods: KOCHI.neighborhoods.map((name) => ({ name, placeId: `place-${slug(name)}` })),
  adjacency: KOCHI.adjacency,
  cuisines: KOCHI.cuisines,
  themes: KOCHI.themes,
  restaurant: KOCHI.restaurant,
  stocked: Array.from(new Set(KOCHI.menu.flatMap((m) => m.ingredients))),
  menu: KOCHI.menu,
  trends: KOCHI.trends,
  strengths: KOCHI.strengths,
};

const SEED_CYPHER: string[] = [
  `MERGE (:City {name: $city})`,
  `UNWIND $neighborhoods AS n
   MATCH (c:City {name: $city})
   MERGE (h:Neighborhood {name: n.name})
   MERGE (h)-[:IN_CITY]->(c)
   MERGE (p:Place {id: n.placeId}) SET p.name = n.name, p.kind = 'neighborhood'
   MERGE (p)-[:IN]->(h)`,
  `UNWIND $adjacency AS pair
   MATCH (a:Neighborhood {name: pair[0]}), (b:Neighborhood {name: pair[1]})
   MERGE (a)-[:ADJACENT_TO]->(b)`,
  `UNWIND $cuisines AS c MERGE (:Cuisine {name: c})`,
  `UNWIND $themes AS t MERGE (:Theme {name: t})`,
  `MERGE (r:Restaurant {id: $restaurant.id})
   SET r:Place, r += {
         name: $restaurant.name, cuisine: $restaurant.cuisine, concept: $restaurant.concept, chef: $restaurant.chef,
         award: $restaurant.award, address: $restaurant.address, lat: $restaurant.lat, lng: $restaurant.lng,
         website: $restaurant.website, instagram: $restaurant.instagram, reservations: $restaurant.reservations,
         hours: $restaurant.hours, tasting_price: $restaurant.tasting_price, pairing_price: $restaurant.pairing_price,
         avg_check: $restaurant.avg_check, slow_shifts: $restaurant.slow_shifts,
         sister_restaurants: $restaurant.sister_restaurants, google_place_id: $restaurant.google_place_id,
         instagram_location_id: $restaurant.instagram_location_id, kind: 'restaurant', seed_version: $seedVersion
       }
   WITH r
   MATCH (n:Neighborhood {name: $restaurant.neighborhood})
   MERGE (r)-[:IN]->(n)
   WITH r
   UNWIND $restaurant.cuisines AS cu
   MATCH (c:Cuisine {name: cu})
   MERGE (r)-[:SERVES_CUISINE]->(c)`,
  `MATCH (r:Restaurant {id: $restaurant.id})
   UNWIND $stocked AS name
   MERGE (i:Ingredient {name: name})
   MERGE (r)-[:STOCKS]->(i)`,
  `MATCH (r:Restaurant {id: $restaurant.id})
   UNWIND $menu AS item
   MERGE (m:MenuItem {id: item.id})
   SET m.name = item.name, m.course = true
   MERGE (r)-[:SERVES]->(m)
   WITH m, item
   UNWIND item.ingredients AS ing
   MERGE (i:Ingredient {name: ing})
   MERGE (m)-[:FEATURING]->(i)`,
  `UNWIND $trends AS t
   MERGE (ft:FoodTrend {id: t.id})
   SET ft.name = t.name, ft.stage = t.stage, ft.velocity_pct = t.velocity_pct, ft.visual_format = t.visual_format,
       ft.hook = t.hook, ft.audio = t.audio, ft.est_weekly_revenue = t.est_weekly_revenue, ft.illustrative = true
   WITH ft, t
   CALL {
     WITH ft, t
     UNWIND t.requires AS ing
     MERGE (i:Ingredient {name: ing})
     MERGE (ft)-[:REQUIRES]->(i)
   }
   WITH ft, t
   UNWIND t.fits AS cu
   MATCH (c:Cuisine {name: cu})
   MERGE (ft)-[:FITS]->(c)`,
  `MATCH (r:Restaurant {id: $restaurant.id})
   UNWIND $strengths AS s
   MATCH (t:Theme {name: s.theme})
   MERGE (st:Strength {id: s.id}) SET st.pitch = s.pitch, st.name = s.pitch
   MERGE (r)-[:HAS_STRENGTH]->(st)
   MERGE (st)-[:ADDRESSES]->(t)`,
];

// One cheap read to decide whether the prune below is needed at all.
const FOREIGN_DATA_CHECK = `
RETURN EXISTS { MATCH (r:Restaurant) WHERE r.id <> $rid }
    OR EXISTS { MATCH (t:FoodTrend) WHERE NOT t.id IN $trendIds }
    OR EXISTS { MATCH (c:LocalCreator) WHERE coalesce(c.source, 'seed') <> 'treg' }
    OR EXISTS { MATCH (c:Competitor) WHERE coalesce(c.source, 'seed') <> 'treg' }
    OR EXISTS { MATCH ()-[x:LOCATED_IN|COMPETES_IN|AUDIENCE_LOCATED_IN|PROMOTED]->() } AS foreign`;

const PRUNE_CYPHER: string[] = [
  `MATCH (r:Restaurant) WHERE r.id <> $rid DETACH DELETE r`,
  `MATCH (t:FoodTrend) WHERE NOT t.id IN $trendIds DETACH DELETE t`,
  `MATCH (c:LocalCreator) WHERE coalesce(c.source, 'seed') <> 'treg'
   OPTIONAL MATCH (c)-[:POSTED]->(p:Post)
   DETACH DELETE c, p`,
  `MATCH (c:Competitor) WHERE coalesce(c.source, 'seed') <> 'treg'
   OPTIONAL MATCH (c)-[:HAS_COMPLAINT]->(x:Complaint)
   DETACH DELETE c, x`,
  `MATCH (x:Complaint) WHERE NOT EXISTS { ()-[:HAS_COMPLAINT]->(x) } DETACH DELETE x`,
  `MATCH (m:MenuItem) WHERE NOT EXISTS { (:Restaurant)-[:SERVES]->(m) } DETACH DELETE m`,
  `MATCH (s:Strength) WHERE NOT EXISTS { (:Restaurant)-[:HAS_STRENGTH]->(s) } DETACH DELETE s`,
  `MATCH (p:Post) WHERE NOT EXISTS { (:LocalCreator)-[:POSTED]->(p) } DETACH DELETE p`,
  `MATCH ()-[x:LOCATED_IN|COMPETES_IN|AUDIENCE_LOCATED_IN|PROMOTED]->() DELETE x`,
  `MATCH (i:Ingredient) WHERE NOT EXISTS { (i)--() } DELETE i`,
  `MATCH (p:Place) WHERE NOT p:Restaurant AND NOT p:Competitor AND NOT EXISTS { (p)--() } DELETE p`,
];

let seededFor: string | null = null;
let seeding: Promise<void> | null = null;

/** Seeds (or migrates to) the current schema. Older schema versions are wiped and rebuilt once. */
export async function ensureHospitalitySeed(driver: Driver, restaurantId: string): Promise<void> {
  if (seededFor === restaurantId) return;
  if (!seeding) {
    seeding = (async () => {
      const session = driver.session();
      try {
        const existing = await session.run(`MATCH (r:Restaurant {id: $rid}) RETURN r.seed_version AS v`, { rid: restaurantId });
        const version = toPlain(existing.records[0]?.get("v"));
        if (version !== SEED_VERSION && restaurantId === DEFAULT_RESTAURANT_ID) {
          await session.executeWrite(async (tx) => {
            await tx.run(`MATCH (n) WHERE any(l IN labels(n) WHERE l IN $labels) DETACH DELETE n`, { labels: HOSPITALITY_LABELS });
            const params = { ...SEED, seedVersion: SEED_VERSION };
            for (const stmt of SEED_CYPHER) await tx.run(stmt, params);
          });
        }
        // Remove anything an older deployment (or another restaurant's seed) left in the shared database.
        if (restaurantId === DEFAULT_RESTAURANT_ID) {
          const params = { rid: restaurantId, trendIds: KOCHI.trends.map((t) => t.id) };
          const leftovers = await session.run(FOREIGN_DATA_CHECK, params);
          if (leftovers.records[0]?.get("foreign")) {
            await session.executeWrite(async (tx) => {
              for (const stmt of PRUNE_CYPHER) await tx.run(stmt, params);
            });
          }
        }
        seededFor = restaurantId;
      } finally {
        await session.close();
      }
    })().finally(() => {
      seeding = null;
    });
  }
  await seeding;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function runCypher(driver: Driver, cypher: string, params: Record<string, unknown>) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    // Every read has a time limit so a slow query can't stall a tab
    const res = await session.run(cypher, params, { timeout: 12000 });
    return res.records.map((r) => toPlain(r.toObject()) as any);
  } finally {
    await session.close();
  }
}

// Convert Neo4j Integers, temporal values and nested structures into plain JSON.
function toPlain(v: unknown): unknown {
  if (neo4j.isInt(v)) return (v as any).toNumber();
  if (
    neo4j.isDateTime(v as any) || neo4j.isDate(v as any) || neo4j.isLocalDateTime(v as any) ||
    neo4j.isDuration(v as any) || neo4j.isTime(v as any) || neo4j.isLocalTime(v as any)
  ) {
    return String(v);
  }
  if (Array.isArray(v)) return v.map(toPlain);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([key, val]) => [key, toPlain(val)]));
  }
  return v;
}

// ---------------------------------------------------------------------------
// Track data
// ---------------------------------------------------------------------------

export interface RestaurantProfile {
  id: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  city: string;
  avgCheck: number;
  slowShifts: string[];
  concept?: string;
  chef?: string;
  award?: string;
  address?: string;
  website?: string;
  instagram?: string;
  hours?: string;
  tastingPrice?: number;
  lat?: number;
  lng?: number;
  googlePlaceId?: string;
  instagramLocationId?: string;
  sisterRestaurants?: string[];
}

export async function getRestaurant(driver: Driver, rid = DEFAULT_RESTAURANT_ID): Promise<RestaurantProfile> {
  await ensureHospitalitySeed(driver, rid);
  const [row] = await runCypher(
    driver,
    `MATCH (r:Restaurant {id: $rid})-[:IN]->(n:Neighborhood)-[:IN_CITY]->(c:City)
     RETURN r.id AS id, r.name AS name, r.cuisine AS cuisine, n.name AS neighborhood,
            c.name AS city, r.avg_check AS avgCheck, r.slow_shifts AS slowShifts,
            r.concept AS concept, r.chef AS chef, r.award AS award, r.address AS address, r.website AS website,
            r.instagram AS instagram, r.hours AS hours, r.tasting_price AS tastingPrice, r.lat AS lat, r.lng AS lng,
            r.google_place_id AS googlePlaceId, r.instagram_location_id AS instagramLocationId,
            coalesce(r.sister_restaurants, []) AS sisterRestaurants`,
    { rid }
  );
  if (!row) throw new Error(`Restaurant ${rid} not found in the graph`);
  return row;
}

export const TREND_BOARD_CYPHER = `
MATCH (r:Restaurant {id: $rid})
MATCH (t:FoodTrend)-[:REQUIRES]->(i:Ingredient)
WITH r, t, collect(i.name) AS needed,
     collect(CASE WHEN EXISTS { (r)-[:STOCKS]->(i) } THEN i.name END) AS have
RETURN t.id AS id, t.name AS name, t.stage AS stage, t.velocity_pct AS velocity,
       t.visual_format AS format, t.hook AS hook, t.audio AS audio,
       t.est_weekly_revenue AS weeklyRevenue, have, [x IN needed WHERE NOT x IN have] AS missing,
       [(t)-[:FITS]->(c:Cuisine) | c.name] AS fits,
       EXISTS { (t)-[:FITS]->(:Cuisine)<-[:SERVES_CUISINE]-(r) } AS fitsUs,
       [(comp:Competitor)-[:CAPITALIZES_ON]->(t) WHERE EXISTS { (comp)-[:IN]->(:Neighborhood)<-[:IN]-(r) } | comp.name] AS rivalsOnIt,
       COUNT { (t)-[:EVIDENCED_BY]->(:WebSource) } AS webSources
ORDER BY velocity DESC`;

export interface BoardTrend {
  id: string;
  name: string;
  stage: "Emerging" | "Accelerating" | "Mainstream" | "Saturated";
  velocity: number;
  format: string;
  hook: string;
  audio: string;
  weeklyRevenue: number;
  have: string[];
  missing: string[];
  fits: string[];
  fitsUs: boolean;
  rivalsOnIt: string[];
  webSources: number;
}

export async function getTrendBoard(driver: Driver, rid = DEFAULT_RESTAURANT_ID): Promise<BoardTrend[]> {
  await ensureHospitalitySeed(driver, rid);
  return runCypher(driver, TREND_BOARD_CYPHER, { rid });
}

export const POST_PLANS_CYPHER = `
MATCH (r:Restaurant {id: $rid})-[:SERVES]->(m:MenuItem)
OPTIONAL MATCH (m)-[:FEATURING]->(i:Ingredient)<-[:REQUIRES]-(t:FoodTrend)
WHERE t.stage IN ['Emerging', 'Accelerating']
WITH m, t, count(i) AS overlap
ORDER BY overlap DESC, t.velocity_pct DESC
// One shared staple (cream, eggs) is not a real match; require two.
WITH m, collect(CASE WHEN t IS NULL OR overlap < 2 THEN NULL ELSE {
  trend: t.name, stage: t.stage, velocity: t.velocity_pct, hook: t.hook,
  audio: t.audio, format: t.visual_format, overlap: overlap } END) AS matches
RETURN m.id AS id, m.name AS dish, m.price AS price, m.margin AS margin,
       [(m)-[:FEATURING]->(x:Ingredient) | x.name] AS ingredients, matches[0] AS best
ORDER BY best IS NULL, best.velocity DESC`;

export interface PostPlan {
  id: string;
  dish: string;
  /** null when the restaurant doesn't publish per-dish prices (e.g. a tasting menu) */
  price: number | null;
  margin: number | null;
  ingredients: string[];
  best: { trend: string; stage: string; velocity: number; hook: string; audio: string; format: string; overlap: number } | null;
}

export async function getPostPlans(driver: Driver, rid = DEFAULT_RESTAURANT_ID): Promise<PostPlan[]> {
  await ensureHospitalitySeed(driver, rid);
  return runCypher(driver, POST_PLANS_CYPHER, { rid });
}

/** Creator vetting is derived from the graph: where they post, who sponsored them, what they cover. */
export const CREATOR_VETTING_CYPHER = `
MATCH (r:Restaurant {id: $rid})-[:IN]->(home:Neighborhood)-[:IN_CITY]->(city:City)
MATCH (c:LocalCreator)
// Home base = the neighborhood they post from most
CALL {
  WITH c
  OPTIONAL MATCH (c)-[:POSTED]->(:Post)-[:AT]->(:Place)-[:IN]->(n:Neighborhood)
  WITH n, count(n) AS k
  ORDER BY k DESC
  LIMIT 1
  RETURN n AS base
}
// Paid posts for a rival in our neighborhood
CALL {
  WITH c, home
  OPTIONAL MATCH (c)-[:POSTED]->(sp:Post {sponsored: true})-[:AT]->(rv:Competitor)-[:IN]->(home)
  WITH rv, sp
  ORDER BY sp.posted_at DESC
  LIMIT 1
  RETURN rv.name AS rival,
         CASE WHEN sp IS NULL THEN NULL ELSE duration.inDays(sp.posted_at, datetime()).days END AS rivalDaysAgo
}
WITH r, home, city, c, base, rival, rivalDaysAgo,
     COUNT { MATCH (c)-[:POSTED]->(:Post)-[:AT]->(:Place) } AS located,
     COUNT { MATCH (c)-[:POSTED]->(:Post)-[:AT]->(pl:Place)
             WHERE EXISTS { (pl)-[:IN]->(:Neighborhood)-[:IN_CITY]->(city) } OR EXISTS { (pl)-[:IN_CITY]->(city) } } AS localPosts
RETURN c.handle AS handle, c.followers AS followers, c.engagement_rate AS engagement,
       CASE WHEN c.local_audience_pct IS NOT NULL THEN c.local_audience_pct
            WHEN located >= 3 THEN toInteger(round(100.0 * localPosts / located)) END AS localPct,
       CASE WHEN c.local_audience_pct IS NOT NULL THEN 'audience' ELSE 'posting' END AS localMetric,
       located AS geotagged,
       coalesce(base.name, CASE WHEN localPosts > 0 THEN 'Elsewhere in ' + city.name ELSE 'Outside the city' END) AS audienceHood,
       CASE WHEN base = home THEN 'home'
            WHEN base IS NOT NULL AND EXISTS { (home)-[:ADJACENT_TO]-(base) } THEN 'adjacent'
            WHEN localPosts > 0 THEN 'city'
            ELSE 'outside' END AS proximity,
       rival, rivalDaysAgo,
       [(c)-[:COVERS]->(k:Cuisine) | k.name] AS covers,
       EXISTS { (c)-[:COVERS]->(:Cuisine)<-[:SERVES_CUISINE]-(r) } AS cuisineFit,
       EXISTS { (c)-[:POSTED]->(:Post)-[:AT]->(r) } AS alreadyPostedAboutUs,
       coalesce(c.source, 'seed') AS source, c.sample_post_url AS samplePostUrl, toString(c.discovered_at) AS discoveredAt,
       // Only accounts discovered live are real; demo seed creators have no profile link.
       CASE WHEN c.source = 'treg' THEN coalesce(c.profile_url, 'https://www.instagram.com/' + substring(c.handle, 1) + '/') END AS profileUrl`;

export interface VettedCreator {
  handle: string;
  followers: number;
  localPct: number | null;
  engagement: number | null;
  audienceHood: string;
  /** home/adjacent neighborhood, 'city' = posts across the same city (subway-close), 'outside' = elsewhere */
  proximity: "home" | "adjacent" | "city" | "outside";
  rival: string | null;
  rivalDaysAgo: number | null;
  covers: string[];
  cuisineFit: boolean;
  alreadyPostedAboutUs: boolean;
  geotagged: number;
  /** 'seed' = demo data; 'treg' = discovered live from Instagram through Treg */
  source: "seed" | "treg";
  /** 'audience' = % of followers who are local; 'posting' = % of geo-tagged posts in the city */
  localMetric: "audience" | "posting";
  samplePostUrl: string | null;
  /** Real Instagram profile URL (live creators only) */
  profileUrl: string | null;
  discoveredAt: string | null;
  passed: boolean;
  reasons: string[];
  score: number;
}

/** Nano + micro creators: big enough to be seen, small enough that their audience is real and local. */
export const MIN_FOLLOWERS = 2000;
export const MAX_FOLLOWERS = 30000;

/** Rules: 2k–30k followers, ≥70% local, posts in the city, no paid rival post in 60 days, known engagement. */
export async function getCreatorVetting(driver: Driver, rid = DEFAULT_RESTAURANT_ID): Promise<VettedCreator[]> {
  await ensureHospitalitySeed(driver, rid);
  const rows = await runCypher(driver, CREATOR_VETTING_CYPHER, { rid });
  return rows
    .map((c: any) => {
      const reasons: string[] = [];
      if (c.followers < MIN_FOLLOWERS) reasons.push(`Under ${MIN_FOLLOWERS / 1000}k followers`);
      if (c.followers > MAX_FOLLOWERS) reasons.push(`${Math.round(c.followers / 1000)}k followers: not a nano or micro creator`);
      const localLabel = c.localMetric === "posting" ? "of geo-tagged posts are local" : "local audience";
      if (c.localPct === null || c.localPct === undefined) reasons.push("Too few geo-tagged posts to judge local reach");
      else if (c.localPct < 70) reasons.push(`Only ${c.localPct}% ${localLabel}`);
      if (c.engagement === null || c.engagement === undefined) reasons.push("Engagement unknown");
      if (c.proximity === "outside") reasons.push("Posts mostly outside the city");
      if (c.rival && c.rivalDaysAgo !== null && c.rivalDaysAgo <= 60) reasons.push(`Paid post for ${c.rival} ${c.rivalDaysAgo} days ago`);
      // City-wide creators still reach diners a subway ride away, but rank below true locals.
      const reach = c.proximity === "city" ? 0.6 : 1;
      const fit = c.cuisineFit ? 1.15 : 1;
      const score = reasons.length === 0 ? Math.round(c.localPct * c.engagement * reach * fit) / 10 : 0;
      return { ...c, passed: reasons.length === 0, reasons, score };
    })
    .sort((a: VettedCreator, b: VettedCreator) => Number(b.passed) - Number(a.passed) || b.score - a.score);
}

export const RIVAL_INTEL_CYPHER = `
MATCH (r:Restaurant {id: $rid})-[:IN]->(home:Neighborhood)<-[:IN]-(comp:Competitor)
MATCH (comp)-[h:HAS_COMPLAINT]->(cp:Complaint)-[:ABOUT]->(t:Theme)
OPTIONAL MATCH (r)-[:HAS_STRENGTH]->(s:Strength)-[:ADDRESSES]->(t)
RETURN comp.name AS competitor, comp.cuisine AS cuisine, comp.rating AS rating, comp.review_count AS reviewCount,
       comp.address AS address, comp.google_url AS googleUrl, cp.reviews_checked AS reviewsChecked,
       t.name AS theme, cp.sample AS sample, cp.sample_date AS sampleDate, cp.sample_rating AS sampleRating,
       h.count AS mentions, s.pitch AS ourAnswer,
       [(c:LocalCreator)-[:POSTED]->(p:Post)-[:AT]->(comp) WHERE NOT coalesce(p.sponsored, false)
          AND p.posted_at > datetime() - duration('P30D') | c.handle] AS recentVisitors
ORDER BY mentions DESC`;

export interface RivalComplaint {
  competitor: string;
  cuisine: string;
  theme: string;
  sample: string;
  sampleDate: string | null;
  sampleRating: number | null;
  rating: number | null;
  reviewCount: number | null;
  address: string | null;
  googleUrl: string | null;
  /** How many of the rival's recent Google reviews were read */
  reviewsChecked: number;
  /** Recent reviews that raised this theme */
  mentions: number;
  ourAnswer: string | null;
  /** Creators who posted (unpaid) from this rival in the last 30 days */
  recentVisitors: string[];
}

export async function getRivalIntel(driver: Driver, rid = DEFAULT_RESTAURANT_ID): Promise<RivalComplaint[]> {
  await ensureHospitalitySeed(driver, rid);
  const rows: RivalComplaint[] = await runCypher(driver, RIVAL_INTEL_CYPHER, { rid });
  return rows.map((r) => ({ ...r, recentVisitors: Array.from(new Set(r.recentVisitors)) }));
}

/** Writes You.com trend evidence back into the graph as WebSource nodes. */
export async function recordTrendEvidence(
  driver: Driver,
  trend: string,
  sources: { url: string; title: string; domain: string; publishedAt?: string }[]
) {
  if (!sources.length) return;
  const session = driver.session();
  try {
    await session.executeWrite((tx) =>
      tx.run(
        `MATCH (t:FoodTrend {name: $trend})
         UNWIND $sources AS s
         MERGE (w:WebSource {url: s.url})
         SET w.title = s.title, w.name = s.domain, w.domain = s.domain, w.published_at = s.publishedAt, w.via = 'you.com'
         MERGE (t)-[e:EVIDENCED_BY]->(w)
         SET e.retrieved_at = datetime()`,
        { trend, sources: sources.map((s) => ({ ...s, publishedAt: s.publishedAt ?? null })) }
      )
    );
  } finally {
    await session.close();
  }
}

// ---------------------------------------------------------------------------
// Graph view + insight paths
// ---------------------------------------------------------------------------

const TYPE_PRIORITY = [
  "Restaurant", "Competitor", "LocalCreator", "Post", "Place", "MenuItem", "Ingredient", "FoodTrend",
  "WebSource", "Complaint", "Theme", "Strength", "Cuisine", "Neighborhood", "City",
];

function nodeType(labels: string[]): string {
  return TYPE_PRIORITY.find((t) => labels.includes(t)) ?? labels[0];
}

function nodeLabel(type: string, p: any): string {
  if (type === "Post") return (p.caption ?? "Post").slice(0, 32);
  if (type === "Strength") return (p.pitch ?? "Strength").slice(0, 32);
  if (type === "Complaint") return p.name ?? "Complaint";
  if (type === "WebSource") return p.domain ?? p.title ?? "source";
  return p.name ?? p.handle ?? p.id ?? type;
}

export async function getGraphView(driver: Driver, rid = DEFAULT_RESTAURANT_ID) {
  await ensureHospitalitySeed(driver, rid);
  const rows = await runCypher(
    driver,
    `MATCH (a)-[rel]->(b)
     WHERE any(l IN labels(a) WHERE l IN $labels) AND any(l IN labels(b) WHERE l IN $labels)
     RETURN elementId(a) AS aId, labels(a) AS aLabels, properties(a) AS a,
            elementId(rel) AS relId, type(rel) AS rel,
            elementId(b) AS bId, labels(b) AS bLabels, properties(b) AS b
     LIMIT 2000`,
    { labels: HOSPITALITY_LABELS }
  );
  const nodes = new Map<string, { id: string; label: string; type: string; details: Record<string, unknown> }>();
  const edges: { id: string; source: string; target: string; label: string }[] = [];
  const add = (id: string, labels: string[], props: any) => {
    if (!nodes.has(id)) {
      const type = nodeType(labels);
      nodes.set(id, { id, label: nodeLabel(type, props), type, details: props });
    }
  };
  for (const row of rows) {
    add(row.aId, row.aLabels, row.a);
    add(row.bId, row.bLabels, row.b);
    edges.push({ id: row.relId, source: row.aId, target: row.bId, label: row.rel });
  }
  return { nodes: Array.from(nodes.values()), edges };
}

export interface Insight {
  id: string;
  kind: "conquest" | "warm-lead" | "pantry-trend" | "rival-gap" | "open-trend" | "cuisine-fit";
  title: string;
  detail: string;
  hops: number;
  nodeIds: string[];
  relIds: string[];
}

const PATH_IDS = `[n IN nodes(path) | elementId(n)] AS nodeIds, [x IN relationships(path) | elementId(x)] AS relIds`;

export const INSIGHT_CYPHER: Record<Insight["kind"], string> = {
  conquest: `
// Creators who just ate at a rival that is failing on something we are strong at
MATCH (r:Restaurant {id: $rid})-[:IN]->(home:Neighborhood)
MATCH path = (c:LocalCreator)-[:POSTED]->(p:Post)-[:AT]->(comp:Competitor)-[:HAS_COMPLAINT]->(:Complaint)
             -[:ABOUT]->(t:Theme)<-[:ADDRESSES]-(s:Strength)<-[:HAS_STRENGTH]-(r)
WHERE EXISTS { (comp)-[:IN]->(home) } AND NOT coalesce(p.sponsored, false)
  AND p.posted_at > datetime() - duration('P30D')
  AND NOT EXISTS { (c)-[:POSTED]->(:Post {sponsored: true})-[:AT]->(:Competitor)-[:IN]->(home) }
RETURN c.handle AS creator, comp.name AS rival, t.name AS theme, s.pitch AS pitch, ${PATH_IDS}
ORDER BY p.posted_at DESC
LIMIT 8`,
  "warm-lead": `
// Creators who already posted from our restaurant
MATCH path = (c:LocalCreator)-[:POSTED]->(p:Post)-[:AT]->(r:Restaurant {id: $rid})
RETURN c.handle AS creator, p.caption AS caption, duration.inDays(p.posted_at, datetime()).days AS daysAgo, ${PATH_IDS}
ORDER BY p.posted_at DESC
LIMIT 3`,
  "pantry-trend": `
// Rising trends we can serve with what is already in the pantry, and the dish that carries them
MATCH (r:Restaurant {id: $rid})
MATCH (t:FoodTrend)
WHERE t.stage IN ['Emerging', 'Accelerating']
  AND ALL(i IN [(t)-[:REQUIRES]->(x:Ingredient) | x] WHERE EXISTS { (r)-[:STOCKS]->(i) })
MATCH path = (t)-[:REQUIRES]->(:Ingredient)<-[:FEATURING]-(m:MenuItem)<-[:SERVES]-(r)
WITH t, m, collect(path) AS paths
RETURN t.name AS trend, t.velocity_pct AS velocity, m.name AS dish,
       reduce(ns = [], p IN paths | ns + [n IN nodes(p) | elementId(n)]) AS nodeIds,
       reduce(rs = [], p IN paths | rs + [x IN relationships(p) | elementId(x)]) AS relIds
ORDER BY velocity DESC
LIMIT 3`,
  "rival-gap": `
// Rival complaints this week that one of our strengths answers
MATCH (r:Restaurant {id: $rid})-[:IN]->(home:Neighborhood)
MATCH path = (comp:Competitor)-[h:HAS_COMPLAINT]->(:Complaint)-[:ABOUT]->(t:Theme)<-[:ADDRESSES]-(s:Strength)<-[:HAS_STRENGTH]-(r)
WHERE EXISTS { (comp)-[:IN]->(home) }
RETURN comp.name AS rival, t.name AS theme, h.count AS mentions, s.pitch AS pitch, ${PATH_IDS}
ORDER BY mentions DESC
LIMIT 3`,
  "open-trend": `
// Rising trends that fit our cuisine and no nearby rival has jumped on yet
MATCH (r:Restaurant {id: $rid})-[:IN]->(home:Neighborhood)
MATCH path = (t:FoodTrend)-[:FITS]->(cu:Cuisine)<-[:SERVES_CUISINE]-(r)
WHERE t.stage IN ['Emerging', 'Accelerating']
  AND NOT EXISTS { MATCH (comp:Competitor)-[:CAPITALIZES_ON]->(t) WHERE EXISTS { (comp)-[:IN]->(home) } }
RETURN t.name AS trend, cu.name AS cuisine, t.velocity_pct AS velocity, ${PATH_IDS}
ORDER BY velocity DESC
LIMIT 6`,
  "cuisine-fit": `
// Creators who already cover what we cook
MATCH path = (c:LocalCreator)-[:COVERS]->(cu:Cuisine)<-[:SERVES_CUISINE]-(r:Restaurant {id: $rid})
WHERE $minFollowers <= c.followers <= $maxFollowers
WITH c, collect(cu.name) AS cuisines, collect(path) AS paths
RETURN c.handle AS creator, cuisines,
       reduce(ns = [], p IN paths | ns + [n IN nodes(p) | elementId(n)]) AS nodeIds,
       reduce(rs = [], p IN paths | rs + [x IN relationships(p) | elementId(x)]) AS relIds
ORDER BY size(cuisines) DESC
LIMIT 3`,
};

export async function getInsights(driver: Driver, rid = DEFAULT_RESTAURANT_ID): Promise<Insight[]> {
  await ensureHospitalitySeed(driver, rid);
  const run = (kind: Insight["kind"]) =>
    runCypher(driver, INSIGHT_CYPHER[kind], { rid, minFollowers: MIN_FOLLOWERS, maxFollowers: MAX_FOLLOWERS });
  const [conquest, warm, pantry, gaps, open, fit] = await Promise.all([
    run("conquest"), run("warm-lead"), run("pantry-trend"), run("rival-gap"), run("open-trend"), run("cuisine-fit"),
  ]);
  const uniq = (a: string[]) => Array.from(new Set(a));
  const make = (kind: Insight["kind"], i: number, row: any, title: string, detail: string): Insight => ({
    id: `${kind}-${i}`,
    kind,
    title,
    detail,
    hops: uniq(row.relIds).length,
    nodeIds: uniq(row.nodeIds),
    relIds: uniq(row.relIds),
  });
  // One insight per creator+rival (or per trend), with every matching path merged into its highlight.
  const group = (rows: any[], key: (r: any) => string) => {
    const m = new Map<string, any>();
    for (const r of rows) {
      const g = m.get(key(r));
      if (!g) m.set(key(r), { ...r, nodeIds: [...r.nodeIds], relIds: [...r.relIds], themes: [r.theme], pitches: [r.pitch], cuisines: [r.cuisine], dishes: [r.dish] });
      else {
        g.nodeIds.push(...r.nodeIds);
        g.relIds.push(...r.relIds);
        g.themes.push(r.theme);
        g.pitches.push(r.pitch);
        g.cuisines.push(r.cuisine);
        g.dishes.push(r.dish);
      }
    }
    return Array.from(m.values());
  };
  const and = (xs: string[]) => uniq(xs.filter(Boolean)).join(" and ");
  const firstLine = (t: string) => {
    const line = String(t ?? "").split(/\n/)[0].trim();
    return line.length > 90 ? `${line.slice(0, 87)}…` : line;
  };
  const days = (n: number) => (n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`);
  return [
    ...group(conquest, (r) => `${r.creator}|${r.rival}`).map((r: any, i: number) =>
      make("conquest", i, r, `Conquest invite: ${r.creator}`,
        `${r.creator} just ate at ${r.rival}, which is taking heat for ${and(r.themes)}. Your ${and(r.pitches)} answer that, so invite them to compare.`)),
    ...warm.map((r: any, i: number) =>
      make("warm-lead", i, r, `Warm lead: ${r.creator}`,
        `${r.creator} posted from you ${days(r.daysAgo)}: "${firstLine(r.caption)}" Thank them and offer a first look at a new dish.`)),
    ...group(pantry, (r) => r.trend).map((r: any, i: number) =>
      make("pantry-trend", i, r, `Ready now: ${r.trend}`,
        `+${r.velocity}% and every ingredient is already in your pantry, carried by your ${and(r.dishes)}.`)),
    ...gaps.map((r: any, i: number) =>
      make("rival-gap", i, r, `${r.rival}'s weak spot: ${r.theme}`,
        `${r.mentions} of their recent Google reviews ${r.mentions === 1 ? "complains" : "complain"} about ${r.theme}. Answer with your ${r.pitch}.`)),
    ...group(open, (r) => r.trend).map((r: any, i: number) =>
      make("open-trend", i, r, `Open lane: ${r.trend}`,
        `Fits your ${and(r.cuisines)} menu (+${r.velocity}%) and no tracked rival nearby is on it.`)),
    ...fit.map((r: any, i: number) =>
      make("cuisine-fit", i, r, `Cuisine match: ${r.creator}`,
        `Covers ${r.cuisines.join(" and ")}, the same food you serve.`)),
  ];
}

// ---------------------------------------------------------------------------
// Data freshness: where each kind of data came from and when it was last refreshed
// ---------------------------------------------------------------------------

export interface FreshnessItem {
  key: "menu" | "rivals" | "creators" | "trendProof";
  label: string;
  source: string;
  at: string | null;
}

export async function getFreshness(driver: Driver, rid = DEFAULT_RESTAURANT_ID): Promise<Record<FreshnessItem["key"], FreshnessItem>> {
  await ensureHospitalitySeed(driver, rid);
  const [row] = await runCypher(
    driver,
    `MATCH (r:Restaurant {id: $rid})
     WITH r,
          [(r)-[:IN]->(:Neighborhood)<-[:IN]-(c:Competitor) | c.scanned_at] AS rivalTimes,
          [(:FoodTrend)-[e:EVIDENCED_BY]->(:WebSource) | e.retrieved_at] AS proofTimes
     RETURN toString(r.last_creator_scan_at) AS creatorsAt,
            toString(reduce(m = null, x IN rivalTimes | CASE WHEN m IS NULL OR x > m THEN x ELSE m END)) AS rivalsAt,
            toString(reduce(m = null, x IN proofTimes | CASE WHEN m IS NULL OR x > m THEN x ELSE m END)) AS proofAt`,
    { rid }
  );
  return {
    menu: { key: "menu", label: "Menu & facts", source: "restaurant website", at: KOCHI.restaurant.facts_checked },
    rivals: { key: "rivals", label: "Rival reviews", source: "Google Maps via Treg", at: row?.rivalsAt ?? null },
    creators: { key: "creators", label: "Creators", source: "Instagram via Treg", at: row?.creatorsAt ?? null },
    trendProof: { key: "trendProof", label: "Trend proof", source: "You.com", at: row?.proofAt ?? null },
  };
}

// ---------------------------------------------------------------------------
// Chef Pepper: questions answered from the same graph queries as the tabs
// ---------------------------------------------------------------------------

export type Intent = "trends" | "creators" | "competitors" | "post" | "slow-shift" | "overview";
export type Mood = "speaking" | "alert" | "excited" | "thinking";

export interface GraphAnswer {
  speech: string;
  mood: Mood;
  intent: Intent;
  graph: { source: "neo4j"; queries: { name: string; cypher: string; rows: unknown[] }[] };
  /** The data sources behind this answer and when each was last refreshed */
  sources: FreshnessItem[];
}

const INTENT_SOURCES: Record<Intent, FreshnessItem["key"][]> = {
  trends: ["menu", "trendProof"],
  creators: ["creators"],
  competitors: ["rivals"],
  post: ["menu", "trendProof"],
  "slow-shift": ["menu", "trendProof", "creators"],
  overview: ["menu", "rivals", "creators", "trendProof"],
};

export function detectIntent(message: string): Intent {
  const m = message.toLowerCase();
  if (/(slow|tuesday|wednesday|dead night|off-peak|off peak|empty)/.test(m)) return "slow-shift";
  if (/(creator|influencer|collab|foodie|tiktoker|invite|micro)/.test(m)) return "creators";
  if (/(competitor|rival|review|complain|spy|neighbor)/.test(m)) return "competitors";
  if (/(film|post|video|reel|hook|shoot|tiktok|record)/.test(m)) return "post";
  if (/(trend|menu|add|special|viral dish|what.*(cook|serve))/.test(m)) return "trends";
  return "overview";
}

const usd = (n: unknown) => `$${Number(n).toLocaleString("en-US")}`;
const k = (n: unknown) => (Number(n) >= 10000 ? `${Math.round(Number(n) / 1000)}k` : `${(Number(n) / 1000).toFixed(1)}k`);

function speakTrends(board: BoardTrend[]): { speech: string; mood: Mood } {
  const rising = board
    .filter((t) => t.stage === "Emerging" || t.stage === "Accelerating")
    .sort((a, b) => a.missing.length - b.missing.length || b.velocity - a.velocity);
  if (!rising.length) return { speech: "Nothing's heating up in the graph right now. I'll keep the burner on.", mood: "speaking" };
  const [top, next] = rising;
  let s =
    top.missing.length === 0
      ? `${top.name} is ${top.stage.toLowerCase()} at +${top.velocity}% and you already stock everything: ${top.have.join(", ")}. That's about ${usd(top.weeklyRevenue)} a week sitting in your walk-in.`
      : `${top.name} is ${top.stage.toLowerCase()} at +${top.velocity}%. You'd just need ${top.missing.join(", ")}.`;
  s += top.rivalsOnIt.length ? ` Heads up: ${top.rivalsOnIt.join(", ")} already rides it.` : " No tracked rival nearby is on it.";
  if (next) s += ` Runner-up: ${next.name} (+${next.velocity}%), missing ${next.missing.join(", ") || "nothing"}.`;
  return { speech: s, mood: "excited" };
}

function speakCreators(vetted: VettedCreator[]): { speech: string; mood: Mood } {
  const passed = vetted.filter((c) => c.passed);
  if (!passed.length) return { speech: "No creator passes vetting yet. Better zero than feeding freeloaders!", mood: "alert" };
  const top = passed.slice(0, 3);
  const list = top.map((c) => `${c.handle} (${k(c.followers)}, ${c.localPct}% local, ${c.engagement}% engagement)`).join("; ");
  const live = passed.filter((c) => c.source === "treg").map((c) => c.handle);
  const warm = passed.filter((c) => c.alreadyPostedAboutUs).map((c) => c.handle);
  let s = `I checked ${vetted.length} creators and only ${passed.length} are worth a comped table. Top picks: ${list}.`;
  const everyone = (xs: string[]) => xs.length === passed.length && passed.length > 1;
  if (everyone(warm)) s += " Every one of them already posted from your restaurant, so these are warm invites.";
  else if (warm.length) s += ` ${warm.join(", ")} already posted about you, so start there.`;
  if (everyone(live)) s += " All were found live on Instagram through Treg.";
  else if (live.length) s += ` ${live.join(", ")} ${live.length === 1 ? "was" : "were"} found live on Instagram through Treg.`;
  return { speech: s + ` Want me to draft ${top[0].handle}'s invite?`, mood: "excited" };
}

function speakCompetitors(rivals: RivalComplaint[]): { speech: string; mood: Mood } {
  if (!rivals.length) return { speech: "The block is quiet, no fresh complaints about your neighbors this week.", mood: "speaking" };
  const sorted = [...rivals].sort((a, b) => Number(!!b.ourAnswer) - Number(!!a.ourAnswer) || b.mentions - a.mentions);
  const top = sorted[0];
  let s = `${top.mentions} of ${top.competitor}'s recent Google reviews ${top.mentions === 1 ? "complains" : "complain"} about ${top.theme}: "${top.sample}"`;
  s += top.ourAnswer ? ` That's our opening. Post a Reel about your ${top.ourAnswer}.` : " We don't have an answer for that one yet.";
  if (top.recentVisitors.length) s += ` And ${top.recentVisitors.join(", ")} just ate there; invite them to compare.`;
  const other = sorted.slice(1).find((r) => r.ourAnswer && r.competitor !== top.competitor);
  if (other) s += ` Also: ${other.competitor} is getting dinged on ${other.theme}; hit back with your ${other.ourAnswer}.`;
  return { speech: s, mood: "alert" };
}

function speakPost(plans: PostPlan[]): { speech: string; mood: Mood } {
  const p = plans.find((x) => x.best);
  if (!p?.best) return { speech: "None of your dishes line up with a live trend yet. Ask me for menu ideas instead.", mood: "speaking" };
  const b = p.best;
  return {
    speech: `Film your ${p.dish} as a ${b.trend} moment (+${b.velocity}%). ${b.hook} hook: clip 1, 1.5s macro of the ${b.format}; clip 2, 2s of the plating; clip 3, the first bite. Use the ${b.audio}.${p.margin !== null ? ` You keep ${Math.round(p.margin * 100)}% of every one you sell.` : ""}`,
    mood: "excited",
  };
}

const OVERVIEW_CYPHER = `
MATCH (r:Restaurant {id: $rid})-[:IN]->(home:Neighborhood)
RETURN COUNT { (r)-[:SERVES]->() } AS menuItems,
       COUNT { MATCH (:FoodTrend) } AS trends,
       COUNT { MATCH (:LocalCreator) } AS creators,
       COUNT { MATCH (:Post) } AS posts,
       COUNT { MATCH (:Competitor)-[:IN]->(home) } AS competitors`;

export async function answerWithGraph(driver: Driver, message: string, rid = DEFAULT_RESTAURANT_ID): Promise<GraphAnswer> {
  const intent = detectIntent(message);
  const [answer, freshness] = await Promise.all([answerIntent(driver, intent, rid), getFreshness(driver, rid)]);
  return { ...answer, sources: INTENT_SOURCES[intent].map((k) => freshness[k]) };
}

async function answerIntent(driver: Driver, intent: Intent, rid: string): Promise<Omit<GraphAnswer, "sources">> {
  await ensureHospitalitySeed(driver, rid);
  const trace = (name: string, cypher: string, rows: unknown[]) => ({ name, cypher: cypher.trim(), rows });

  switch (intent) {
    case "trends": {
      const board = await getTrendBoard(driver, rid);
      return { ...speakTrends(board), intent, graph: { source: "neo4j", queries: [trace("trend board", TREND_BOARD_CYPHER, board)] } };
    }
    case "creators": {
      const vetted = await getCreatorVetting(driver, rid);
      return { ...speakCreators(vetted), intent, graph: { source: "neo4j", queries: [trace("creator vetting", CREATOR_VETTING_CYPHER, vetted)] } };
    }
    case "competitors": {
      const rivals = await getRivalIntel(driver, rid);
      return { ...speakCompetitors(rivals), intent, graph: { source: "neo4j", queries: [trace("rival intel", RIVAL_INTEL_CYPHER, rivals)] } };
    }
    case "post": {
      const plans = await getPostPlans(driver, rid);
      return { ...speakPost(plans), intent, graph: { source: "neo4j", queries: [trace("post plans", POST_PLANS_CYPHER, plans)] } };
    }
    case "slow-shift": {
      const [restaurant, plans, vetted] = await Promise.all([getRestaurant(driver, rid), getPostPlans(driver, rid), getCreatorVetting(driver, rid)]);
      const shift = restaurant.slowShifts[0] ?? "your slow shift";
      const top = vetted.find((c) => c.passed);
      const creatorLine = top ? ` Then invite ${top.handle} (${top.localPct}% local) for a comped ${shift} tasting so their post lands the same week.` : "";
      return {
        speech: `Let's fill ${shift}. ${speakPost(plans).speech}${creatorLine}`,
        mood: "excited",
        intent,
        graph: { source: "neo4j", queries: [trace("post plans", POST_PLANS_CYPHER, plans), trace("creator vetting", CREATOR_VETTING_CYPHER, vetted)] },
      };
    }
    default: {
      const restaurant = await getRestaurant(driver, rid);
      const [counts] = await runCypher(driver, OVERVIEW_CYPHER, { rid });
      return {
        speech: `I'm Chef Pepper, ${restaurant.name}'s co-host. I'm watching ${counts.trends} food trends, ${counts.creators} creators and their ${counts.posts} posts, and ${counts.competitors} rivals around ${restaurant.neighborhood}, all connected in your knowledge graph. Ask me what to film, which creators to invite, what your rivals are getting roasted for, or how to fill ${restaurant.slowShifts[0]}.`,
        mood: "speaking",
        intent,
        graph: { source: "neo4j", queries: [trace("overview", OVERVIEW_CYPHER, [counts])] },
      };
    }
  }
}
