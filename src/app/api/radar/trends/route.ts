import { NextResponse } from "next/server";
import { MOCK_TRENDS } from "@/lib/mockData";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    trends: MOCK_TRENDS,
    telemetrySource: "Treg Gateway + You.com Index",
    lastSynced: new Date().toISOString(),
  });
}
