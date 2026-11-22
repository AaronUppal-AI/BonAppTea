import { NextRequest, NextResponse } from "next/server";
import { trendEvidence } from "@/lib/youSearch";
import { cleanParam } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const trend = cleanParam(req.nextUrl.searchParams.get("trend"));
  if (!trend) return NextResponse.json({ error: "Missing trend" }, { status: 400 });
  return NextResponse.json(await trendEvidence(trend));
}
