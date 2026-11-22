import { NextRequest, NextResponse } from "next/server";
import { checkCreator } from "@/lib/creatorCheck";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

/** Under-10-second live-web creator check: You.com sources, graph facts, disclosure flags. */
export async function POST(req: NextRequest) {
  let handle = "";
  try {
    handle = String((await req.json())?.handle ?? "").slice(0, 40);
  } catch {
    return NextResponse.json({ error: "Expected a JSON body with a handle" }, { status: 400 });
  }
  return graphRoute(async (driver) => {
    const result = await checkCreator(driver, handle);
    if ("error" in result) throw Object.assign(new Error(result.error), { userFacing: true });
    return result;
  });
}
