import { NextResponse } from "next/server";
import type { Driver } from "neo4j-driver";
import { getNeo4jDriver } from "./neo4jClient";

/** Runs a handler that needs Neo4j, returning a clear JSON error when the graph is unavailable. */
export async function graphRoute(handler: (driver: Driver) => Promise<object>) {
  const driver = getNeo4jDriver();
  if (!driver) {
    return NextResponse.json({ error: "Neo4j is not configured (set NEO4J_URI and NEO4J_PASSWORD)" }, { status: 503 });
  }
  try {
    return NextResponse.json(await handler(driver));
  } catch (error: any) {
    console.error("Graph route failed:", error);
    return NextResponse.json({ error: error?.message || "Graph query failed" }, { status: 502 });
  }
}

export function cleanParam(value: string | null, max = 120): string {
  return (value ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}
