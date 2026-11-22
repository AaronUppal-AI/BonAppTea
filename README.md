# BonAppTea — Viral Intelligence for Restaurants

> Built for the **You.com Hackathon** with **You.com**, **Treg**, **Neo4j GraphRAG** and **Masko**.

Independent restaurants run on thin margins and can't afford a PR agency, yet one viral Reel can fill a dining room for months. BonAppTea is a marketing co-pilot for the kitchen: it spots food trends before they peak, tells the chef what to film, vets local food creators who actually drive covers, and watches neighborhood rivals for openings. Its main goal is filling slow shifts like Tuesday dinner.

## Meet Chef Pepper

<img src="public/masko/chef-pepper.png" alt="Chef Pepper" width="160" align="right" />

Chef Pepper is the BonAppTea co-host, a Masko mascot. Every answer he gives comes from Cypher queries against the restaurant's Neo4j knowledge graph, and the widget shows the exact queries and row counts behind each reply.

| Ask him about | What the graph does |
| :--- | :--- |
| Menu trends | Matches emerging/accelerating food trends against ingredients the kitchen already stocks |
| Local creators | Keeps creators with 5k–30k followers, ≥ 70% local audience in the restaurant's or an adjacent neighborhood, and no rival promotion in 60 days |
| Rivals | Finds this week's complaints about nearby competitors and pairs them with the restaurant's strengths |
| What to film | Picks the dish that best overlaps a live trend, with hook, audio and a 3-clip storyboard |
| Slow shifts | Combines the post plan with the best creator invite for the slow shift |

## Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| Live web grounding | You.com API | Real-time search and claim verification |
| Data gateway | Treg | Pay-per-call social scrapers (e.g. Instagram location posts) and contact enrichment |
| Knowledge graph | Neo4j AuraDB | Restaurants, menu items, ingredients, food trends, neighborhoods, creators, competitors |
| Mascot | Masko | Chef Pepper's character art, with animation and talking clips available |

## Quickstart

```bash
npm install
cp .env.local.example .env.local   # then fill in your keys
npm run dev
```

Open http://localhost:3000. On the first question, Chef Pepper seeds a demo East Village restaurant ("Osteria Pepe") and its neighborhood into your Neo4j database.

### Environment variables

| Variable | Needed for |
| :--- | :--- |
| `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Chef Pepper's GraphRAG answers and the graph view |
| `YOU_API_KEY` | You.com search and verification |
| `TREG_API_KEY` | Treg tool calls |
| `MASKO_API_KEY`, `MASKO_API_BASE_URL` | Masko mascot generation |

`.env.local` is git-ignored. Never commit keys.

## Project layout

```
src/
├── app/api/masko/chat/      # Chef Pepper: question → Cypher → grounded reply
├── app/api/graph/           # Graph data and Neo4j status/seed
├── components/              # Header, tracks, graph visualizer, mascot widget
└── lib/
    ├── hospitalityGraph.ts  # Restaurant graph seed + GraphRAG queries
    ├── neo4jClient.ts       # AuraDB driver
    ├── tregGateway.ts       # Treg connector
    └── youSearch.ts         # You.com connector
```

## Status

Chef Pepper's GraphRAG chat is live against Neo4j. The four Track tabs and the judge demo still use demo data from the project's earlier creator-economy version and are being moved over to the restaurant use case.

## License

Apache-2.0. See [LICENSE](LICENSE).
