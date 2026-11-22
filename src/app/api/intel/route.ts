import { getRestaurant, getRivalIntel, getFreshness, RIVAL_INTEL_CYPHER } from "@/lib/hospitalityGraph";
import { neighborhoodBuzz } from "@/lib/youSearch";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  return graphRoute(async (driver) => {
    const restaurant = await getRestaurant(driver);
    const [rivals, buzz, freshness] = await Promise.all([
      getRivalIntel(driver),
      neighborhoodBuzz(restaurant.neighborhood, restaurant.city),
      getFreshness(driver),
    ]);
    return { restaurant, rivals, buzz, freshness: [freshness.rivals], cypher: RIVAL_INTEL_CYPHER.trim() };
  });
}
