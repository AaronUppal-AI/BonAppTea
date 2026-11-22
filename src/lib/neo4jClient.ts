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
        connectionAcquisitionTimeout: 10000, // 10s
        connectionTimeout: 8000, // 8s to open a socket
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
