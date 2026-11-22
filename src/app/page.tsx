"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { TrackTrendRadar } from "@/components/TrackTrendRadar";
import { TrackDishToPost } from "@/components/TrackDishToPost";
import { TrackCreatorScout } from "@/components/TrackCreatorScout";
import { TrackIntelDesk } from "@/components/TrackIntelDesk";
import { Neo4jGraphVisualizer } from "@/components/Neo4jGraphVisualizer";
import { MaskoAvatarWidget } from "@/components/MaskoAvatarWidget";
import { JudgeDemoModal } from "@/components/JudgeDemoModal";
import { SettingsModal } from "@/components/SettingsModal";
import { TrackType, GraphNode, GraphEdge } from "@/types";

export default function Home() {
  const [activeTrack, setActiveTrack] = useState<TrackType>("trend-radar");
  const [focusTrend, setFocusTrend] = useState<string | null>(null);
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] });
  const [graphError, setGraphError] = useState<string | null>(null);
  const [isJudgeDemoOpen, setIsJudgeDemoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    fetch("/api/graph/data")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Graph unavailable");
        setGraph({ nodes: data.nodes, edges: data.edges });
      })
      .catch((err) => setGraphError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col font-sans">
      <Header
        activeTrack={activeTrack}
        setActiveTrack={setActiveTrack}
        onOpenJudgeDemo={() => setIsJudgeDemoOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isJudgeDemoActive={isJudgeDemoOpen}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <section className="bg-neutral-900/30 rounded-2xl border border-neutral-800/80 p-5 shadow-2xl">
          {activeTrack === "trend-radar" && (
            <TrackTrendRadar
              onPlanPost={(trend) => {
                setFocusTrend(trend);
                setActiveTrack("dish-to-post");
              }}
            />
          )}
          {activeTrack === "dish-to-post" && <TrackDishToPost focusTrend={focusTrend} />}
          {activeTrack === "creator-scout" && <TrackCreatorScout />}
          {activeTrack === "intel-desk" && <TrackIntelDesk />}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-[460px]">
            <Neo4jGraphVisualizer nodes={graph.nodes} edges={graph.edges} error={graphError} />
          </div>
          <div className="lg:col-span-5 min-h-[460px]">
            <MaskoAvatarWidget />
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-900 bg-neutral-950/80 py-4 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BonAppTea · Built for the You.com Hackathon</span>
          <span className="text-neutral-400">You.com Search · Neo4j GraphRAG · Masko · Treg</span>
        </div>
      </footer>

      <JudgeDemoModal
        isOpen={isJudgeDemoOpen}
        onClose={() => setIsJudgeDemoOpen(false)}
        onNavigateTrack={(track) => setActiveTrack(track)}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
