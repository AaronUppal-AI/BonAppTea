"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { TrackIdeaToPost } from "@/components/TrackIdeaToPost";
import { TrackTrendRadar } from "@/components/TrackTrendRadar";
import { TrackCreatorBusiness } from "@/components/TrackCreatorBusiness";
import { TrackResearchDesk } from "@/components/TrackResearchDesk";
import { Neo4jGraphVisualizer } from "@/components/Neo4jGraphVisualizer";
import { MaskoAvatarWidget } from "@/components/MaskoAvatarWidget";
import { JudgeDemoModal } from "@/components/JudgeDemoModal";
import { SettingsModal } from "@/components/SettingsModal";
import { TrackType, GraphNode, GraphEdge, Trend } from "@/types";
import { INITIAL_GRAPH_NODES, INITIAL_GRAPH_EDGES } from "@/lib/mockData";

export default function Home() {
  const [activeTrack, setActiveTrack] = useState<TrackType>("trend-radar");
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>(INITIAL_GRAPH_NODES);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>(INITIAL_GRAPH_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isJudgeDemoOpen, setIsJudgeDemoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Fetch updated graph data on load or change
  useEffect(() => {
    fetch("/api/graph/data")
      .then((res) => res.json())
      .then((data) => {
        if (data.nodes && data.edges) {
          setGraphNodes(data.nodes);
          setGraphEdges(data.edges);
        }
      })
      .catch((err) => console.error("Error fetching graph data:", err));
  }, []);

  const handleSelectTrendForScript = (trend: Trend) => {
    setActiveTrack("idea-to-post");
    setSelectedNodeId("trend-deepseek");
  };

  const handleSendToResearch = (topic: string) => {
    setActiveTrack("research-desk");
    setSelectedNodeId("claim-robotics");
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col font-sans">
      {/* Top Navigation & Status Bar */}
      <Header
        activeTrack={activeTrack}
        setActiveTrack={setActiveTrack}
        onOpenJudgeDemo={() => setIsJudgeDemoOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isJudgeDemoActive={isJudgeDemoOpen}
      />

      {/* Main Studio Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Active Hero Track */}
        <section className="bg-neutral-900/30 rounded-2xl border border-neutral-800/80 p-5 shadow-2xl backdrop-blur-sm">
          {activeTrack === "idea-to-post" && <TrackIdeaToPost />}
          {activeTrack === "trend-radar" && (
            <TrackTrendRadar
              onSelectTrendForScript={handleSelectTrendForScript}
              onSendToResearch={handleSendToResearch}
            />
          )}
          {activeTrack === "creator-business" && <TrackCreatorBusiness />}
          {activeTrack === "research-desk" && <TrackResearchDesk />}
        </section>

        {/* Dual Live Intelligence Engine: Neo4j GraphRAG + Masko Co-host */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Neo4j Knowledge Graph Visualizer (7 Columns) */}
          <div className="lg:col-span-7 h-[420px]">
            <Neo4jGraphVisualizer
              nodes={graphNodes}
              edges={graphEdges}
              selectedNodeId={selectedNodeId}
              onSelectNode={(node) => setSelectedNodeId(node?.id || null)}
            />
          </div>

          {/* Masko Mascot & Conversational Co-Host (5 Columns) */}
          <div className="lg:col-span-5 h-[420px]">
            <MaskoAvatarWidget
              creatorName="Aaron"
              onActionTrigger={(action) => {
                if (action === "media-kit") {
                  setActiveTrack("creator-business");
                }
              }}
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950/80 py-4 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BonAppTea • Built for the You.com Hackathon</span>
          <div className="flex items-center space-x-4">
            <span className="text-neutral-400">You.com Search API</span>
            <span>•</span>
            <span className="text-neutral-400">Treg Gateway</span>
            <span>•</span>
            <span className="text-neutral-400">Neo4j GraphRAG</span>
            <span>•</span>
            <span className="text-neutral-400">Masko Mascot</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <JudgeDemoModal
        isOpen={isJudgeDemoOpen}
        onClose={() => setIsJudgeDemoOpen(false)}
        onNavigateTrack={(track) => setActiveTrack(track)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
