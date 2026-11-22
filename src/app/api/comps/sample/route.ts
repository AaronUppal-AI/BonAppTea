import { NextRequest } from "next/server";
import { loadSample, clearSample } from "@/lib/comps";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

/** Load or remove clearly labeled FICTIONAL demo creators, comps and bookings. */
export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") === "clear" ? "clear" : "load";
  return graphRoute((driver) => (action === "clear" ? clearSample(driver) : loadSample(driver)));
}
