import { NextResponse } from "next/server";
import { verifyNeo4jConnection } from "@/lib/neo4jClient";
import { isYouConfigured } from "@/lib/youSearch";

export const dynamic = "force-dynamic";

/** Which services the server is configured for. Never returns key values. */
export async function GET() {
  const neo4j = await verifyNeo4jConnection();
  return NextResponse.json({
    neo4j: { connected: neo4j.connected, detail: neo4j.connected ? neo4j.serverInfo : neo4j.error },
    youCom: { configured: isYouConfigured() },
    masko: { configured: Boolean(process.env.MASKO_API_KEY) },
    treg: { configured: Boolean(process.env.TREG_API_KEY) },
  });
}
