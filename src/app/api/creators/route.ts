import { getRestaurant, getCreatorVetting, getPostPlans, CREATOR_VETTING_CYPHER } from "@/lib/hospitalityGraph";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  return graphRoute(async (driver) => {
    const [restaurant, creators, plans] = await Promise.all([
      getRestaurant(driver),
      getCreatorVetting(driver),
      getPostPlans(driver),
    ]);
    const featuredDish = plans.find((p) => p.best)?.dish ?? plans[0]?.dish ?? null;
    return { restaurant, creators, featuredDish, cypher: CREATOR_VETTING_CYPHER.trim() };
  });
}
