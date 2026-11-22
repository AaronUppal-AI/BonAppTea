import { getInsights, INSIGHT_CYPHER } from "@/lib/hospitalityGraph";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

/** Multi-hop "opportunity paths" through the graph, each with the node and relationship ids to highlight. */
export async function GET() {
  return graphRoute(async (driver) => ({
    insights: await getInsights(driver),
    cypher: Object.fromEntries(Object.entries(INSIGHT_CYPHER).map(([k, v]) => [k, v.trim()])),
  }));
}
