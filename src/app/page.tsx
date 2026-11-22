"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { TrackChefPepper } from "@/components/TrackChefPepper";
import { TrackKnowledgeGraph } from "@/components/TrackKnowledgeGraph";
import { TrackTrendRadar } from "@/components/TrackTrendRadar";
import { TrackDishToPost } from "@/components/TrackDishToPost";
import { TrackCreatorScout } from "@/components/TrackCreatorScout";
import { TrackIntelDesk } from "@/components/TrackIntelDesk";
import { GraphExplorer } from "@/components/GraphExplorer";
import { MaskoAvatarWidget } from "@/components/MaskoAvatarWidget";
import { JudgeDemoModal } from "@/components/JudgeDemoModal";
import { SettingsModal } from "@/components/SettingsModal";
import { TrackType } from "@/types";

// Which slice of the graph to show under each tab.
const TAB_LENS: Partial<Record<TrackType, string>> = {
  "chef-pepper": "all",
  "trend-radar": "menu",
  "dish-to-post": "menu",
  "creator-scout": "creators",
  "intel-desk": "rivals",
};

export default function Home() {
  const [activeTrack, setActiveTrack] = useState<TrackType>("chef-pepper");
  const [focusTrend, setFocusTrend] = useState<string | null>(null);
  const [isJudgeDemoOpen, setIsJudgeDemoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Tabs are linkable: bonapptea.vercel.app/#knowledge-graph
  const [hashRead, setHashRead] = useState(false);
  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as TrackType;
    const valid: TrackType[] = ["chef-pepper", "knowledge-graph", "trend-radar", "dish-to-post", "creator-scout", "intel-desk"];
    if (valid.includes(fromHash)) setActiveTrack(fromHash);
    setHashRead(true);
  }, []);
  useEffect(() => {
    if (hashRead) window.history.replaceState(null, "", `#${activeTrack}`);
  }, [activeTrack, hashRead]);

  const isChef = activeTrack === "chef-pepper";
  const showBottom = activeTrack !== "knowledge-graph";

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
          {activeTrack === "chef-pepper" && <TrackChefPepper />}
          {activeTrack === "knowledge-graph" && <TrackKnowledgeGraph />}
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

        {showBottom && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* On the Chef Pepper tab the chat is the main panel, so the graph takes the full width. */}
            <div className={isChef ? "lg:col-span-12" : "lg:col-span-7"}>
              <GraphExplorer key={activeTrack} height={380} defaultLens={TAB_LENS[activeTrack] ?? "all"} />
            </div>
            {!isChef && (
              <div className="lg:col-span-5 min-h-[460px]">
                <MaskoAvatarWidget />
              </div>
            )}
          </section>
        )}
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
