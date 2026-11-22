import { getRestaurant, getRivalIntel, RIVAL_INTEL_CYPHER } from "@/lib/hospitalityGraph";
import { neighborhoodBuzz } from "@/lib/youSearch";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  return graphRoute(async (driver) => {
    const restaurant = await getRestaurant(driver);
    const [rivals, buzz] = await Promise.all([
      getRivalIntel(driver),
      neighborhoodBuzz(restaurant.neighborhood, restaurant.city),
    ]);
    return { restaurant, rivals, buzz, cypher: RIVAL_INTEL_CYPHER.trim() };
  });
}
