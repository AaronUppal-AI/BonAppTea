"use client";

import React, { useMemo, useState } from "react";
import { Database, Info } from "lucide-react";
import { GraphNode, GraphEdge } from "@/types";

interface GraphVisualizerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  error?: string | null;
}

const TYPE_STYLE: Record<string, { color: string; name: string }> = {
  Restaurant: { color: "#f43f5e", name: "Restaurant" },
  MenuItem: { color: "#ec4899", name: "Dish" },
  Ingredient: { color: "#a3a3a3", name: "Ingredient" },
  FoodTrend: { color: "#f59e0b", name: "Trend" },
  LocalCreator: { color: "#10b981", name: "Creator" },
  Competitor: { color: "#38bdf8", name: "Rival" },
  Complaint: { color: "#fb7185", name: "Complaint" },
  Strength: { color: "#a78bfa", name: "Strength" },
  Neighborhood: { color: "#64748b", name: "Area" },
};

const FILTERS: { id: string; label: string; types: string[] }[] = [
  { id: "menu", label: "Menu × Trends", types: ["Restaurant", "MenuItem", "FoodTrend"] },
  { id: "creators", label: "Creators", types: ["Restaurant", "LocalCreator", "Neighborhood", "Competitor"] },
  { id: "rivals", label: "Rivals", types: ["Restaurant", "Competitor", "Complaint", "Strength", "Neighborhood"] },
  { id: "all", label: "All", types: Object.keys(TYPE_STYLE) },
];

export const Neo4jGraphVisualizer: React.FC<GraphVisualizerProps> = ({ nodes, edges, error }) => {
  const [filter, setFilter] = useState("menu");
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const types = FILTERS.find((f) => f.id === filter)!.types;
  const shownNodes = useMemo(() => nodes.filter((n) => types.includes(n.type)), [nodes, types]);
  const shownIds = useMemo(() => new Set(shownNodes.map((n) => n.id)), [shownNodes]);
  const shownEdges = edges.filter((e) => shownIds.has(e.source) && shownIds.has(e.target));

  const relations = selected
    ? edges
        .filter((e) => e.source === selected.id || e.target === selected.id)
        .map((e) => {
          const otherId = e.source === selected.id ? e.target : e.source;
          const other = nodes.find((n) => n.id === otherId);
          return { rel: e.label, dir: e.source === selected.id ? "→" : "←", other: other?.label ?? otherId };
        })
    : [];

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 overflow-hidden flex flex-col h-full shadow-xl">
      <div className="px-4 py-3 border-b border-neutral-800/80 bg-neutral-900/40 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-semibold text-neutral-200">Restaurant knowledge graph (Neo4j)</h3>
          <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
            {shownNodes.length} nodes · {shownEdges.length} rels
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setSelected(null);
              }}
              className={`px-2 py-1 rounded transition ${filter === f.id ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-auto p-4">
        {error && <div className="text-xs text-rose-300">{error}</div>}
        {!error && nodes.length === 0 && <div className="text-xs text-neutral-500 animate-pulse">Loading graph…</div>}
        <div className="flex flex-wrap gap-2">
          {shownNodes.map((node) => {
            const style = TYPE_STYLE[node.type] ?? { color: "#64748b", name: node.type };
            const isSelected = selected?.id === node.id;
            return (
              <button
                key={node.id}
                onClick={() => setSelected(isSelected ? null : node)}
                style={{ borderColor: isSelected ? "#fff" : `${style.color}66` }}
                className="text-left px-2.5 py-1.5 rounded-lg border bg-neutral-900/90 hover:bg-neutral-800 transition max-w-[180px]"
              >
                <span className="block text-[9px] font-mono uppercase" style={{ color: style.color }}>
                  {style.name}
                </span>
                <span className="block text-xs text-neutral-200 truncate">{node.label}</span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="sticky bottom-0 mt-3 rounded-xl bg-neutral-900/95 border border-neutral-700 p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-400" /> {selected.label}
              </span>
              <button onClick={() => setSelected(null)} className="text-neutral-400 hover:text-white text-xs">
                ✕
              </button>
            </div>
            <div className="max-h-28 overflow-auto space-y-0.5 text-[11px] font-mono text-neutral-300">
              {relations.map((r, i) => (
                <div key={i}>
                  <span className="text-neutral-500">{r.dir}</span> <span className="text-purple-300">{r.rel}</span> {r.other}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
