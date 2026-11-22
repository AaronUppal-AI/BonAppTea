"use client";

import React from "react";
import { 
  Radio, 
  Search, 
  Cpu, 
  Sparkles, 
  Play, 
  Settings, 
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { TrackType } from "@/types";

interface HeaderProps {
  activeTrack: TrackType;
  setActiveTrack: (track: TrackType) => void;
  onOpenJudgeDemo: () => void;
  onOpenSettings: () => void;
  isJudgeDemoActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTrack,
  setActiveTrack,
  onOpenJudgeDemo,
  onOpenSettings,
  isJudgeDemoActive,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Subtitle */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[2px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-pink-400">
                  ⚡
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">BonAppTea</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                  Restaurant Viral Intelligence
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Powered by You.com • Treg Gateway • Neo4j GraphRAG • Masko AI
              </p>
            </div>
          </div>

          {/* Real-time Telemetry Badges */}
          <div className="hidden lg:flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>You.com: LIVE</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono">
              <Cpu className="w-3 h-3" />
              <span>Treg: 0% Markup</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-mono">
              <ShieldCheck className="w-3 h-3" />
              <span>Neo4j: Sync</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onOpenJudgeDemo}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm ${
                isJudgeDemoActive
                  ? "bg-amber-500 text-black hover:bg-amber-400 animate-pulse"
                  : "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-90"
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              <span>3-Min Judge Demo</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg border border-neutral-800 transition"
              title="API Keys & Environment"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Tracks Navigation */}
        <div className="flex space-x-1 overflow-x-auto py-2 border-t border-neutral-900 scrollbar-none">
          <button
            onClick={() => setActiveTrack("idea-to-post")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTrack === "idea-to-post"
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/40"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Track 1: Idea to Post</span>
          </button>

          <button
            onClick={() => setActiveTrack("trend-radar")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTrack === "trend-radar"
                ? "bg-purple-600/20 text-purple-400 border border-purple-500/40"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Track 2: Trend Radar</span>
          </button>

          <button
            onClick={() => setActiveTrack("creator-business")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTrack === "creator-business"
                ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Track 3: Creator Business</span>
          </button>

          <button
            onClick={() => setActiveTrack("research-desk")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTrack === "research-desk"
                ? "bg-pink-600/20 text-pink-400 border border-pink-500/40"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track 4: Research Desk</span>
          </button>
        </div>
      </div>
    </header>
  );
};
