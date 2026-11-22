"use client";

import React, { useEffect, useState } from "react";
import { Network, Route } from "lucide-react";
import type { Insight } from "@/types";
import { GraphExplorer, GraphFocus } from "./GraphExplorer";
import { TrackHeader, ErrorNote, getJson, Skeleton } from "./ui";

const KIND: Record<Insight["kind"], { label: string; style: string }> = {
  conquest: { label: "Conquest", style: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  "warm-lead": { label: "Warm lead", style: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  "pantry-trend": { label: "Pantry-ready", style: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  "rival-gap": { label: "Rival gap", style: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  "open-trend": { label: "Open lane", style: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  "cuisine-fit": { label: "Cuisine fit", style: "bg-lime-500/15 text-lime-300 border-lime-500/30" },
  overflow: { label: "Overflow night", style: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  "trend-creator": { label: "Trend creator", style: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
};

interface InsightsData {
  insights: Insight[];
  cypher: Record<Insight["kind"], string>;
}

export const TrackKnowledgeGraph: React.FC = () => {
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Insight | null>(null);
  const [showCypher, setShowCypher] = useState(false);

  useEffect(() => {
    getJson<InsightsData>("/api/graph/insights")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const focus: GraphFocus | null = active ? { nodeIds: active.nodeIds, relIds: active.relIds } : null;

  return (
    <div className="space-y-5">
      <TrackHeader
        icon={<Network className="w-5 h-5 text-purple-400" />}
        title="Knowledge Graph: Opportunities Hiding in the Relationships"
        subtitle="Each insight is a multi-hop path through Neo4j. Click one to light it up in the graph."
      />
      {error && <ErrorNote message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 space-y-2 lg:max-h-[620px] lg:overflow-y-auto pr-1">
          {!data && !error && <Skeleton label="Walking the graph for opportunities…" cards={4} side={false} />}
          {active && (
            <button onClick={() => setActive(null)} className="text-[11px] text-neutral-400 hover:text-white">
              ✕ Clear highlight
            </button>
          )}
          {data?.insights.map((ins) => {
            const isActive = active?.id === ins.id;
            return (
              <button
                key={ins.id}
                onClick={() => {
                  setActive(isActive ? null : ins);
                  setShowCypher(false);
                }}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  isActive ? "bg-purple-950/30 border-purple-500/70" : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${KIND[ins.kind].style}`}>{KIND[ins.kind].label}</span>
                  <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                    <Route className="w-3 h-3" /> {ins.hops} hops
                  </span>
                </div>
                <div className="text-sm font-semibold text-white mt-1.5">{ins.title}</div>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">{ins.detail}</p>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-8 space-y-2">
          <GraphExplorer height={560} focus={focus} defaultLens="all" />
          {active && data && (
            <div className="text-[10px] font-mono">
              <button onClick={() => setShowCypher((v) => !v)} className="text-emerald-400 hover:text-emerald-300">
                Cypher behind &ldquo;{KIND[active.kind].label}&rdquo; {showCypher ? "▲" : "▼"}
              </button>
              {showCypher && (
                <pre className="mt-1 max-h-56 overflow-auto rounded-lg bg-black/60 border border-neutral-800 p-2 whitespace-pre-wrap text-indigo-300">
                  {data.cypher[active.kind]}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
