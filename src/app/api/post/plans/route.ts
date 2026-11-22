import { getRestaurant, getPostPlans, POST_PLANS_CYPHER } from "@/lib/hospitalityGraph";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  return graphRoute(async (driver) => {
    const [restaurant, plans] = await Promise.all([getRestaurant(driver), getPostPlans(driver)]);
    return { restaurant, plans, cypher: POST_PLANS_CYPHER.trim() };
  });
}
