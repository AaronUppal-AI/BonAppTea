import neo4j from "neo4j-driver";

// Credentials come from .env.local (git-ignored). Run: node test-neo4j.mjs
process.loadEnvFile(".env.local");
const uri = process.env.NEO4J_URI;
const password = process.env.NEO4J_PASSWORD;
if (!uri || !password) {
  console.error("Set NEO4J_URI and NEO4J_PASSWORD in .env.local");
  process.exit(1);
}

async function testConnection(user) {
  console.log(`Testing Neo4j connection with user: "${user}"...`);
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  try {
    const serverInfo = await driver.getServerInfo();
    console.log(`Connected successfully! Server: ${serverInfo.agent} at ${serverInfo.address}`);

    const session = driver.session();
    try {
      console.log("Seeding CurrentOS initial Knowledge Graph nodes...");
      const result = await session.run(`
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
      `);
      console.log("Seeding complete! Initial nodes and relationships are now LIVE in AuraDB!");

      // Count nodes
      const countRes = await session.run("MATCH (n) RETURN count(n) as totalNodes");
      console.log(`Total nodes in AuraDB database: ${countRes.records[0].get("totalNodes")}`);
    } finally {
      await session.close();
    }

    await driver.close();
    return true;
  } catch (err) {
    console.error(`Connection failed with user "${user}":`, err.message);
    await driver.close();
    return false;
  }
}

async function main() {
  // Try default Aura admin user 'neo4j'
  const success1 = await testConnection("neo4j");
  const altUser = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
  if (!success1 && altUser && altUser !== "neo4j") {
    console.log("Trying with the username from .env.local...");
    await testConnection(altUser);
  }
}

main();
