import { getRestaurant, getTrendBoard, TREND_BOARD_CYPHER } from "@/lib/hospitalityGraph";
import { cityFoodPulse } from "@/lib/youSearch";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  return graphRoute(async (driver) => {
    const restaurant = await getRestaurant(driver);
    const [trends, pulse] = await Promise.all([getTrendBoard(driver), cityFoodPulse(restaurant.city)]);
    return { restaurant, trends, pulse, cypher: TREND_BOARD_CYPHER.trim() };
  });
}
