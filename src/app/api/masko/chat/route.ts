import { NextRequest, NextResponse } from "next/server";
import { getNeo4jDriver } from "@/lib/neo4jClient";
import { answerWithGraph, DEFAULT_RESTAURANT_ID } from "@/lib/hospitalityGraph";

// Chef Pepper: the BonAppTea Masko mascot (mascot id 9321515e-95e2-4367-8f09-185e05c6988c).
const MASCOT = {
  avatarId: "9321515e-95e2-4367-8f09-185e05c6988c",
  mascotName: "Chef Pepper",
  imageUrl: "/masko/chef-pepper.png",
};

export async function POST(req: NextRequest) {
  let message = "";
  let restaurantId = DEFAULT_RESTAURANT_ID;
  try {
    const body = await req.json();
    message = String(body?.message ?? "");
    if (typeof body?.restaurantId === "string" && body.restaurantId) restaurantId = body.restaurantId;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body with a message" }, { status: 400 });
  }

  const driver = getNeo4jDriver();
  if (!driver) {
    return NextResponse.json({
      ...MASCOT,
      speech: "My kitchen graph is offline. Add the Neo4j credentials to .env.local and I'll be cooking with real data.",
      mood: "alert",
      graph: null,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const answer = await answerWithGraph(driver, message, restaurantId);
    return NextResponse.json({ ...MASCOT, ...answer, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("Chef Pepper GraphRAG query failed:", error);
    return NextResponse.json(
      {
        ...MASCOT,
        speech: "I couldn't reach the kitchen graph just now. Give me a second and ask again.",
        mood: "alert",
        graph: null,
        error: error?.message || "Graph query failed",
        timestamp: new Date().toISOString(),
      },
      { status: 502 }
    );
  }
}
