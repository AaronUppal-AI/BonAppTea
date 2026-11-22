import { NextRequest, NextResponse } from "next/server";
import { listComps, createComp, cadenceFor, weekStartOf, addDays, todayIso, CADENCE, PRIME_COST_RATE } from "@/lib/comps";
import { getRestaurant } from "@/lib/hospitalityGraph";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

/** The comp ledger with ROI/TTV per comp, totals, and this week's and next week's slot cadence. */
export async function GET() {
  return graphRoute(async (driver) => {
    const [restaurant, comps] = await Promise.all([getRestaurant(driver), listComps(driver)]);
    const thisWeek = weekStartOf(todayIso());
    const completed = comps.filter((c) => c.status === "completed");
    const value = completed.reduce((s, c) => s + c.valueUsd, 0);
    const cost = completed.reduce((s, c) => s + c.costUsd, 0);
    const tracked = completed.reduce((s, c) => s + c.metrics.trackedRevenue, 0);
    const ttvs = completed.map((c) => c.metrics.ttvDays).filter((d): d is number => d !== null).sort((a, b) => a - b);
    return {
      restaurant: { name: restaurant.name, tastingPrice: restaurant.tastingPrice ?? null },
      comps,
      totals: {
        completed: completed.length,
        planned: comps.length - completed.length,
        compValue: value,
        directCost: Math.round(cost * 100) / 100,
        trackedRevenue: tracked,
        returnRatio: value ? Math.round((tracked / value) * 100) / 100 : null,
        medianTtvDays: ttvs.length ? ttvs[Math.floor(ttvs.length / 2)] : null,
        leaks: completed.filter((c) => c.metrics.leak).length,
      },
      cadence: [cadenceFor(comps, thisWeek), cadenceFor(comps, addDays(thisWeek, 7))],
      rules: { ...CADENCE, primeCostRate: PRIME_COST_RATE },
    };
  });
}

/** Log a comp (planned or completed). Enforces the weekly slot cadence unless overridden. */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }
  return graphRoute(async (driver) => {
    const res = await createComp(driver, {
      handle: String(body?.handle ?? ""),
      date: String(body?.date ?? ""),
      covers: Number(body?.covers),
      valueUsd: Number(body?.valueUsd),
      status: body?.status === "completed" ? "completed" : "planned",
      note: body?.note ? String(body.note) : undefined,
      override: Boolean(body?.override),
    });
    if (res.error) throw Object.assign(new Error(res.error), { userFacing: true });
    return res;
  });
}
