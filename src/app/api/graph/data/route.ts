import { NextRequest, NextResponse } from "next/server";
import { graphStore } from "@/lib/graphStore";
import { getNeo4jDriver } from "@/lib/neo4jClient";
import { GraphNode, GraphEdge } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const driver = getNeo4jDriver();

  if (driver) {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
        LIMIT 50
      `);

      const nodesMap = new Map<string, GraphNode>();
      const edgesList: GraphEdge[] = [];

      result.records.forEach((record) => {
        const n = record.get("n");
        const r = record.get("r");
        const m = record.get("m");

        if (n && !nodesMap.has(n.properties.id || n.identity.toString())) {
          const labels = n.labels || [];
          const labelType = labels[0]?.toLowerCase() || "node";
          const id = n.properties.id || n.properties.name || n.properties.url || n.identity.toString();
          const displayLabel = n.properties.name || n.properties.keyword || n.properties.title || n.properties.text || id;

          nodesMap.set(id, {
            id,
            label: displayLabel,
            type: labelType.includes("creator") ? "creator" :
                  labelType.includes("trend") ? "trend" :
                  labelType.includes("source") ? "source" :
                  labelType.includes("brand") ? "brand" :
                  labelType.includes("claim") ? "claim" :
                  labelType.includes("niche") ? "niche" : "format",
            status: n.properties.status || "active",
            details: n.properties,
          });
        }

        if (m && !nodesMap.has(m.properties.id || m.identity.toString())) {
          const labels = m.labels || [];
          const labelType = labels[0]?.toLowerCase() || "node";
          const id = m.properties.id || m.properties.name || m.properties.url || m.identity.toString();
          const displayLabel = m.properties.name || m.properties.keyword || m.properties.title || m.properties.text || id;

          nodesMap.set(id, {
            id,
            label: displayLabel,
            type: labelType.includes("creator") ? "creator" :
                  labelType.includes("trend") ? "trend" :
                  labelType.includes("source") ? "source" :
                  labelType.includes("brand") ? "brand" :
                  labelType.includes("claim") ? "claim" :
                  labelType.includes("niche") ? "niche" : "format",
            status: m.properties.status || "active",
            details: m.properties,
          });
        }

        if (r && n && m) {
          const sourceId = n.properties.id || n.properties.name || n.properties.url || n.identity.toString();
          const targetId = m.properties.id || m.properties.name || m.properties.url || m.identity.toString();
          edgesList.push({
            id: r.identity.toString(),
            source: sourceId,
            target: targetId,
            label: r.type,
          });
        }
      });

      if (nodesMap.size > 0) {
        return NextResponse.json({
          nodes: Array.from(nodesMap.values()),
          edges: edgesList,
          source: "Neo4j AuraDB Live (Connected)",
        });
      }
    } catch (e) {
      console.warn("Neo4j live query fallback to memory:", e);
    } finally {
      await session.close();
    }
  }

  // Fallback to in-memory graph
  const data = graphStore.getGraphData();
  return NextResponse.json({
    ...data,
    source: "BonAppTea Memory Engine",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) {
      return NextResponse.json({ error: "Missing Cypher query" }, { status: 400 });
    }

    const driver = getNeo4jDriver();
    if (driver) {
      const session = driver.session();
      try {
        const res = await session.run(query);
        const records = res.records.map((r) => r.toObject());
        return NextResponse.json({
          result: records,
          source: "Neo4j AuraDB Live",
        });
      } finally {
        await session.close();
      }
    }

    const result = graphStore.executeCypherQuery(query);
    return NextResponse.json({
      result,
      source: "BonAppTea Memory Engine",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Query failed" }, { status: 500 });
  }
}
