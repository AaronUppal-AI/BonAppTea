"use client";

import React, { useEffect, useState } from "react";
import { Radio, Clapperboard, Users, Binoculars, Play, Settings, ChefHat } from "lucide-react";
import { TrackType } from "@/types";

interface HeaderProps {
  activeTrack: TrackType;
  setActiveTrack: (track: TrackType) => void;
  onOpenJudgeDemo: () => void;
  onOpenSettings: () => void;
  isJudgeDemoActive?: boolean;
}

interface Status {
  neo4j: { connected: boolean };
  youCom: { configured: boolean };
  masko: { configured: boolean };
  treg: { configured: boolean };
}

const TRACKS: { id: TrackType; label: string; icon: React.ReactNode; active: string }[] = [
  { id: "chef-pepper", label: "Chef Pepper", icon: <ChefHat className="w-3.5 h-3.5" />, active: "bg-rose-600/20 text-rose-300 border-rose-500/40" },
  { id: "trend-radar", label: "Trend Radar", icon: <Radio className="w-3.5 h-3.5" />, active: "bg-amber-600/20 text-amber-300 border-amber-500/40" },
  { id: "dish-to-post", label: "Dish-to-Post", icon: <Clapperboard className="w-3.5 h-3.5" />, active: "bg-pink-600/20 text-pink-300 border-pink-500/40" },
  { id: "creator-scout", label: "Creator Scout", icon: <Users className="w-3.5 h-3.5" />, active: "bg-emerald-600/20 text-emerald-300 border-emerald-500/40" },
  { id: "intel-desk", label: "Intel Desk", icon: <Binoculars className="w-3.5 h-3.5" />, active: "bg-sky-600/20 text-sky-300 border-sky-500/40" },
];

const Badge: React.FC<{ ok: boolean | undefined; label: string }> = ({ ok, label }) => (
  <div
    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-mono ${
      ok === undefined
        ? "bg-neutral-800/40 border-neutral-700 text-neutral-400"
        : ok
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
        : "bg-rose-500/10 border-rose-500/20 text-rose-400"
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${ok === undefined ? "bg-neutral-500" : ok ? "bg-emerald-400" : "bg-rose-400"}`} />
    <span>
      {label}: {ok === undefined ? "…" : ok ? "on" : "off"}
    </span>
  </div>
);

export const Header: React.FC<HeaderProps> = ({ activeTrack, setActiveTrack, onOpenJudgeDemo, onOpenSettings, isJudgeDemoActive }) => {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-pink-500 p-[2px] shadow-lg shadow-rose-500/20">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center text-xl">🍵</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white">BonAppTea</span>
                <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20 rounded-full">
                  Restaurant Viral Intelligence
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">Fill your slow shifts with trends, creators and rival intel</p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs">
            <Badge ok={status?.youCom.configured} label="You.com" />
            <Badge ok={status?.neo4j.connected} label="Neo4j" />
            <Badge ok={status?.masko.configured} label="Masko" />
            <Badge ok={status?.treg.configured} label="Treg" />
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenJudgeDemo}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                isJudgeDemoActive ? "bg-amber-500 text-black animate-pulse" : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-90"
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span className="hidden sm:inline">3-Min Demo</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 transition"
              title="Connections"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto py-2 border-t border-neutral-900">
          {TRACKS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTrack(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap flex items-center gap-1.5 border ${
                activeTrack === t.id ? t.active : "border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
};
