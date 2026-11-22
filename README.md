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

Open http://localhost:3000. The first request seeds **Kochi** (652 10th Ave, Hell's Kitchen) into your Neo4j database: its real menu and facts from [kochinyc.com](https://www.kochinyc.com/). Then run the live pipeline once:

```bash
curl -X POST http://localhost:3000/api/pipeline/run   # rivals + reviews, creators (Treg), trend proof (You.com); ~5¢
```

In production the pipeline route is disabled unless `PIPELINE_TOKEN` is set and sent as `x-pipeline-token`.

### Environment variables

| Variable | Needed for |
| :--- | :--- |
| `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Chef Pepper's GraphRAG answers and the graph view |
| `YOU_API_KEY` | You.com search and verification |
| `TREG_API_KEY` | Treg tool calls |
| `MASKO_API_KEY`, `MASKO_API_BASE_URL` | Masko mascot generation |
| `TREG_API_KEY` | Live rivals, reviews and creators |
| `PIPELINE_TOKEN` (optional) | Allows `/api/pipeline/run` in production |

`.env.local` is git-ignored. Never commit keys.

## Project layout

```
src/
├── app/api/
│   ├── radar/               # Trend board + You.com trend evidence
│   ├── post/                # Dish-to-post plans + You.com filming references
│   ├── creators/            # Creator vetting
│   ├── intel/               # Rival complaints, neighborhood news, claim check
│   ├── masko/chat/          # Chef Pepper: question → Cypher → grounded reply
│   ├── graph/               # Read-only graph view, seed
│   └── status/              # Which services are configured (no key values)
├── components/              # Header, four tabs, graph view, mascot widget
└── lib/
    ├── hospitalityGraph.ts  # Restaurant graph seed + every Cypher query
    ├── youSearch.ts         # You.com Search connector + restaurant searches
    └── neo4jClient.ts       # AuraDB driver
```

## The four tabs

| Tab | From Neo4j | From You.com (live) |
| :--- | :--- | :--- |
| **Trend Radar** | Trend lifecycle board (Emerging → Saturated) matched against the pantry | Web proof per trend (last month) and the city's food buzz (last week) |
| **Dish-to-Post** | Best trend match per dish (≥ 2 shared ingredients), hook, audio, 3-clip shot list, caption, hashtags | How others are filming that trend |
| **Creator Scout** | Every creator vetted, with pass/fail reasons, plus a copyable VIP invite for a slow shift | **Treg:** live Instagram scan of the neighborhood's food hashtags; restaurants are filtered out and real creators are written into Neo4j |
| **Intel Desk** | Rival complaints this week paired with the restaurant's strengths | Neighborhood restaurant news (last month) and sources for fact-checking a menu claim |

You.com results are never faked: if `YOU_API_KEY` is missing or a search fails, the panel says so. Each graph panel can show the Cypher query behind it.

## Knowledge graph (Neo4j, schema v3)

```
(City)<-[:IN_CITY]-(Neighborhood)-[:ADJACENT_TO]-(Neighborhood)
(Place)-[:IN]->(Neighborhood)                       Restaurant and Competitor are also :Place
(Restaurant)-[:SERVES]->(MenuItem)-[:FEATURING]->(Ingredient)<-[:STOCKS]-(Restaurant)
(FoodTrend)-[:REQUIRES]->(Ingredient)   (FoodTrend)-[:FITS]->(Cuisine)   (FoodTrend)-[:EVIDENCED_BY]->(WebSource)
(Competitor)-[:CAPITALIZES_ON]->(FoodTrend)
(Competitor)-[:HAS_COMPLAINT]->(Complaint)-[:ABOUT]->(Theme)<-[:ADDRESSES]-(Strength)<-[:HAS_STRENGTH]-(Restaurant)
(LocalCreator)-[:POSTED]->(Post)-[:AT]->(Place)     (LocalCreator)-[:COVERS]->(Cuisine)
```

A creator's home neighborhood, local reach and paid rival posts are **derived by traversing their posts**, so demo creators and creators found live through Treg are vetted by the same queries. You.com trend evidence is written back as `WebSource` nodes.

The **Knowledge Graph** tab lists multi-hop opportunity paths, such as *creator → post at a rival → rival's complaint → theme → your strength* (a conquest invite). Clicking one highlights its path in an interactive Cytoscape view.

## Status

The demo restaurant is **Kochi**, a one-Michelin-star Korean tasting-menu restaurant in Hell's Kitchen. Its menu, ingredients, price and facts come from its website. Everything about the outside world is live: rivals and their Google reviews (Treg → Google Maps), creators who posted from Kochi or under Hell's Kitchen food hashtags (Treg → Instagram), and web proof for each trend (You.com). Trend stage, velocity and weekly-upside figures are illustrative. There are no made-up creators or complaints.

### Live creator discovery (Treg → Neo4j)

`POST /api/creators/discover` runs, in about 30 seconds and about 2¢:

1. Instagram hashtag search for `#<neighborhood>food`, `#<neighborhood>eats` and `#<city>foodie`.
2. A profile lookup for each new poster. Restaurants and businesses (by category or bio: address, hours, "order", "reservations") are skipped and remembered.
3. Each creator's recent posts: followers, median engagement, and the share of geo-tagged posts in the city. Instagram doesn't publish audience location, so this "local posting %" stands in for local audience.
4. `MERGE` into Neo4j as `LocalCreator {source: 'treg'}`, linked to the neighborhood they post from most.

Creator Scout, the graph view and Chef Pepper then vet them with the same rules as every creator. Scans are limited to one per 6 hours (stored in the graph) so public traffic can't drain the Treg balance.

## License

Apache-2.0. See [LICENSE](LICENSE).
