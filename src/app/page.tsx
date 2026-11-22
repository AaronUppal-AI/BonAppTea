"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { TrackChefPepper } from "@/components/TrackChefPepper";
import { TrackKnowledgeGraph } from "@/components/TrackKnowledgeGraph";
import { TrackTrendRadar } from "@/components/TrackTrendRadar";
import { TrackDishToPost } from "@/components/TrackDishToPost";
import { TrackCreatorScout } from "@/components/TrackCreatorScout";
import { TrackIntelDesk } from "@/components/TrackIntelDesk";
import { JudgeDemoModal } from "@/components/JudgeDemoModal";
import { SettingsModal } from "@/components/SettingsModal";
import { AboutModal, AboutSection } from "@/components/AboutModal";
import { TrackType } from "@/types";

export default function Home() {
  const [activeTrack, setActiveTrack] = useState<TrackType>("chef-pepper");
  const [focusTrend, setFocusTrend] = useState<string | null>(null);
  const [isJudgeDemoOpen, setIsJudgeDemoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [about, setAbout] = useState<AboutSection | null>(null);

  // Tabs are linkable: bonapptea.vercel.app/#knowledge-graph
  const [hashRead, setHashRead] = useState(false);
  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as TrackType;
    const valid: TrackType[] = ["chef-pepper", "knowledge-graph", "trend-radar", "dish-to-post", "creator-scout", "intel-desk"];
    if (valid.includes(fromHash)) setActiveTrack(fromHash);
    if ((fromHash as string) === "about" || (fromHash as string) === "pricing") setAbout(fromHash as unknown as AboutSection);
    setHashRead(true);
  }, []);
  useEffect(() => {
    if (hashRead) window.history.replaceState(null, "", `#${activeTrack}`);
  }, [activeTrack, hashRead]);


  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col font-sans">
      <Header
        activeTrack={activeTrack}
        setActiveTrack={setActiveTrack}
        onOpenJudgeDemo={() => setIsJudgeDemoOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={setAbout}
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
      </main>

      <footer className="border-t border-neutral-900 bg-neutral-950/80 py-4 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BonAppTea · Fill your slow shifts with trends, creators and rival intel</span>
          <span className="text-neutral-400">Data: restaurant website · Google Maps &amp; Instagram via Treg · You.com · Neo4j</span>
        </div>
      </footer>

      <JudgeDemoModal
        isOpen={isJudgeDemoOpen}
        onClose={() => setIsJudgeDemoOpen(false)}
        onNavigateTrack={(track) => setActiveTrack(track)}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AboutModal isOpen={about !== null} section={about ?? "about"} onClose={() => setAbout(null)} />
    </div>
  );
}
