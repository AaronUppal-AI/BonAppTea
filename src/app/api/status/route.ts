import { NextRequest, NextResponse } from "next/server";
import { verifyNeo4jConnection } from "@/lib/neo4jClient";
import { isYouConfigured } from "@/lib/youSearch";

export const dynamic = "force-dynamic";

/**
 * Which services the server is configured for. Never returns key values.
 * Instant by default (configuration only); `?check=1` also pings Neo4j.
 */
export async function GET(req: NextRequest) {
  const neo4jConfigured = Boolean(process.env.NEO4J_URI && process.env.NEO4J_PASSWORD);
  const check = req.nextUrl.searchParams.get("check") === "1";
  const neo4j = check && neo4jConfigured ? await verifyNeo4jConnection() : null;
  return NextResponse.json({
    neo4j: {
      connected: neo4j ? neo4j.connected : neo4jConfigured,
      checked: Boolean(neo4j),
      detail: neo4j ? (neo4j.connected ? neo4j.serverInfo : neo4j.error) : undefined,
    },
    youCom: { configured: isYouConfigured() },
    masko: { configured: Boolean(process.env.MASKO_API_KEY) },
    treg: { configured: Boolean(process.env.TREG_API_KEY) },
  });
}
