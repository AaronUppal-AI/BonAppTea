"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Core } from "cytoscape";
import { Database, RefreshCw, Maximize2 } from "lucide-react";
import type { GraphNode, GraphEdge } from "@/types";

export interface GraphFocus {
  nodeIds: string[];
  relIds: string[];
}

export const NODE_STYLE: Record<string, { color: string; name: string; size: number }> = {
  Restaurant: { color: "#f43f5e", name: "Your restaurant", size: 34 },
  Competitor: { color: "#38bdf8", name: "Rival", size: 24 },
  LocalCreator: { color: "#10b981", name: "Creator", size: 22 },
  Post: { color: "#6ee7b7", name: "Post", size: 9 },
  Place: { color: "#94a3b8", name: "Place", size: 12 },
  MenuItem: { color: "#ec4899", name: "Dish", size: 18 },
  Ingredient: { color: "#a3a3a3", name: "Ingredient", size: 10 },
  FoodTrend: { color: "#f59e0b", name: "Trend", size: 22 },
  WebSource: { color: "#60a5fa", name: "Web source", size: 10 },
  Complaint: { color: "#fb7185", name: "Complaint", size: 14 },
  Theme: { color: "#e879f9", name: "Theme", size: 16 },
  Strength: { color: "#a78bfa", name: "Strength", size: 16 },
  Cuisine: { color: "#facc15", name: "Cuisine", size: 16 },
  Neighborhood: { color: "#64748b", name: "Neighborhood", size: 18 },
  City: { color: "#475569", name: "City", size: 20 },
  TimeSlot: { color: "#5eead4", name: "Time slot", size: 9 },
  Hashtag: { color: "#f0abfc", name: "Hashtag", size: 9 },
  Account: { color: "#cbd5e1", name: "Account", size: 9 },
};

// Detail-level types are shown in their own lenses, not in "Everything"
const DETAIL_TYPES = ["TimeSlot", "Hashtag", "Account"];

export const LENSES: { id: string; label: string; types: string[] }[] = [
  { id: "all", label: "Everything", types: Object.keys(NODE_STYLE).filter((t) => !DETAIL_TYPES.includes(t)) },
  { id: "menu", label: "Menu × Trends", types: ["Restaurant", "MenuItem", "Ingredient", "FoodTrend", "Cuisine", "WebSource", "Competitor"] },
  { id: "creators", label: "Creators", types: ["Restaurant", "LocalCreator", "Post", "Place", "Competitor", "Neighborhood", "Cuisine"] },
  { id: "rivals", label: "Rivals", types: ["Restaurant", "Competitor", "Complaint", "Theme", "Strength", "Neighborhood", "FoodTrend"] },
  { id: "busy", label: "Busy times", types: ["Restaurant", "Competitor", "TimeSlot"] },
  { id: "social", label: "Hashtags", types: ["LocalCreator", "Post", "Hashtag", "FoodTrend", "Account", "Restaurant"] },
];

interface Props {
  height?: number;
  focus?: GraphFocus | null;
  defaultLens?: string;
  /** Bump to refetch the graph (after a creator scan, for example). */
  reloadKey?: number;
}

export const GraphExplorer: React.FC<Props> = ({ height = 420, focus = null, defaultLens = "all", reloadKey = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [data, setData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lens, setLens] = useState(defaultLens);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  // Posts are folded into creator→place POSTED_AT links unless shown explicitly.
  const [showPosts, setShowPosts] = useState(false);

  useEffect(() => {
    setError(null);
    fetch("/api/graph/data", { signal: AbortSignal.timeout(25000) })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Graph unavailable");
        setData({ nodes: d.nodes, edges: d.edges });
      })
      .catch((e) =>
        setError(e?.name === "TimeoutError" || e?.name === "AbortError" ? "The graph took too long to load. Use ↻ to try again." : e.message)
      );
  }, [reloadKey, fetchKey]);

  // A focused insight can span lenses, so show everything while it is highlighted.
  useEffect(() => {
    if (focus) {
      setLens("all");
      setSelectedId(null);
      const postIds = new Set((data?.nodes ?? []).filter((n) => n.type === "Post").map((n) => n.id));
      if (focus.nodeIds.some((id) => postIds.has(id))) setShowPosts(true);
    }
  }, [focus, data]);

  // The graph as drawn: with posts folded, (Creator)-[:POSTED]->(Post)-[:AT]->(Place) becomes (Creator)-[:POSTED_AT]->(Place).
  const view = useMemo(() => {
    if (!data) return null;
    if (showPosts) return data;
    const postIds = new Set(data.nodes.filter((n) => n.type === "Post").map((n) => n.id));
    const author = new Map<string, string>();
    const place = new Map<string, string>();
    for (const e of data.edges) {
      if (e.label === "POSTED" && postIds.has(e.target)) author.set(e.target, e.source);
      if (e.label === "AT" && postIds.has(e.source)) place.set(e.source, e.target);
    }
    const folded = new Map<string, GraphEdge & { count: number }>();
    for (const [post, creator] of Array.from(author.entries())) {
      const target = place.get(post);
      if (!target) continue;
      const id = `posted-at:${creator}->${target}`;
      const f = folded.get(id);
      if (f) f.count += 1;
      else folded.set(id, { id, source: creator, target, label: "POSTED_AT", count: 1 });
    }
    return {
      nodes: data.nodes.filter((n) => !postIds.has(n.id)),
      edges: [
        ...data.edges.filter((e) => !postIds.has(e.source) && !postIds.has(e.target)),
        ...Array.from(folded.values()).map((f) => ({ ...f, label: f.count > 1 ? `POSTED_AT ×${f.count}` : "POSTED_AT" })),
      ],
    };
  }, [data, showPosts]);

  const nodeById = useMemo(() => new Map((data?.nodes ?? []).map((n) => [n.id, n])), [data]);

  const highlight = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.elements().removeClass("faded hl");
    if (focus) {
      const ids = new Set([...focus.nodeIds, ...focus.relIds]);
      const hl = cy.elements().filter((el) => ids.has(el.id()));
      if (hl.length) {
        cy.elements().not(hl).addClass("faded");
        hl.addClass("hl");
        cy.animate({ fit: { eles: hl, padding: 50 } }, { duration: 450 });
      }
    } else if (selectedId) {
      const n = cy.getElementById(selectedId);
      if (n.nonempty()) {
        const nb = n.closedNeighborhood();
        cy.elements().not(nb).addClass("faded");
        nb.addClass("hl");
      }
    }
  }, [focus, selectedId]);

  // Build or rebuild the graph when data or lens changes.
  useEffect(() => {
    if (!view || !containerRef.current) return;
    let cancelled = false;
    (async () => {
      const cytoscape = (await import("cytoscape")).default;
      if (cancelled) return;
      const types = new Set(LENSES.find((l) => l.id === lens)?.types ?? []);
      const nodes = view.nodes.filter((n) => types.has(n.type));
      const ids = new Set(nodes.map((n) => n.id));
      const edges = view.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
      const elements = [
        ...nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.label,
            type: n.type,
            color: NODE_STYLE[n.type]?.color ?? "#64748b",
            size: NODE_STYLE[n.type]?.size ?? 14,
          },
        })),
        ...edges.map((e) => ({ data: { id: e.id, source: e.source, target: e.target, label: e.label } })),
      ];

      if (!cyRef.current) {
        cyRef.current = cytoscape({
          container: containerRef.current,
          elements,
          minZoom: 0.2,
          maxZoom: 3,
          wheelSensitivity: 0.25,
          style: [
            {
              selector: "node",
              style: {
                "background-color": "data(color)",
                width: "data(size)",
                height: "data(size)",
                label: "data(label)",
                "font-size": 8,
                color: "#e5e5e5",
                "text-valign": "bottom",
                "text-margin-y": 3,
                "text-outline-color": "#0a0a0a",
                "text-outline-width": 2,
                "text-max-width": "90px",
                "text-wrap": "ellipsis",
              },
            },
            { selector: 'node[type = "Post"], node[type = "Ingredient"]', style: { label: "" } },
            { selector: 'node[type = "Restaurant"]', style: { "font-size": 11, "font-weight": "bold", "border-width": 3, "border-color": "#fecdd3" } },
            {
              selector: "edge",
              style: {
                width: 1,
                "line-color": "#3f3f46",
                "target-arrow-color": "#52525b",
                "target-arrow-shape": "triangle",
                "arrow-scale": 0.6,
                "curve-style": "bezier",
                "font-size": 7,
                color: "#fbbf24",
                "text-rotation": "autorotate",
                "text-background-color": "#0a0a0a",
                "text-background-opacity": 0.85,
                "text-background-padding": "1px",
              },
            },
            { selector: ".faded", style: { opacity: 0.1 } },
            { selector: "node.hl", style: { label: "data(label)", "border-width": 2, "border-color": "#ffffff", "z-index": 10 } },
            {
              selector: "edge.hl",
              style: { width: 2.5, "line-color": "#f59e0b", "target-arrow-color": "#f59e0b", label: "data(label)", "z-index": 9 },
            },
          ],
        });
        cyRef.current.on("tap", "node", (e) => setSelectedId(e.target.id()));
        cyRef.current.on("tap", (e) => {
          if (e.target === cyRef.current) setSelectedId(null);
        });
      } else {
        cyRef.current.elements().remove();
        cyRef.current.add(elements);
      }

      const layout = cyRef.current.layout({
        name: "cose",
        animate: false,
        padding: 24,
        nodeRepulsion: () => 9000,
        idealEdgeLength: () => 60,
        gravity: 0.6,
        numIter: 1500,
      } as any);
      layout.one("layoutstop", () => highlight());
      layout.run();
    })();
    return () => {
      cancelled = true;
    };
    // highlight is applied after layout; it has its own effect for focus/selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, lens]);

  useEffect(() => {
    highlight();
  }, [highlight]);

  useEffect(
    () => () => {
      cyRef.current?.destroy();
      cyRef.current = null;
    },
    []
  );

  const selected = selectedId ? nodeById.get(selectedId) : null;
  const relations = selected
    ? (view?.edges ?? [])
        .filter((e) => e.source === selected.id || e.target === selected.id)
        .map((e) => {
          const out = e.source === selected.id;
          const other = nodeById.get(out ? e.target : e.source);
          return { out, rel: e.label, other: other?.label ?? "?", type: other?.type ?? "" };
        })
    : [];

  const visibleTypes = LENSES.find((l) => l.id === lens)?.types ?? [];

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden flex flex-col shadow-xl">
      <div className="px-4 py-2.5 border-b border-neutral-800/80 bg-neutral-900/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-semibold text-neutral-200">Knowledge graph (Neo4j)</h3>
          {data && (
            <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
              {data.nodes.length} nodes · {data.edges.length} relationships
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {LENSES.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setLens(l.id);
                setSelectedId(null);
              }}
              className={`px-2 py-1 rounded transition ${lens === l.id ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"}`}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => setShowPosts((v) => !v)}
            className={`px-2 py-1 rounded transition ${showPosts ? "bg-emerald-900/50 text-emerald-200" : "text-neutral-400 hover:text-white"}`}
            title="Show each Instagram post as its own node"
          >
            {showPosts ? "Hide posts" : "Show posts"}
          </button>
          <button onClick={() => cyRef.current?.fit(undefined, 24)} className="p-1 text-neutral-400 hover:text-white" title="Fit">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setFetchKey((k) => k + 1)} className="p-1 text-neutral-400 hover:text-white" title="Reload from Neo4j">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative" style={{ height }}>
        <div ref={containerRef} className="absolute inset-0" />
        {error && <div className="absolute inset-0 flex items-center justify-center text-xs text-rose-300">{error}</div>}
        {!data && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" aria-busy="true">
            <div className="relative w-40 h-24 animate-pulse">
              {[
                [10, 40], [60, 10], [110, 45], [70, 70], [140, 15], [30, 80],
              ].map(([x, y], i) => (
                <span key={i} className="absolute w-3 h-3 rounded-full bg-neutral-700" style={{ left: x, top: y }} />
              ))}
            </div>
            <span className="text-[11px] text-neutral-500">Loading the knowledge graph from Neo4j…</span>
          </div>
        )}

        {selected && (
          <div className="absolute top-2 right-2 w-72 max-w-[calc(100%-1rem)] rounded-xl bg-neutral-900/95 border border-neutral-700 p-3 shadow-2xl z-10">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div>
                <div className="text-[9px] font-mono uppercase" style={{ color: NODE_STYLE[selected.type]?.color }}>
                  {NODE_STYLE[selected.type]?.name ?? selected.type}
                </div>
                <div className="text-xs font-bold text-white">{selected.label}</div>
              </div>
              <button onClick={() => setSelectedId(null)} className="text-neutral-400 hover:text-white text-xs">
                ✕
              </button>
            </div>
            <div className="max-h-48 overflow-auto space-y-0.5 text-[11px] font-mono">
              {relations.map((r, i) => (
                <div key={i} className="text-neutral-300 truncate">
                  <span className="text-neutral-500">{r.out ? "→" : "←"}</span> <span className="text-amber-300">{r.rel}</span>{" "}
                  <span style={{ color: NODE_STYLE[r.type]?.color }}>{r.other}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-neutral-800 flex flex-wrap gap-x-3 gap-y-1">
        {visibleTypes.map((t) => (
          <span key={t} className="flex items-center gap-1 text-[10px] text-neutral-400">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_STYLE[t].color }} />
            {NODE_STYLE[t].name}
          </span>
        ))}
        <span className="text-[10px] text-neutral-500 ml-auto">Click a node to see its relationships · scroll to zoom</span>
      </div>
    </div>
  );
};
