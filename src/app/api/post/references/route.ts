import { NextRequest, NextResponse } from "next/server";
import { filmingReferences } from "@/lib/youSearch";
import { cleanParam } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const dish = cleanParam(req.nextUrl.searchParams.get("dish"));
  const trend = cleanParam(req.nextUrl.searchParams.get("trend"));
  if (!dish || !trend) return NextResponse.json({ error: "Missing dish or trend" }, { status: 400 });
  return NextResponse.json(await filmingReferences(dish, trend));
}
