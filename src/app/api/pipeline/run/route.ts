import { NextRequest, NextResponse } from "next/server";
import { getNeo4jDriver } from "@/lib/neo4jClient";
import { getRestaurant, getTrendBoard, recordTrendEvidence } from "@/lib/hospitalityGraph";
import { discoverRivals } from "@/lib/rivalDiscovery";
import { discoverCreators } from "@/lib/creatorDiscovery";
import { trendEvidence } from "@/lib/youSearch";
import { isTregConfigured } from "@/lib/tregClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs the full data pipeline for the seeded restaurant:
 *   1. Rivals + their recent Google reviews (Treg) → Competitor / Complaint / Theme
 *   2. Creators who posted from the restaurant + neighborhood hashtags (Treg) → LocalCreator / Post / Place
 *   3. Live web evidence for every trend (You.com) → WebSource
 * Costs a few cents in Treg calls, so it is disabled in production unless PIPELINE_TOKEN is set and sent.
 */
export async function POST(req: NextRequest) {
  const token = process.env.PIPELINE_TOKEN;
  if (process.env.NODE_ENV === "production" && (!token || req.headers.get("x-pipeline-token") !== token)) {
    return NextResponse.json({ error: "Pipeline runs are disabled here" }, { status: 403 });
  }
  const driver = getNeo4jDriver();
  if (!driver) return NextResponse.json({ error: "Neo4j is not configured" }, { status: 503 });
  if (!isTregConfigured()) return NextResponse.json({ error: "TREG_API_KEY is not set" }, { status: 503 });

  const steps = (req.nextUrl.searchParams.get("steps") ?? "rivals,creators,trends").split(",");
  const out: Record<string, unknown> = {};
  try {
    const restaurant = await getRestaurant(driver);
    out.restaurant = restaurant.name;
    if (steps.includes("rivals")) out.rivals = await discoverRivals(driver);
    if (steps.includes("creators")) out.creators = await discoverCreators(driver, { force: true });
    if (steps.includes("trends")) {
      const board = await getTrendBoard(driver);
      out.trends = await Promise.all(
        board.map(async (t) => {
          const ev = await trendEvidence(t.name);
          if (ev.live && ev.sources.length) await recordTrendEvidence(driver, t.name, ev.sources);
          return { trend: t.name, live: ev.live, sources: ev.sources.length, error: ev.error };
        })
      );
    }
    return NextResponse.json(out);
  } catch (error: any) {
    console.error("Pipeline failed:", error);
    return NextResponse.json({ ...out, error: error?.message ?? "Pipeline failed" }, { status: 502 });
  }
}
