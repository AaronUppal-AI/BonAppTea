import { NextRequest, NextResponse } from "next/server";
import { addBooking, setCompStatus } from "@/lib/comps";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

/** Add an attributed booking, mark a comp completed, or delete it. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }
  const id = String(params.id).slice(0, 80);
  return graphRoute(async (driver) => {
    if (body?.action === "booking") {
      const res = await addBooking(driver, id, {
        date: String(body?.date ?? ""), covers: Number(body?.covers), revenueUsd: Number(body?.revenueUsd), note: body?.note,
      });
      if ("error" in res && res.error) throw Object.assign(new Error(res.error), { userFacing: true });
      return res;
    }
    return setCompStatus(driver, id, body?.action === "delete" ? "delete" : "complete");
  });
}
