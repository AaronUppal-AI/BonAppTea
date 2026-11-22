import neo4j, { Driver } from "neo4j-driver";
import { ensureHospitalitySeed, getRestaurant, DEFAULT_RESTAURANT_ID } from "./hospitalityGraph";

/**
 * Comp ledger (Sous Chef tier core): comps given to creators, bookings attributed to them, and the return.
 *
 *   (Restaurant)-[:GAVE]->(Comp {code: COMP-CREATOR-[HANDLE], date, covers, value_usd, cost_usd, status})-[:FOR]->(LocalCreator)
 *   (Booking {date, covers, revenue_usd})-[:ATTRIBUTED_TO]->(Comp)
 *
 * Owners enter comps and bookings by hand (until POS / reservation integrations exist). A demo loader
 * adds clearly labeled FICTIONAL creators (handles start with "sample.") so no made-up return is ever
 * attached to a real person.
 */

/** Direct food & beverage cost of a comp, as a share of its menu value (PM brief: ~30% prime cost). */
export const PRIME_COST_RATE = 0.3;
/** A completed comp returning less than this share of its value after LEAK_AFTER_DAYS is a leak. */
export const LEAK_RATIO = 0.1;
export const LEAK_AFTER_DAYS = 7;
/** Weekly slot cadence (PM brief, section 5). Monday has no rule in the brief. */
export const CADENCE = { midweekMax: 3, midweekTarget: 2, peakMax: 2 };
/** Upper bound on stored comps, so a public demo can't be flooded. */
const MAX_COMPS = 300;

export interface BookingRecord {
  id: string;
  date: string;
  covers: number;
  revenueUsd: number;
  note: string | null;
}

export interface CompMetrics {
  trackedRevenue: number;
  trackedCovers: number;
  /** tracked revenue ÷ comp menu value */
  returnRatio: number;
  /** (tracked revenue − direct cost) ÷ direct cost */
  roi: number;
  /** days from the comp to the first attributed booking */
  ttvDays: number | null;
  lift7: number;
  lift14: number;
  lift30: number;
  daysSince: number;
  leak: boolean;
}

export interface CompRecord {
  id: string;
  code: string;
  handle: string;
  creatorSource: string;
  date: string;
  day: string;
  covers: number;
  valueUsd: number;
  costUsd: number;
  status: "planned" | "completed";
  note: string | null;
  sample: boolean;
  bookings: BookingRecord[];
  metrics: CompMetrics;
}

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const dayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

export function normalizeHandle(raw: string): string | null {
  const h = raw.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(h) ? h : null;
}

export function compCode(handle: string) {
  return `COMP-CREATOR-${handle.replace(/^@/, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
}

function plain(v: any): any {
  if (neo4j.isInt(v)) return v.toNumber();
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

export function computeMetrics(comp: { date: string; valueUsd: number; costUsd: number; status: string }, bookings: BookingRecord[]): CompMetrics {
  const today = todayIso();
  const after = bookings.filter((b) => daysBetween(comp.date, b.date) >= 0);
  const trackedRevenue = after.reduce((s, b) => s + b.revenueUsd, 0);
  const trackedCovers = after.reduce((s, b) => s + b.covers, 0);
  const within = (n: number) => after.filter((b) => daysBetween(comp.date, b.date) <= n).reduce((s, b) => s + b.revenueUsd, 0);
  const firsts = after.map((b) => daysBetween(comp.date, b.date)).sort((a, b) => a - b);
  const daysSince = daysBetween(comp.date, today);
  const returnRatio = comp.valueUsd > 0 ? trackedRevenue / comp.valueUsd : 0;
  return {
    trackedRevenue,
    trackedCovers,
    returnRatio: Math.round(returnRatio * 100) / 100,
    roi: comp.costUsd > 0 ? Math.round(((trackedRevenue - comp.costUsd) / comp.costUsd) * 100) / 100 : 0,
    ttvDays: firsts.length ? firsts[0] : null,
    lift7: within(7),
    lift14: within(14),
    lift30: within(30),
    daysSince,
    leak: comp.status === "completed" && daysSince >= LEAK_AFTER_DAYS && returnRatio < LEAK_RATIO,
  };
}

async function read(driver: Driver, cypher: string, params: Record<string, unknown>) {
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const res = await session.run(cypher, params, { timeout: 12000 });
    return res.records.map((r) => plain(r.toObject()));
  } finally {
    await session.close();
  }
}

async function write(driver: Driver, cypher: string, params: Record<string, unknown>) {
  const session = driver.session();
  try {
    const res = await session.executeWrite((tx) => tx.run(cypher, params), { timeout: 12000 });
    return res.records.map((r) => plain(r.toObject()));
  } finally {
    await session.close();
  }
}

export async function listComps(driver: Driver, rid = DEFAULT_RESTAURANT_ID): Promise<CompRecord[]> {
  await ensureHospitalitySeed(driver, rid);
  const rows = await read(
    driver,
    `MATCH (r:Restaurant {id: $rid})-[:GAVE]->(cp:Comp)-[:FOR]->(c:LocalCreator)
     OPTIONAL MATCH (b:Booking)-[:ATTRIBUTED_TO]->(cp)
     WITH cp, c, b ORDER BY b.date
     RETURN cp {.*} AS comp, c.handle AS handle, coalesce(c.source, 'seed') AS creatorSource,
            [x IN collect(b) WHERE x IS NOT NULL | x {.*}] AS bookings
     ORDER BY comp.date DESC`,
    { rid }
  );
  return rows.map((r: any) => {
    const cp = r.comp;
    const bookings: BookingRecord[] = r.bookings.map((b: any) => ({
      id: b.id, date: b.date, covers: b.covers ?? 0, revenueUsd: b.revenue_usd ?? 0, note: b.note ?? null,
    }));
    const base = { date: cp.date, valueUsd: cp.value_usd, costUsd: cp.cost_usd, status: cp.status };
    return {
      id: cp.id, code: cp.code, handle: r.handle, creatorSource: r.creatorSource, date: cp.date, day: DAY[dayOf(cp.date)],
      covers: cp.covers, valueUsd: cp.value_usd, costUsd: cp.cost_usd, status: cp.status, note: cp.note ?? null,
      sample: Boolean(cp.sample), bookings, metrics: computeMetrics(base, bookings),
    };
  });
}

/** Per-creator totals across completed comps, for the scorecard. */
export function creatorReturns(comps: CompRecord[]) {
  const by = new Map<string, { value: number; tracked: number; ttv: number[]; leaks: number; completed: number }>();
  for (const c of comps) {
    if (c.status !== "completed") continue;
    const e = by.get(c.handle) ?? { value: 0, tracked: 0, ttv: [], leaks: 0, completed: 0 };
    e.value += c.valueUsd;
    e.tracked += c.metrics.trackedRevenue;
    if (c.metrics.ttvDays !== null) e.ttv.push(c.metrics.ttvDays);
    if (c.metrics.leak) e.leaks += 1;
    e.completed += 1;
    by.set(c.handle, e);
  }
  return by;
}

// ---------------------------------------------------------------------------
// Weekly slot cadence: Tue/Wed carry 2–3 creators; Thu–Sun cap at 1–2 in total (PM brief §5)
// ---------------------------------------------------------------------------

export interface CadenceWeek {
  weekStart: string;
  midweek: { used: number; max: number; target: number };
  peak: { used: number; max: number };
  other: number;
}

export function weekStartOf(iso: string) {
  const d = dayOf(iso); // 0 = Sunday
  return addDays(iso, -((d + 6) % 7)); // Monday
}

export function slotKind(iso: string): "midweek" | "peak" | "other" {
  const d = dayOf(iso);
  if (d === 2 || d === 3) return "midweek";
  if (d === 0 || d >= 4) return "peak";
  return "other";
}

export function cadenceFor(comps: CompRecord[], weekStart: string): CadenceWeek {
  const end = addDays(weekStart, 6);
  const inWeek = comps.filter((c) => c.date >= weekStart && c.date <= end);
  return {
    weekStart,
    midweek: { used: inWeek.filter((c) => slotKind(c.date) === "midweek").length, max: CADENCE.midweekMax, target: CADENCE.midweekTarget },
    peak: { used: inWeek.filter((c) => slotKind(c.date) === "peak").length, max: CADENCE.peakMax },
    other: inWeek.filter((c) => slotKind(c.date) === "other").length,
  };
}

/** Why a new comp on this date would break the cadence, or null if it fits. */
export function cadenceViolation(comps: CompRecord[], date: string): string | null {
  const w = cadenceFor(comps, weekStartOf(date));
  const kind = slotKind(date);
  if (kind === "midweek" && w.midweek.used >= w.midweek.max)
    return `Tue/Wed already has ${w.midweek.used} creators that week (max ${w.midweek.max}).`;
  if (kind === "peak" && w.peak.used >= w.peak.max)
    return `Thu–Sun already has ${w.peak.used} creators that week (cap ${w.peak.max}). Peak nights stay protected.`;
  return null;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface NewComp {
  handle: string;
  date: string;
  covers: number;
  valueUsd: number;
  status: "planned" | "completed";
  note?: string;
  override?: boolean;
}

export async function createComp(driver: Driver, input: NewComp, rid = DEFAULT_RESTAURANT_ID): Promise<{ comp?: CompRecord; error?: string; cadence?: string }> {
  await ensureHospitalitySeed(driver, rid);
  const handle = normalizeHandle(input.handle);
  if (!handle) return { error: "Enter a valid Instagram handle." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { error: "Pick a date." };
  if (Math.abs(daysBetween(todayIso(), input.date)) > 365) return { error: "Pick a date within a year of today." };
  const covers = Math.round(Number(input.covers));
  const value = Math.round(Number(input.valueUsd) * 100) / 100;
  if (!(covers >= 1 && covers <= 20)) return { error: "Covers must be between 1 and 20." };
  if (!(value > 0 && value <= 5000)) return { error: "Comp value must be between $1 and $5,000." };

  // The creator must already be in the graph (checked or scanned) and not discontinued
  const found = await read(
    driver,
    `MATCH (c:LocalCreator {handle: $at}) RETURN coalesce(c.status, 'active') AS status`,
    { at: `@${handle}` }
  );
  if (!found.length) return { error: `@${handle} isn't in the graph yet. Check or scan them first.` };
  if (found[0].status === "discontinued") return { error: `@${handle} is discontinued. Reinstate them before planning a comp.` };

  const existing = await listComps(driver, rid);
  if (existing.length >= MAX_COMPS) return { error: "The ledger is full for this demo. Remove sample data or old comps first." };
  const violation = cadenceViolation(existing, input.date);
  if (violation && !input.override) return { cadence: violation };

  const id = `comp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const rows = await write(
    driver,
    `MATCH (r:Restaurant {id: $rid})
     MATCH (c:LocalCreator {handle: $at})
     WHERE coalesce(c.status, 'active') <> 'discontinued'
     CREATE (cp:Comp {id: $id, code: $code, date: $date, covers: $covers, value_usd: $value, cost_usd: $cost,
                      status: $status, note: $note, sample: false, overrode_cadence: $overrode, created_at: datetime()})
     CREATE (r)-[:GAVE]->(cp)
     CREATE (cp)-[:FOR]->(c)
     RETURN cp.id AS id`,
    {
      rid, at: `@${handle}`, id, code: compCode(handle), date: input.date, covers, value,
      cost: Math.round(value * PRIME_COST_RATE * 100) / 100, status: input.status === "completed" ? "completed" : "planned",
      note: (input.note ?? "").slice(0, 200) || null, overrode: Boolean(violation && input.override),
    }
  );
  if (!rows.length) return { error: `@${handle} isn't in the graph, or is discontinued. Check or scan them first.` };
  const comp = (await listComps(driver, rid)).find((c) => c.id === id);
  return { comp };
}

export async function addBooking(driver: Driver, compId: string, b: { date: string; covers: number; revenueUsd: number; note?: string }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.date)) return { error: "Pick a booking date." };
  const covers = Math.round(Number(b.covers));
  const revenue = Math.round(Number(b.revenueUsd) * 100) / 100;
  if (!(covers >= 0 && covers <= 50)) return { error: "Covers must be between 0 and 50." };
  if (!(revenue >= 0 && revenue <= 20000)) return { error: "Revenue must be between $0 and $20,000." };
  const rows = await write(
    driver,
    `MATCH (cp:Comp {id: $compId})
     WHERE $date >= cp.date
     CREATE (b:Booking {id: $id, date: $date, covers: $covers, revenue_usd: $revenue, note: $note, sample: false, created_at: datetime()})
     CREATE (b)-[:ATTRIBUTED_TO]->(cp)
     SET cp.status = 'completed'
     RETURN b.id AS id`,
    { compId, id: `bk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, date: b.date, covers, revenue, note: (b.note ?? "").slice(0, 200) || null }
  );
  return rows.length ? { ok: true } : { error: "That comp doesn't exist, or the booking is dated before the comp." };
}

export async function setCompStatus(driver: Driver, compId: string, action: "complete" | "delete") {
  if (action === "delete") {
    await write(driver, `MATCH (cp:Comp {id: $compId}) OPTIONAL MATCH (b:Booking)-[:ATTRIBUTED_TO]->(cp) DETACH DELETE b, cp`, { compId });
  } else {
    await write(driver, `MATCH (cp:Comp {id: $compId}) SET cp.status = 'completed'`, { compId });
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Discontinue + Soft Off-Ramp (PM brief §3, §6)
// ---------------------------------------------------------------------------

export function softOffRampDm(handle: string, restaurant: string) {
  const name = handle.replace(/^@/, "");
  return `Hi ${name}, thank you so much for coming in to ${restaurant} and for the love you've shown our team. We're changing how we run hosted visits for a while, so we won't be setting up another comped tasting right now. You're always welcome back as our guest, and if you'd ever like a table, just reply here and we'll take care of the reservation. Thanks again, the ${restaurant} team`;
}

export async function setCreatorStatus(driver: Driver, handleRaw: string, action: "discontinue" | "reinstate", reason?: string, rid = DEFAULT_RESTAURANT_ID) {
  const handle = normalizeHandle(handleRaw);
  if (!handle) return { error: "Invalid handle." };
  const rows = await write(
    driver,
    action === "discontinue"
      ? `MATCH (c:LocalCreator {handle: $at}) SET c.status = 'discontinued', c.discontinued_at = toString(date()), c.discontinue_reason = $reason RETURN c.handle AS handle`
      : `MATCH (c:LocalCreator {handle: $at}) SET c.status = 'active' REMOVE c.discontinued_at, c.discontinue_reason RETURN c.handle AS handle`,
    { at: `@${handle}`, reason: (reason ?? "").slice(0, 200) || null }
  );
  if (!rows.length) return { error: `@${handle} isn't in the graph.` };
  const restaurant = await getRestaurant(driver, rid);
  return { ok: true, handle: `@${handle}`, offRampDm: action === "discontinue" ? softOffRampDm(handle, restaurant.name) : null };
}

// ---------------------------------------------------------------------------
// Demo data: clearly labeled FICTIONAL creators, comps and bookings
// ---------------------------------------------------------------------------

export async function loadSample(driver: Driver, rid = DEFAULT_RESTAURANT_ID) {
  await ensureHospitalitySeed(driver, rid);
  await clearSample(driver);
  const t = todayIso();
  // Most recent Tuesday on or before (today - 7): a completed comp whose window has had time to play out
  const lastTue = (() => { let d = addDays(t, -9); while (dayOf(d) !== 2) d = addDays(d, -1); return d; })();
  const nextTue = (() => { let d = addDays(t, 1); while (dayOf(d) !== 2) d = addDays(d, 1); return d; })();
  const lastFri = (() => { let d = addDays(t, -10); while (dayOf(d) !== 5) d = addDays(d, -1); return d; })();
  const creators = [
    { id: "sample-hkfoodie", handle: "@sample.hkfoodie", followers: 14200, local: 82, eng: 5.2, covers: ["Korean", "Desserts"] },
    { id: "sample-dinnerdiaries", handle: "@sample.dinnerdiaries", followers: 27500, local: 74, eng: 2.1, covers: ["Italian"] },
    { id: "sample-midtownmunch", handle: "@sample.midtownmunch", followers: 9100, local: 71, eng: 3.8, covers: ["Korean"] },
  ];
  const posts = [
    { id: "sample-post-1", creator: "sample-hkfoodie", place: rid, days: 11, caption: "SAMPLE: #gifted tasting at Kochi, the tuna bibimbap is unreal" },
    { id: "sample-post-2", creator: "sample-hkfoodie", place: "place-hell-s-kitchen", days: 4, caption: "SAMPLE: Hell's Kitchen dinner crawl" },
    { id: "sample-post-3", creator: "sample-dinnerdiaries", place: rid, days: 8, caption: "SAMPLE: date night skewers" },
    { id: "sample-post-4", creator: "sample-midtownmunch", place: "place-midtown", days: 3, caption: "SAMPLE: Midtown lunch run" },
  ];
  const comps = [
    { id: "sample-comp-1", creator: "sample-hkfoodie", handle: "sample.hkfoodie", date: lastTue, covers: 2, value: 290, status: "completed" },
    { id: "sample-comp-2", creator: "sample-dinnerdiaries", handle: "sample.dinnerdiaries", date: lastFri, covers: 2, value: 350, status: "completed" },
    { id: "sample-comp-3", creator: "sample-dinnerdiaries", handle: "sample.dinnerdiaries", date: addDays(lastFri, 1), covers: 1, value: 150, status: "completed" },
    { id: "sample-comp-4", creator: "sample-midtownmunch", handle: "sample.midtownmunch", date: nextTue, covers: 2, value: 290, status: "planned" },
  ];
  const bookings = [
    { id: "sample-bk-1", comp: "sample-comp-1", date: addDays(lastTue, 3), covers: 4, revenue: 580, note: "SAMPLE: booked with the creator's link" },
    { id: "sample-bk-2", comp: "sample-comp-1", date: addDays(lastTue, 5), covers: 2, revenue: 320, note: "SAMPLE: code at the POS" },
    { id: "sample-bk-3", comp: "sample-comp-2", date: addDays(lastFri, 6), covers: 0, revenue: 10, note: "SAMPLE: one bar add-on with the code" },
  ];
  await write(
    driver,
    `MATCH (r:Restaurant {id: $rid})
     UNWIND $creators AS c
     MERGE (lc:LocalCreator {id: c.id})
     SET lc.handle = c.handle, lc.followers = c.followers, lc.local_audience_pct = c.local, lc.engagement_rate = c.eng,
         lc.source = 'sample', lc.status = 'active'
     WITH r, lc, c
     UNWIND c.covers AS cu
     MATCH (k:Cuisine {name: cu})
     MERGE (lc)-[:COVERS]->(k)`,
    { rid, creators }
  );
  await write(
    driver,
    `UNWIND $posts AS p
     MATCH (lc:LocalCreator {id: p.creator}), (pl:Place {id: p.place})
     MERGE (post:Post {id: p.id})
     SET post.posted_at = datetime() - duration({days: p.days}), post.caption = p.caption, post.sponsored = false,
         post.source = 'sample', post.likes = 0
     MERGE (lc)-[:POSTED]->(post)
     MERGE (post)-[:AT]->(pl)`,
    { posts }
  );
  await write(
    driver,
    `MATCH (r:Restaurant {id: $rid})
     UNWIND $comps AS x
     MATCH (lc:LocalCreator {id: x.creator})
     MERGE (cp:Comp {id: x.id})
     SET cp.code = x.code, cp.date = x.date, cp.covers = x.covers, cp.value_usd = x.value, cp.cost_usd = x.cost,
         cp.status = x.status, cp.sample = true, cp.note = 'SAMPLE data'
     MERGE (r)-[:GAVE]->(cp)
     MERGE (cp)-[:FOR]->(lc)`,
    { rid, comps: comps.map((c) => ({ ...c, code: compCode(c.handle), cost: Math.round(c.value * PRIME_COST_RATE * 100) / 100 })) }
  );
  await write(
    driver,
    `UNWIND $bookings AS b
     MATCH (cp:Comp {id: b.comp})
     MERGE (bk:Booking {id: b.id})
     SET bk.date = b.date, bk.covers = b.covers, bk.revenue_usd = b.revenue, bk.note = b.note, bk.sample = true
     MERGE (bk)-[:ATTRIBUTED_TO]->(cp)`,
    { bookings }
  );
  return { ok: true, creators: creators.length, comps: comps.length, bookings: bookings.length };
}

export async function clearSample(driver: Driver) {
  await write(
    driver,
    `OPTIONAL MATCH (b:Booking {sample: true}) DETACH DELETE b
     WITH 1 AS _
     OPTIONAL MATCH (cp:Comp {sample: true}) DETACH DELETE cp
     WITH 1 AS _
     OPTIONAL MATCH (c:LocalCreator {source: 'sample'})
     OPTIONAL MATCH (c)-[:POSTED]->(p:Post)
     DETACH DELETE p, c`,
    {}
  );
  return { ok: true };
}
