import { getRestaurant, getCreatorVetting, getPostPlans, CREATOR_VETTING_CYPHER } from "@/lib/hospitalityGraph";
import { graphRoute } from "@/lib/routeUtils";
import { getLastScan, SCAN_COOLDOWN_MS } from "@/lib/creatorDiscovery";
import { isTregConfigured } from "@/lib/tregClient";

export const dynamic = "force-dynamic";

export async function GET() {
  return graphRoute(async (driver) => {
    const [restaurant, creators, plans, lastScan] = await Promise.all([
      getRestaurant(driver),
      getCreatorVetting(driver),
      getPostPlans(driver),
      getLastScan(driver),
    ]);
    const featuredDish = plans.find((p) => p.best)?.dish ?? plans[0]?.dish ?? null;
    const nextScanAt = lastScan.at ? new Date(new Date(lastScan.at).getTime() + SCAN_COOLDOWN_MS).toISOString() : null;
    return {
      restaurant,
      creators,
      featuredDish,
      cypher: CREATOR_VETTING_CYPHER.trim(),
      scan: { tregConfigured: isTregConfigured(), lastScanAt: lastScan.at, lastScanCostUsd: lastScan.cost, nextScanAt },
    };
  });
}
