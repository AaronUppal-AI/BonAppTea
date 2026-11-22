// The API key comes from .env.local (git-ignored). Run: node test-you.mjs
process.loadEnvFile(".env.local");
const apiKey = process.env.YOU_API_KEY;
if (!apiKey) {
  console.error("Set YOU_API_KEY in .env.local");
  process.exit(1);
}
const query = "DeepSeek R1 local benchmarks Ollama";

async function testEndpoint(name, url, method, headers, body) {
  try {
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    console.log(`[${name}] ${method} ${url} -> Status: ${res.status}`);
    console.log(`Response: ${text.slice(0, 300)}\n`);
  } catch (e) {
    console.log(`[${name}] Error: ${e.message}\n`);
  }
}

async function run() {
  // Test 1: https://ydc-index.io/v1/search (POST)
  await testEndpoint(
    "POST ydc-index.io/v1/search",
    "https://ydc-index.io/v1/search",
    "POST",
    { "X-API-Key": apiKey, "Content-Type": "application/json" },
    { query }
  );

  // Test 2: https://api.you.com/v1/answer (POST)
  await testEndpoint(
    "POST api.you.com/v1/answer",
    "https://api.you.com/v1/answer",
    "POST",
    { "X-API-Key": apiKey, "Content-Type": "application/json" },
    { query }
  );

  // Test 3: https://api.you.com/v1/research (POST)
  await testEndpoint(
    "POST api.you.com/v1/research",
    "https://api.you.com/v1/research",
    "POST",
    { "X-API-Key": apiKey, "Content-Type": "application/json" },
    { query }
  );

  // Test 4: Bearer on api.you.com
  await testEndpoint(
    "Bearer api.you.com/v1/answer",
    "https://api.you.com/v1/answer",
    "POST",
    { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    { query }
  );
}

run();
