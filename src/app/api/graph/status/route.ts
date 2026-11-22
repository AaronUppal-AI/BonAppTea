import { NextResponse } from "next/server";
import { verifyNeo4jConnection, getNeo4jDriver } from "@/lib/neo4jClient";
import { ensureHospitalitySeed, DEFAULT_RESTAURANT_ID } from "@/lib/hospitalityGraph";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await verifyNeo4jConnection();
  return NextResponse.json({ neo4j: status });
}

/** Seeds the demo restaurant graph if it is missing or out of date (idempotent). */
export async function POST() {
  const driver = getNeo4jDriver();
  if (!driver) return NextResponse.json({ success: false, message: "Neo4j is not configured" }, { status: 503 });
  try {
    await ensureHospitalitySeed(driver, DEFAULT_RESTAURANT_ID);
    return NextResponse.json({ success: true, message: "Restaurant graph is seeded" });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message }, { status: 502 });
  }
}
