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
    // Validation messages written for owners pass straight through; anything else is translated
    if (error?.userFacing) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: friendlyGraphError(error) }, { status: 502 });
  }
}

export function cleanParam(value: string | null, max = 120): string {
  return (value ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

/** Owners see a plain sentence; the technical detail stays in the server log. */
export function friendlyGraphError(error: any): string {
  const msg = String(error?.message ?? "");
  const code = String(error?.code ?? "");
  if (/ServiceUnavailable|SessionExpired/.test(code) || /routing|discovery|ECONNREFUSED|ENOTFOUND|connect|socket/i.test(msg)) {
    return "The knowledge graph (Neo4j) isn't reachable right now. Try again in a moment.";
  }
  if (/timeout|timed out|TransactionTimedOut/i.test(msg + code)) {
    return "The knowledge graph took too long to answer. Try again in a moment.";
  }
  return "Something went wrong reading the knowledge graph. Try again in a moment.";
}
