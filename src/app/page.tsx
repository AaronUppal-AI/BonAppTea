"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BrowseHome } from "@/components/BrowseHome";
import { MatrixRain } from "@/components/MatrixRain";
import { IntroSplash } from "@/components/IntroSplash";
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
  const [activeTrack, setActiveTrack] = useState<TrackType>("home");
  const [focusTrend, setFocusTrend] = useState<string | null>(null);
  const [isJudgeDemoOpen, setIsJudgeDemoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [about, setAbout] = useState<AboutSection | null>(null);
  const [query, setQuery] = useState("");

  // Tabs are linkable: bonapptea.vercel.app/#knowledge-graph
  const [hashRead, setHashRead] = useState(false);
  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as TrackType;
    const valid: TrackType[] = ["home", "chef-pepper", "knowledge-graph", "trend-radar", "dish-to-post", "creator-scout", "intel-desk"];
    if (valid.includes(fromHash)) setActiveTrack(fromHash);
    if ((fromHash as string) === "about" || (fromHash as string) === "pricing") setAbout(fromHash as unknown as AboutSection);
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setQuery(q.slice(0, 80));
      setActiveTrack("home");
    }
    setHashRead(true);
  }, []);
  useEffect(() => {
    if (hashRead) window.history.replaceState(null, "", `#${activeTrack}`);
    window.scrollTo({ top: 0 });
  }, [activeTrack, hashRead]);


  return (
    <div className="relative min-h-screen flex flex-col font-sans">
      <MatrixRain opacity={activeTrack === "home" ? 0.9 : 0.6} />
      <div className="scanlines" aria-hidden="true" />
      <IntroSplash />
      <Header
        activeTrack={activeTrack}
        setActiveTrack={(t) => {
          setQuery("");
          setActiveTrack(t);
        }}
        onOpenJudgeDemo={() => setIsJudgeDemoOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAbout={setAbout}
        isJudgeDemoActive={isJudgeDemoOpen}
        query={query}
        onQuery={(q) => {
          setQuery(q);
          if (q) setActiveTrack("home");
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTrack === "home" && (
          <BrowseHome
            query={query}
            onNavigate={(t) => {
              setQuery("");
              setActiveTrack(t);
            }}
          />
        )}
        <section className={activeTrack === "home" ? "hidden" : "glass rounded-3xl p-5 sm:p-6 animate-fade-up"}>
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

      <footer className="border-t border-white/5 bg-neutral-950/60 backdrop-blur py-4 text-xs text-neutral-400 font-mono">
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
