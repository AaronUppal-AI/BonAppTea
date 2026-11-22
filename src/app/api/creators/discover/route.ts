import { NextRequest } from "next/server";
import { discoverCreators } from "@/lib/creatorDiscovery";
import { isTregConfigured } from "@/lib/tregClient";
import { graphRoute } from "@/lib/routeUtils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
// Hashtag search + profile and post lookups take ~20-40s through Treg.
export const maxDuration = 60;

/**
 * Runs a live Treg creator scan and writes the results into Neo4j.
 * Limited to one scan per 6 hours (stored in the graph) so public traffic cannot drain the Treg balance.
 * `?force=1` bypasses the cooldown only outside production.
 */
export async function POST(req: NextRequest) {
  if (!isTregConfigured()) {
    return NextResponse.json({ error: "TREG_API_KEY is not set" }, { status: 503 });
  }
  const force = process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("force") === "1";
  return graphRoute((driver) => discoverCreators(driver, { force }) as Promise<object>);
}
