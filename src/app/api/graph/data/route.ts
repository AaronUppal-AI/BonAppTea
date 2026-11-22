import { getGraphView } from "@/lib/hospitalityGraph";
import { graphRoute } from "@/lib/routeUtils";

export const dynamic = "force-dynamic";

// Read-only. The old POST handler that ran arbitrary Cypher from the browser was removed.
export async function GET() {
  return graphRoute(async (driver) => ({ ...(await getGraphView(driver)), source: "Neo4j AuraDB" }));
}
