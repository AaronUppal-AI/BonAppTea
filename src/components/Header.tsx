"use client";

import React, { useEffect, useState } from "react";
import { Play, Settings } from "lucide-react";
import { TrackType } from "@/types";

interface HeaderProps {
  activeTrack: TrackType;
  setActiveTrack: (track: TrackType) => void;
  onOpenJudgeDemo: () => void;
  onOpenSettings: () => void;
  onOpenAbout: (section: "about" | "pricing") => void;
  isJudgeDemoActive?: boolean;
}

interface Status {
  neo4j: { connected: boolean };
  youCom: { configured: boolean };
  masko: { configured: boolean };
  treg: { configured: boolean };
}

const TRACKS: { id: TrackType; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "chef-pepper", label: "Chef Pepper" },
  { id: "trend-radar", label: "Trend Radar" },
  { id: "dish-to-post", label: "Dish-to-Post" },
  { id: "creator-scout", label: "Creator Scout" },
  { id: "intel-desk", label: "Intel Desk" },
  { id: "knowledge-graph", label: "Knowledge Graph" },
];

export const Header: React.FC<HeaderProps> = ({ activeTrack, setActiveTrack, onOpenJudgeDemo, onOpenSettings, onOpenAbout, isJudgeDemoActive }) => {
  const [status, setStatus] = useState<Status | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // Netflix-style: transparent over the billboard, frosted once you scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const services = status
    ? [
        { name: "You.com", ok: status.youCom.configured },
        { name: "Neo4j", ok: status.neo4j.connected },
        { name: "Treg", ok: status.treg.configured },
        { name: "Masko", ok: status.masko.configured },
      ]
    : [];
  const allOk = services.length > 0 && services.every((s) => s.ok);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-colors duration-300 ${
        scrolled ? "bg-neutral-950/70 backdrop-blur-xl border-b border-white/5" : "bg-gradient-to-b from-neutral-950/90 to-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4 lg:gap-6">
        <button onClick={() => setActiveTrack("home")} className="shrink-0 flex items-center gap-2" aria-label="BonAppTea home">
          <span className="text-xl" aria-hidden="true">🍵</span>
          <span className="font-display chrome-text text-lg tracking-wider hidden sm:inline">BONAPPTEA</span>
        </button>

        <nav className="no-scrollbar flex-1 min-w-0 flex items-center gap-1 overflow-x-auto" aria-label="Sections">
          {TRACKS.map((t) => {
            const active = activeTrack === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTrack(t.id)}
                aria-current={active ? "page" : undefined}
                className={`relative px-2 py-1.5 text-[13px] whitespace-nowrap transition ${
                  active ? "text-white font-semibold" : "text-neutral-300 hover:text-white"
                }`}
              >
                {t.label}
                {active && <span className="absolute left-2.5 right-2.5 -bottom-0.5 h-0.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(124,255,196,0.8)]" />}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-300 hover:text-white"
            title={services.map((s) => `${s.name}: ${s.ok ? "on" : "off"}`).join(" · ") || "Checking services"}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !status ? "bg-neutral-500 animate-pulse" : allOk ? "bg-emerald-300 shadow-[0_0_8px_rgba(124,255,196,0.9)]" : "bg-amber-300"
              }`}
            />
            <span className="hidden 2xl:inline">
              {!status ? "Connecting" : allOk ? "Systems online" : `${services.filter((s) => s.ok).length}/${services.length} online`}
            </span>
          </button>
          <button onClick={() => onOpenAbout("about")} className="hidden sm:block text-[13px] text-neutral-300 hover:text-white">
            About
          </button>
          <button onClick={() => onOpenAbout("pricing")} className="hidden sm:block text-[13px] text-neutral-300 hover:text-white">
            Pricing
          </button>
          <button
            onClick={onOpenJudgeDemo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition ${
              isJudgeDemoActive ? "bg-emerald-300 text-black" : "bg-white text-black hover:bg-neutral-200"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-black" />
            <span className="hidden sm:inline">Demo</span>
          </button>
          <button onClick={onOpenSettings} className="p-1.5 text-neutral-300 hover:text-white" title="Connections" aria-label="Connections">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
