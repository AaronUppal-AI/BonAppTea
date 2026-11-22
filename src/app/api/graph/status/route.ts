import { NextResponse } from "next/server";
import { verifyNeo4jConnection, seedLiveNeo4jDatabase } from "@/lib/neo4jClient";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await verifyNeo4jConnection();
  return NextResponse.json({
    neo4j: status,
    instanceUri: process.env.NEO4J_URI || "not-configured",
  });
}

export async function POST() {
  const seedResult = await seedLiveNeo4jDatabase();
  return NextResponse.json(seedResult);
}
