import { getRestaurant, getTrendBoard, getFreshness, TREND_BOARD_CYPHER } from "@/lib/hospitalityGraph";
import { cityFoodPulse } from "@/lib/youSearch";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  return graphRoute(async (driver) => {
    const restaurant = await getRestaurant(driver);
    const [trends, pulse, freshness] = await Promise.all([getTrendBoard(driver), cityFoodPulse(restaurant.city), getFreshness(driver)]);
    return { restaurant, trends, pulse, freshness: [freshness.menu, freshness.trendProof], cypher: TREND_BOARD_CYPHER.trim() };
  });
}
