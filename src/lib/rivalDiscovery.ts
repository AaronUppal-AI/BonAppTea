import type { Driver } from "neo4j-driver";
import { tregCall } from "./tregClient";
import { getRestaurant, ensureHospitalitySeed, DEFAULT_RESTAURANT_ID } from "./hospitalityGraph";
import { KOCHI } from "./restaurants/kochi";

/**
 * Live rival intel through Treg, written into Neo4j.
 *
 * 1. Google Maps search for same-cuisine restaurants near the restaurant (treg.google.serp.maps).
 * 2. Keep the closest ones (excluding the restaurant itself and its sister restaurants).
 * 3. Read each rival's newest Google reviews (treg.google.maps.reviews).
 * 4. Sort complaints in 1–4 star reviews into themes with phrase patterns, keep a real sample quote.
 * 5. MERGE (Competitor)-[:HAS_COMPLAINT {count}]->(Complaint)-[:ABOUT]->(Theme).
 */

const MAX_RIVALS = 4;
const MAX_DISTANCE_M = 1200;
const REVIEWS_PER_RIVAL = 40;

const THEME_PATTERNS: Record<string, RegExp> = {
  portions:
    /\bportions?\b[^.!?]{0,40}\b(small|tiny|skimpy|minuscule|stingy)\b|\b(small|tiny|skimpy|minuscule)\b[^.!?]{0,15}\bportions?\b|still hungry|left hungry/i,
  price: /overpriced|over-priced|too expensive|not worth (the|it)|pricey|rip[- ]?off|expensive for (what|the)/i,
  "wait times": /long wait|waited (for )?(\d+|over|almost|nearly|an hour|forever)|slow (service|kitchen)|took (forever|so long|too long)/i,
  service: /\brude\b|inattentive|ignored (us|me)|(poor|bad|terrible|awful) service|unfriendly|dismissive/i,
  noise: /too loud|so loud|very loud|noisy|couldn'?t hear|cramped/i,
  reservations: /(couldn'?t|could not|can'?t) (get|book) a (table|reservation)|hard to (book|get a table)|reservation (was|got) (lost|cancell?ed)/i,
};

export interface RivalScanResult {
  query: string;
  rivals: { name: string; distanceM: number; rating: number | null; reviewsChecked: number; themes: Record<string, number> }[];
  costUsd: number;
  failures: string[];
}

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

/** First sentence-ish chunk of a review around the matched phrase. */
function quote(text: string, pattern: RegExp): string {
  const m = pattern.exec(text);
  if (!m) return text.slice(0, 140);
  const start = Math.max(0, text.lastIndexOf(".", m.index) + 1);
  const endDot = text.indexOf(".", m.index + m[0].length);
  const end = endDot === -1 ? Math.min(text.length, m.index + 140) : Math.min(endDot + 1, start + 180);
  return text.slice(start, end).trim();
}

export async function discoverRivals(driver: Driver, rid = DEFAULT_RESTAURANT_ID): Promise<RivalScanResult> {
  await ensureHospitalitySeed(driver, rid);
  const r = await getRestaurant(driver, rid);
  if (r.lat === undefined || r.lng === undefined) throw new Error("Restaurant has no coordinates");
  const query = `${r.cuisine} restaurant ${r.neighborhood} ${r.city}`;
  const failures: string[] = [];
  let costMicro = 0;

  const search = await tregCall("treg.google.serp.maps", {}, { body: { q: query }, maxCostUsd: 0.02 });
  costMicro += search.costMicro;
  const places: any[] = search.data?.output?.places ?? [];
  // Sister restaurants come from the graph and the seed file, so new ones apply without a re-seed
  const exclude = new Set([r.name, ...(r.sisterRestaurants ?? []), ...KOCHI.restaurant.sister_restaurants].map((n) => n.toLowerCase()));
  const rivals = places
    .filter((p) => p.place_id && p.place_id !== r.googlePlaceId)
    .filter((p) => !Array.from(exclude).some((n) => String(p.name ?? "").toLowerCase().startsWith(n)))
    .filter((p) => String(p.category ?? "").toLowerCase().includes(r.cuisine.toLowerCase()))
    .map((p) => ({ ...p, distanceM: distanceM(r.lat!, r.lng!, Number(p.latitude), Number(p.longitude)) }))
    .filter((p) => p.distanceM <= MAX_DISTANCE_M)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, MAX_RIVALS);

  const scanned: RivalScanResult["rivals"] = [];
  const writes: any[] = [];
  await Promise.all(
    rivals.map(async (p) => {
      try {
        const res = await tregCall("treg.google.maps.reviews", {}, {
          body: { place_id: p.place_id, limit: REVIEWS_PER_RIVAL, sort: "newest" },
          maxCostUsd: 0.02,
        });
        costMicro += res.costMicro;
        const reviews: any[] = res.data?.output?.reviews ?? [];
        const complaints: { theme: string; count: number; sample: string; sampleDate: string | null; sampleRating: number }[] = [];
        for (const [theme, pattern] of Object.entries(THEME_PATTERNS)) {
          const hits = reviews.filter((rv) => Number(rv.rating) <= 4 && pattern.test(String(rv.text ?? "")));
          if (!hits.length) continue;
          const worst = [...hits].sort((a, b) => Number(a.rating) - Number(b.rating))[0];
          complaints.push({
            theme,
            count: hits.length,
            sample: quote(String(worst.text), pattern),
            sampleDate: worst.date ?? null,
            sampleRating: Number(worst.rating),
          });
        }
        scanned.push({
          name: p.name,
          distanceM: p.distanceM,
          rating: p.rating ?? null,
          reviewsChecked: reviews.length,
          themes: Object.fromEntries(complaints.map((c) => [c.theme, c.count])),
        });
        writes.push({
          id: `gmaps-${p.place_id}`,
          name: p.name,
          cuisine: r.cuisine,
          category: p.category ?? null,
          rating: p.rating ?? null,
          reviewCount: p.review_count ?? null,
          address: p.address ?? null,
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          distanceM: p.distanceM,
          googleUrl: p.url ?? null,
          reviewsChecked: reviews.length,
          complaints,
        });
      } catch (e: any) {
        failures.push(`${p.name}: ${e?.message ?? e}`);
      }
    })
  );

  const session = driver.session();
  try {
    await session.executeWrite(async (tx) => {
      for (const w of writes) {
        await tx.run(
          `MATCH (r:Restaurant {id: $rid})-[:IN]->(home:Neighborhood)
           MERGE (c:Competitor {id: $w.id})
           SET c:Place, c.name = $w.name, c.cuisine = $w.cuisine, c.category = $w.category, c.rating = $w.rating,
               c.review_count = $w.reviewCount, c.address = $w.address, c.lat = $w.lat, c.lng = $w.lng,
               c.distance_m = $w.distanceM, c.google_url = $w.googleUrl, c.kind = 'competitor', c.source = 'treg',
               c.scanned_at = datetime()
           MERGE (c)-[:IN]->(home)
           WITH c
           OPTIONAL MATCH (cu:Cuisine {name: $w.cuisine})
           FOREACH (_ IN CASE WHEN cu IS NULL THEN [] ELSE [1] END | MERGE (c)-[:SERVES_CUISINE]->(cu))
           WITH c
           OPTIONAL MATCH (c)-[:HAS_COMPLAINT]->(old:Complaint)
           DETACH DELETE old`,
          { rid, w }
        );
        await tx.run(
          `MATCH (c:Competitor {id: $id})
           UNWIND $complaints AS cp
           MATCH (t:Theme {name: cp.theme})
           CREATE (x:Complaint {id: $id + '-' + cp.theme})
           SET x.name = cp.theme + ' complaint', x.sample = cp.sample, x.sample_date = cp.sampleDate,
               x.sample_rating = cp.sampleRating, x.reviews_checked = $reviewsChecked, x.source = 'google-reviews'
           CREATE (c)-[:HAS_COMPLAINT {count: cp.count}]->(x)
           CREATE (x)-[:ABOUT]->(t)`,
          { id: w.id, complaints: w.complaints, reviewsChecked: w.reviewsChecked }
        );
      }
    });
  } finally {
    await session.close();
  }

  return { query, rivals: scanned.sort((a, b) => a.distanceM - b.distanceM), costUsd: costMicro / 1e6, failures };
}
