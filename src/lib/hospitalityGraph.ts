import neo4j, { Driver } from "neo4j-driver";

/**
 * PlatedOS hospitality GraphRAG.
 *
 * Seeds the restaurant knowledge graph (schema from the business plan) into Neo4j and answers
 * Chef Pepper's questions with Cypher. Every reply is built only from the rows a query returns.
 */

export const DEFAULT_RESTAURANT_ID = "rest-osteria-pepe";
const SEED_VERSION = 1;

// ---------------------------------------------------------------------------
// Seed data: one demo East Village restaurant and its neighborhood graph
// ---------------------------------------------------------------------------

const SEED = {
  restaurant: {
    id: DEFAULT_RESTAURANT_ID,
    name: "Osteria Pepe",
    cuisine: "Italian",
    neighborhood: "East Village",
    avg_check: 68,
    slow_shifts: ["Tuesday dinner", "Wednesday lunch", "5:00 PM seatings"],
  },
  neighborhoods: ["East Village", "Lower East Side", "West Village", "Williamsburg", "Greenpoint", "Midtown"],
  adjacency: [
    ["East Village", "Lower East Side"],
    ["East Village", "West Village"],
    ["Lower East Side", "Williamsburg"],
    ["Williamsburg", "Greenpoint"],
  ],
  stocked: [
    "pecorino romano", "black pepper", "guanciale", "eggs", "San Marzano tomatoes", "heavy cream",
    "chili flakes", "mascarpone", "espresso", "ladyfingers", "burrata", "sourdough", "pistachio",
  ],
  menu: [
    { id: "menu-cacio", name: "Cacio e Pepe", price: 24, food_cost: 3.2, ingredients: ["pecorino romano", "black pepper"] },
    { id: "menu-carbonara", name: "Carbonara", price: 26, food_cost: 4.6, ingredients: ["guanciale", "eggs", "pecorino romano", "black pepper"] },
    { id: "menu-vodka", name: "Spicy Rigatoni alla Vodka", price: 25, food_cost: 3.9, ingredients: ["San Marzano tomatoes", "heavy cream", "chili flakes"] },
    { id: "menu-tiramisu", name: "Tiramisu", price: 14, food_cost: 2.1, ingredients: ["mascarpone", "espresso", "ladyfingers"] },
    { id: "menu-burrata", name: "Burrata & Grilled Sourdough", price: 18, food_cost: 4.4, ingredients: ["burrata", "sourdough"] },
  ],
  trends: [
    {
      id: "ft-tableside-tiramisu", name: "Tableside Tiramisu", stage: "Accelerating", velocity_pct: 280,
      visual_format: "tableside scoop from a family-size tray", hook: "Sensory ASMR",
      audio: "slow-mo cream scoop sound (trending in NYC, last 48h)", est_weekly_revenue: 1400,
      requires: ["mascarpone", "espresso", "ladyfingers"],
    },
    {
      id: "ft-cheese-wheel", name: "Cheese-Wheel Pasta Toss", stage: "Emerging", velocity_pct: 190,
      visual_format: "pasta flamed and tossed inside a pecorino wheel", hook: "Shock/Scale",
      audio: "crowd-gasp reveal sound", est_weekly_revenue: 1100,
      requires: ["pecorino romano", "black pepper", "pecorino wheel"],
    },
    {
      id: "ft-pistachio-croissant", name: "Pistachio Crema Croissant", stage: "Accelerating", velocity_pct: 310,
      visual_format: "cross-section ooze shot", hook: "Sensory ASMR",
      audio: "flaky crunch close-up sound", est_weekly_revenue: 900,
      requires: ["pistachio", "heavy cream", "croissants"],
    },
    {
      id: "ft-hot-honey", name: "Hot Honey Pepperoni Cups", stage: "Mainstream", velocity_pct: 120,
      visual_format: "honey drizzle macro", hook: "Sensory ASMR", audio: "drip sound", est_weekly_revenue: 600,
      requires: ["hot honey", "pepperoni"],
    },
    {
      id: "ft-birria", name: "Birria Tacos", stage: "Saturated", velocity_pct: 35,
      visual_format: "consomme dip", hook: "Sensory ASMR", audio: "dip sound", est_weekly_revenue: 300,
      requires: ["beef chuck", "corn tortillas"],
    },
  ],
  competitors: [
    { id: "comp-via-roma", name: "Via Roma", cuisine: "Italian", neighborhood: "East Village" },
    { id: "comp-lucky-slice", name: "Lucky Slice", cuisine: "Pizza", neighborhood: "East Village" },
    { id: "comp-bk-rigatoni", name: "Brooklyn Rigatoni Co", cuisine: "Italian", neighborhood: "Williamsburg" },
  ],
  complaints: [
    { id: "cp-viaroma-gf", competitor: "comp-via-roma", theme: "gluten-free", count_7d: 4, sample: "No real gluten-free pasta, just a sad salad." },
    { id: "cp-viaroma-takeout", competitor: "comp-via-roma", theme: "takeout", count_7d: 6, sample: "Takeout carbonara arrived cold and clumpy." },
    { id: "cp-lucky-wait", competitor: "comp-lucky-slice", theme: "wait times", count_7d: 9, sample: "Waited 50 minutes on a Tuesday." },
    { id: "cp-bkrig-price", competitor: "comp-bk-rigatoni", theme: "price", count_7d: 5, sample: "$34 for rigatoni is wild." },
  ],
  strengths: [
    { id: "str-gf", theme: "gluten-free", pitch: "house-made gluten-free rigatoni cooked in a dedicated pot" },
    { id: "str-takeout", theme: "takeout", pitch: "pasta finished to order and packed in vented containers" },
    { id: "str-wait", theme: "wait times", pitch: "walk-in tables open at 5 PM on weeknights" },
  ],
  creators: [
    { id: "lc-evfoodcrawl", handle: "@evfoodcrawl", followers: 12000, local_audience_pct: 78, engagement_rate: 6.1, audience_hood: "East Village" },
    { id: "lc-wburgbites", handle: "@williamsburgbites", followers: 18000, local_audience_pct: 81, engagement_rate: 5.4, audience_hood: "Lower East Side" },
    { id: "lc-pastaqueen", handle: "@pastaqueen.nyc", followers: 26000, local_audience_pct: 72, engagement_rate: 4.8, audience_hood: "West Village" },
    { id: "lc-lesnoodle", handle: "@lesnoodlegirl", followers: 9000, local_audience_pct: 74, engagement_rate: 7.2, audience_hood: "Lower East Side", promoted: { competitor: "comp-via-roma", days_ago: 20 } },
    { id: "lc-nycviral", handle: "@nycviralbites", followers: 240000, local_audience_pct: 11, engagement_rate: 1.2, audience_hood: "Midtown" },
    { id: "lc-greenpoint", handle: "@greenpointgrub", followers: 6000, local_audience_pct: 85, engagement_rate: 8.0, audience_hood: "Greenpoint" },
  ],
};

const SEED_CYPHER: string[] = [
  `UNWIND $neighborhoods AS n MERGE (:Neighborhood {name: n})`,
  `UNWIND $adjacency AS pair
   MATCH (a:Neighborhood {name: pair[0]}), (b:Neighborhood {name: pair[1]})
   MERGE (a)-[:ADJACENT_TO]->(b)`,
  `MERGE (r:Restaurant {id: $restaurant.id})
   SET r.name = $restaurant.name, r.cuisine = $restaurant.cuisine, r.avg_check = $restaurant.avg_check,
       r.slow_shifts = $restaurant.slow_shifts, r.seed_version = $seedVersion
   WITH r MATCH (n:Neighborhood {name: $restaurant.neighborhood}) MERGE (r)-[:LOCATED_IN]->(n)`,
  `MATCH (r:Restaurant {id: $restaurant.id})
   UNWIND $stocked AS name MERGE (i:Ingredient {name: name}) MERGE (r)-[:STOCKS]->(i)`,
  `MATCH (r:Restaurant {id: $restaurant.id})
   UNWIND $menu AS item
   MERGE (m:MenuItem {id: item.id})
   SET m.name = item.name, m.price = item.price, m.food_cost = item.food_cost,
       m.margin = round(1 - item.food_cost / item.price, 2)
   MERGE (r)-[:SERVES]->(m)
   WITH m, item UNWIND item.ingredients AS ing
   MERGE (i:Ingredient {name: ing}) MERGE (m)-[:FEATURING]->(i)`,
  `UNWIND $trends AS t
   MERGE (ft:FoodTrend {id: t.id})
   SET ft.name = t.name, ft.stage = t.stage, ft.velocity_pct = t.velocity_pct, ft.visual_format = t.visual_format,
       ft.hook = t.hook, ft.audio = t.audio, ft.est_weekly_revenue = t.est_weekly_revenue
   WITH ft, t UNWIND t.requires AS ing
   MERGE (i:Ingredient {name: ing}) MERGE (ft)-[:REQUIRES]->(i)`,
  `UNWIND $competitors AS c
   MERGE (comp:Competitor {id: c.id}) SET comp.name = c.name, comp.cuisine = c.cuisine
   WITH comp, c MATCH (n:Neighborhood {name: c.neighborhood}) MERGE (comp)-[:COMPETES_IN]->(n)`,
  `UNWIND $complaints AS cp
   MATCH (comp:Competitor {id: cp.competitor})
   MERGE (x:Complaint {id: cp.id}) SET x.theme = cp.theme, x.sample = cp.sample
   MERGE (comp)-[h:HAS_COMPLAINT]->(x) SET h.count_7d = cp.count_7d`,
  `MATCH (r:Restaurant {id: $restaurant.id})
   UNWIND $strengths AS s
   MERGE (st:Strength {id: s.id}) SET st.theme = s.theme, st.pitch = s.pitch
   MERGE (r)-[:HAS_STRENGTH]->(st)`,
  `UNWIND $creators AS c
   MERGE (lc:LocalCreator {id: c.id})
   SET lc.handle = c.handle, lc.followers = c.followers, lc.local_audience_pct = c.local_audience_pct,
       lc.engagement_rate = c.engagement_rate
   WITH lc, c MATCH (n:Neighborhood {name: c.audience_hood}) MERGE (lc)-[:AUDIENCE_LOCATED_IN]->(n)`,
  `UNWIND [c IN $creators WHERE c.promoted IS NOT NULL] AS c
   MATCH (lc:LocalCreator {id: c.id}), (comp:Competitor {id: c.promoted.competitor})
   MERGE (lc)-[p:PROMOTED]->(comp) SET p.days_ago = c.promoted.days_ago`,
];

let seededFor: string | null = null;

export async function ensureHospitalitySeed(driver: Driver, restaurantId: string): Promise<void> {
  if (seededFor === restaurantId) return;
  const session = driver.session();
  try {
    const existing = await session.run(
      `MATCH (r:Restaurant {id: $rid}) RETURN r.seed_version AS v`,
      { rid: restaurantId }
    );
    const version = existing.records[0]?.get("v");
    if (toPlain(version) !== SEED_VERSION && restaurantId === DEFAULT_RESTAURANT_ID) {
      const params = { ...SEED, seedVersion: SEED_VERSION };
      await session.executeWrite(async (tx) => {
        for (const stmt of SEED_CYPHER) await tx.run(stmt, params);
      });
    }
    seededFor = restaurantId;
  } finally {
    await session.close();
  }
}

// ---------------------------------------------------------------------------
// GraphRAG queries
// ---------------------------------------------------------------------------

export type Intent = "trends" | "creators" | "competitors" | "post" | "slow-shift" | "overview";

export const QUERIES: Record<Exclude<Intent, "slow-shift">, string> = {
  trends: `
MATCH (r:Restaurant {id: $rid})
MATCH (t:FoodTrend)-[:REQUIRES]->(i:Ingredient)
WHERE t.stage IN ['Emerging', 'Accelerating']
WITH r, t, collect(i.name) AS needed,
     collect(CASE WHEN EXISTS { (r)-[:STOCKS]->(i) } THEN i.name END) AS have
RETURN t.name AS trend, t.stage AS stage, t.velocity_pct AS velocity,
       t.est_weekly_revenue AS weeklyRevenue, have,
       [x IN needed WHERE NOT x IN have] AS missing
ORDER BY size(missing) ASC, velocity DESC
LIMIT 3`,
  creators: `
MATCH (r:Restaurant {id: $rid})-[:LOCATED_IN]->(home:Neighborhood)
MATCH (c:LocalCreator)-[:AUDIENCE_LOCATED_IN]->(n:Neighborhood)
WHERE (n = home OR (home)-[:ADJACENT_TO]-(n))
  AND 5000 <= c.followers <= 30000
  AND c.local_audience_pct >= 70
  AND NOT EXISTS {
    MATCH (c)-[p:PROMOTED]->(:Competitor)-[:COMPETES_IN]->(home) WHERE p.days_ago <= 60
  }
RETURN c.handle AS handle, c.followers AS followers, c.local_audience_pct AS localPct,
       c.engagement_rate AS engagement, n.name AS audienceHood,
       COUNT { MATCH (:LocalCreator) } AS scanned
ORDER BY c.local_audience_pct * c.engagement_rate DESC
LIMIT 3`,
  competitors: `
MATCH (r:Restaurant {id: $rid})-[:LOCATED_IN]->(home:Neighborhood)
MATCH (comp:Competitor)-[:COMPETES_IN]->(home)
MATCH (comp)-[h:HAS_COMPLAINT]->(cp:Complaint)
OPTIONAL MATCH (r)-[:HAS_STRENGTH]->(s:Strength {theme: cp.theme})
RETURN comp.name AS competitor, cp.theme AS theme, cp.sample AS sample,
       h.count_7d AS mentions, s.pitch AS ourAnswer
ORDER BY (s IS NOT NULL) DESC, mentions DESC
LIMIT 3`,
  post: `
MATCH (r:Restaurant {id: $rid})-[:SERVES]->(m:MenuItem)-[:FEATURING]->(i:Ingredient)<-[:REQUIRES]-(t:FoodTrend)
WHERE t.stage IN ['Emerging', 'Accelerating']
WITH m, t, count(i) AS overlap
RETURN m.name AS dish, m.margin AS margin, t.name AS trend, t.velocity_pct AS velocity,
       t.hook AS hook, t.audio AS audio, t.visual_format AS format, overlap
ORDER BY overlap DESC, velocity DESC
LIMIT 1`,
  overview: `
MATCH (r:Restaurant {id: $rid})-[:LOCATED_IN]->(home:Neighborhood)
RETURN r.name AS name, r.cuisine AS cuisine, home.name AS neighborhood, r.slow_shifts AS slowShifts,
       COUNT { (r)-[:SERVES]->() } AS menuItems,
       COUNT { MATCH (:FoodTrend) } AS trends,
       COUNT { MATCH (:LocalCreator) } AS creators,
       COUNT { MATCH (:Competitor)-[:COMPETES_IN]->(home) } AS competitors`,
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

// ---------------------------------------------------------------------------
// Answering
// ---------------------------------------------------------------------------

export type Mood = "speaking" | "alert" | "excited" | "thinking";

export interface GraphAnswer {
  speech: string;
  mood: Mood;
  intent: Intent;
  graph: { source: "neo4j"; queries: { name: string; cypher: string; rows: Record<string, unknown>[] }[] };
}

async function runQuery(driver: Driver, name: keyof typeof QUERIES, rid: string) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.run(QUERIES[name], { rid });
    return { name, cypher: QUERIES[name].trim(), rows: res.records.map((r) => toPlain(r.toObject()) as Record<string, unknown>) };
  } finally {
    await session.close();
  }
}

const usd = (n: unknown) => `$${Number(n).toLocaleString("en-US")}`;
const k = (n: unknown) => `${Math.round(Number(n) / 1000)}k`;

function speakTrends(rows: any[]): { speech: string; mood: Mood } {
  if (!rows.length) return { speech: "Nothing's heating up in the graph right now. I'll keep the burner on.", mood: "speaking" };
  const [top, next] = rows;
  let s = top.missing.length === 0
    ? `${top.trend} is ${top.stage.toLowerCase()} at +${top.velocity}% and you already stock everything: ${top.have.join(", ")}. That's about ${usd(top.weeklyRevenue)} a week sitting in your walk-in. Put it on this weekend!`
    : `${top.trend} is ${top.stage.toLowerCase()} at +${top.velocity}%. You have ${top.have.join(", ") || "nothing for it yet"}; you'd just need ${top.missing.join(", ")}.`;
  if (next) s += ` Runner-up: ${next.trend} (+${next.velocity}%), missing ${next.missing.join(", ") || "nothing"}.`;
  return { speech: s, mood: "excited" };
}

function speakCreators(rows: any[]): { speech: string; mood: Mood } {
  if (!rows.length) return { speech: "No creator in your area passes the local-audience check yet. Better zero than feeding freeloaders!", mood: "alert" };
  const scanned = rows[0].scanned;
  const list = rows.map((c) => `${c.handle} (${k(c.followers)}, ${c.localPct}% local, ${c.engagement}% engagement)`).join("; ");
  return {
    speech: `I checked ${scanned} creators and only ${rows.length} are worth a comped table: ${list}. The rest are vanity accounts, outside your area, or recently promoted a rival. Want me to draft ${rows[0].handle}'s invite?`,
    mood: "excited",
  };
}

function speakCompetitors(rows: any[]): { speech: string; mood: Mood } {
  if (!rows.length) return { speech: "The block is quiet, no fresh complaints about your neighbors this week.", mood: "speaking" };
  const top = rows[0];
  let s = `${top.competitor} took ${top.mentions} hits on ${top.theme} this week: "${top.sample}"`;
  s += top.ourAnswer ? ` That's our opening. Post a Reel about your ${top.ourAnswer}.` : " We don't have an answer for that one yet.";
  const other = rows.slice(1).find((r) => r.ourAnswer);
  if (other) s += ` Also: ${other.competitor} is getting dinged on ${other.theme}; hit back with your ${other.ourAnswer}.`;
  return { speech: s, mood: "alert" };
}

function speakPost(rows: any[]): { speech: string; mood: Mood } {
  if (!rows.length) return { speech: "None of your dishes line up with a live trend yet. Ask me for menu ideas instead.", mood: "speaking" };
  const p = rows[0];
  return {
    speech: `Film your ${p.dish} as a ${p.trend} moment (+${p.velocity}%). ${p.hook} hook: clip 1, 1.5s macro of the ${p.format}; clip 2, 2s of the plating; clip 3, the first bite. Use the ${p.audio}. You keep ${Math.round(Number(p.margin) * 100)}% of every one you sell.`,
    mood: "excited",
  };
}

function speakOverview(rows: any[]): { speech: string; mood: Mood } {
  const o = rows[0];
  if (!o) return { speech: "I can't find your restaurant in the graph yet.", mood: "alert" };
  return {
    speech: `I'm Chef Pepper, ${o.name}'s co-host. I'm watching ${o.trends} food trends, ${o.creators} local creators and ${o.competitors} rivals around ${o.neighborhood}, all from your knowledge graph. Ask me what to film, which creators to invite, what your rivals are getting roasted for, or how to fill ${o.slowShifts[0]}.`,
    mood: "speaking",
  };
}

export async function answerWithGraph(driver: Driver, message: string, rid = DEFAULT_RESTAURANT_ID): Promise<GraphAnswer> {
  await ensureHospitalitySeed(driver, rid);
  const intent = detectIntent(message);

  if (intent === "slow-shift") {
    const [overview, post, creators] = await Promise.all([
      runQuery(driver, "overview", rid),
      runQuery(driver, "post", rid),
      runQuery(driver, "creators", rid),
    ]);
    const shift = (overview.rows[0]?.slowShifts as string[] | undefined)?.[0] ?? "your slow shift";
    const p = speakPost(post.rows).speech;
    const top = creators.rows[0] as any;
    const creatorLine = top ? ` Then invite ${top.handle} (${top.localPct}% local) for a comped ${shift} tasting so their post lands the same week.` : "";
    return {
      speech: `Let's fill ${shift}. ${p}${creatorLine}`,
      mood: "excited",
      intent,
      graph: { source: "neo4j", queries: [overview, post, creators] },
    };
  }

  const q = await runQuery(driver, intent, rid);
  const speak = { trends: speakTrends, creators: speakCreators, competitors: speakCompetitors, post: speakPost, overview: speakOverview }[intent];
  return { ...speak(q.rows), intent, graph: { source: "neo4j", queries: [q] } };
}

// Convert Neo4j Integers (and nested values) into plain JS numbers.
function toPlain(v: unknown): unknown {
  if (neo4j.isInt(v)) return (v as any).toNumber();
  if (Array.isArray(v)) return v.map(toPlain);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([key, val]) => [key, toPlain(val)]));
  }
  return v;
}
