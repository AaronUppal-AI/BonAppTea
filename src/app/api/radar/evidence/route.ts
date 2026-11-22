import { NextRequest, NextResponse } from "next/server";
import { trendEvidence } from "@/lib/youSearch";
import { cleanParam } from "@/lib/routeUtils";
import { getNeo4jDriver } from "@/lib/neo4jClient";
import { recordTrendEvidence } from "@/lib/hospitalityGraph";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const trend = cleanParam(req.nextUrl.searchParams.get("trend"));
  if (!trend) return NextResponse.json({ error: "Missing trend" }, { status: 400 });
  const result = await trendEvidence(trend);

  // Store the evidence in the graph: (FoodTrend)-[:EVIDENCED_BY]->(WebSource)
  let storedInGraph = false;
  const driver = getNeo4jDriver();
  if (driver && result.live && result.sources.length) {
    try {
      await recordTrendEvidence(driver, trend, result.sources);
      storedInGraph = true;
    } catch (e) {
      console.warn("Could not store trend evidence in Neo4j:", e);
    }
  }
  return NextResponse.json({ ...result, storedInGraph });
}
