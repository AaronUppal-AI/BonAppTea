import { getRestaurant, getPostPlans, getFreshness, POST_PLANS_CYPHER } from "@/lib/hospitalityGraph";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  return graphRoute(async (driver) => {
    const [restaurant, plans, freshness] = await Promise.all([getRestaurant(driver), getPostPlans(driver), getFreshness(driver)]);
    return { restaurant, plans, freshness: [freshness.menu, freshness.trendProof], cypher: POST_PLANS_CYPHER.trim() };
  });
}
