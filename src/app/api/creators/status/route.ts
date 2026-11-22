import { NextRequest, NextResponse } from "next/server";
import { setCreatorStatus } from "@/lib/comps";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

/** Discontinue (with a Soft Off-Ramp DM) or reinstate a creator. */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }
  const action = body?.action === "reinstate" ? "reinstate" : "discontinue";
  return graphRoute(async (driver) => {
    const res = await setCreatorStatus(driver, String(body?.handle ?? ""), action, String(body?.reason ?? ""));
    if ("error" in res && res.error) throw Object.assign(new Error(res.error), { userFacing: true });
    return res;
  });
}
