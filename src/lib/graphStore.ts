import { GraphNode, GraphEdge } from "@/types";
import { INITIAL_GRAPH_NODES, INITIAL_GRAPH_EDGES } from "./mockData";

class GraphStore {
  private nodes: GraphNode[] = [...INITIAL_GRAPH_NODES];
  private edges: GraphEdge[] = [...INITIAL_GRAPH_EDGES];

  public getGraphData(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: [...this.nodes],
      edges: [...this.edges],
    };
  }

  public addNode(node: GraphNode): void {
    if (!this.nodes.some((n) => n.id === node.id)) {
      this.nodes.push(node);
    }
  }

  public addEdge(edge: GraphEdge): void {
    if (!this.edges.some((e) => e.id === edge.id)) {
      this.edges.push(edge);
    }
  }

  public updateNodeStatus(nodeId: string, status: GraphNode["status"]): void {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      node.status = status;
    }
  }

  public executeCypherQuery(cypherText: string): { results: any[]; affectedCount: number } {
    // High-level Cypher simulation for demo & visual feedback
    const lower = cypherText.toLowerCase();
    if (lower.includes("debunk") || lower.includes("robotics")) {
      this.updateNodeStatus("claim-robotics", "debunked");
      return {
        results: [
          {
            trend: "OpenAI Robotics Buyout",
            status: "DEBUNKED",
            source: "Reuters Denial Report",
            trustScore: 0.98,
          },
        ],
        affectedCount: 1,
      };
    }

    if (lower.includes("sponsors") || lower.includes("brand")) {
      return {
        results: [
          { brand: "Neon Database", budget: "Active Q1", format: "Podcast Pre-roll", cpm: 48 },
          { brand: "Together AI", budget: "Accelerating", format: "YouTube Integration", cpm: 62 },
        ],
        affectedCount: 2,
      };
    }

    return {
      results: this.nodes.slice(0, 5),
      affectedCount: this.nodes.length,
    };
  }
}

// Global singleton for Next.js dev server memory
declare global {
  var __plateOsGraphStore: GraphStore | undefined;
}

export const graphStore = global.__plateOsGraphStore || new GraphStore();
if (process.env.NODE_ENV !== "production") {
  global.__plateOsGraphStore = graphStore;
}
