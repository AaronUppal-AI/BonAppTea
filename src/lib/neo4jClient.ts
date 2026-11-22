import neo4j, { Driver } from "neo4j-driver";

let driverInstance: Driver | null = null;

export function getNeo4jDriver(): Driver | null {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER || process.env.NEO4J_USERNAME || "neo4j";
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !password) {
    return null;
  }

  if (!driverInstance) {
    try {
      driverInstance = neo4j.driver(uri, neo4j.auth.basic(user, password), {
        maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 20000, // 20s
      });
    } catch (e) {
      console.error("Failed to initialize Neo4j driver:", e);
      return null;
    }
  }

  return driverInstance;
}

export async function verifyNeo4jConnection(): Promise<{ connected: boolean; serverInfo?: string; error?: string }> {
  const driver = getNeo4jDriver();
  if (!driver) {
    return { connected: false, error: "Neo4j credentials not configured in .env.local" };
  }

  try {
    const serverInfo = await driver.getServerInfo();
    return { connected: true, serverInfo: `${serverInfo.agent} at ${serverInfo.address}` };
  } catch (error: any) {
    // If username e65265a9 failed, let's try with default 'neo4j'
    try {
      const uri = process.env.NEO4J_URI!;
      const password = process.env.NEO4J_PASSWORD!;
      const fallbackDriver = neo4j.driver(uri, neo4j.auth.basic("neo4j", password));
      const info = await fallbackDriver.getServerInfo();
      driverInstance = fallbackDriver;
      return { connected: true, serverInfo: `${info.agent} at ${info.address}` };
    } catch (fallbackError: any) {
      return { connected: false, error: error.message || "Failed to connect to Neo4j AuraDB" };
    }
  }
}

export async function seedLiveNeo4jDatabase(): Promise<{ success: boolean; nodesCreated?: number; message?: string }> {
  const driver = getNeo4jDriver();
  if (!driver) {
    return { success: false, message: "No live driver configured" };
  }

  const session = driver.session();
  try {
    const seedCypher = `
      MERGE (c:Creator {id: 'creator-aaron'})
      SET c.name = 'Aaron', c.niche = 'AI Engineering & DevTools', c.audience_size = 45000

      MERGE (n:NicheCluster {name: 'AI Engineering & DevTools'})
      MERGE (c)-[:TARGETS]->(n)

      MERGE (t1:Trend {id: 'trend-deepseek'})
      SET t1.keyword = 'Local DeepSeek R1 & Reasoning Models',
          t1.velocity_growth_pct = 410,
          t1.first_detected = datetime()
      MERGE (t1)-[:TRENDING_IN {velocity_score: 0.94}]->(n)

      MERGE (t2:Trend {id: 'trend-supabase'})
      SET t2.keyword = 'Supabase Vector Engine HNSW Optimization',
          t2.velocity_growth_pct = 290,
          t2.first_detected = datetime()
      MERGE (t2)-[:TRENDING_IN {velocity_score: 0.88}]->(n)

      MERGE (s1:Source {url: 'https://arxiv.org/abs/2501.12948'})
      SET s1.title = 'DeepSeek R1 Architecture Technical Report', s1.trust_score = 0.98
      MERGE (t1)-[:VERIFIED_BY]->(s1)

      MERGE (s2:Source {url: 'https://supabase.com/blog/pgvector-hnsw-benchmarks'})
      SET s2.title = 'Supabase pgvector HNSW Benchmarks', s2.trust_score = 0.99
      MERGE (t2)-[:VERIFIED_BY]->(s2)

      MERGE (b1:Brand {name: 'Neon Database'})
      SET b1.budget_status = 'Active Q1', b1.domain = 'neon.tech', b1.cpm = 54
      MERGE (b1)-[:SPONSORS_IN]->(n)

      MERGE (b2:Brand {name: 'Together AI'})
      SET b2.budget_status = 'Accelerating', b2.domain = 'together.ai', b2.cpm = 62
      MERGE (b2)-[:SPONSORS_IN]->(n)

      MERGE (cl1:Claim {id: 'claim-robotics'})
      SET cl1.text = 'OpenAI acquired German humanoid robotics startup for $1.2B',
          cl1.status = 'debunked',
          cl1.confidence = 99

      MERGE (cl2:Claim {id: 'claim-pgvector'})
      SET cl2.text = 'pgvector with HNSW on Postgres cuts vector memory by 60%',
          cl2.status = 'verified',
          cl2.confidence = 96

      RETURN count(*) as count
    `;

    await session.run(seedCypher);
    return { success: true, message: "Successfully seeded BonAppTea graph schema and initial nodes to AuraDB!" };
  } catch (error: any) {
    return { success: false, message: error.message };
  } finally {
    await session.close();
  }
}
