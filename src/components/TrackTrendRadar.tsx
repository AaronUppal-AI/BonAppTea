"use client";

import React, { useState } from "react";
import { Radio, TrendingUp, Zap, HelpCircle, ExternalLink, ArrowRight, ShieldCheck, Flame } from "lucide-react";
import { MOCK_TRENDS } from "@/lib/mockData";
import { Trend } from "@/types";

interface TrackTrendRadarProps {
  onSelectTrendForScript?: (trend: Trend) => void;
  onSendToResearch?: (topic: string) => void;
}

export const TrackTrendRadar: React.FC<TrackTrendRadarProps> = ({
  onSelectTrendForScript,
  onSendToResearch,
}) => {
  const [trends, setTrends] = useState<Trend[]>(MOCK_TRENDS);
  const [selectedTrend, setSelectedTrend] = useState<Trend>(MOCK_TRENDS[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-purple-400" />
            <span>Track 2: Real-Time Trend Radar & Content Gap Engine</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Discovers breakout narratives 48–72 hours before saturated creators, backed by You.com verification & Treg signals.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-full font-mono flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span>Telemetry: Treg + You.com Index</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Trend Feed List */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
            Accelerating Topics in Niche
          </span>

          {trends.map((t) => {
            const isSelected = selectedTrend.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTrend(t)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? "bg-purple-950/30 border-purple-500/80 shadow-lg shadow-purple-500/10"
                    : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/70"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>+{t.velocityGrowthPct}% Velocity</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">{t.firstDetected}</span>
                </div>

                <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition">
                  {t.keyword}
                </h3>

                <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                  {t.summary}
                </p>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[10px] text-neutral-400">
                  <span>{t.contentGap.competitorVideoCount} Competitor Videos</span>
                  <span className="text-purple-400 font-medium">Inspect Content Gap →</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detailed Breakdown & Content Gap Analysis */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-5">
            {/* Trend Title & Velocity Metrics */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-800 gap-2">
              <div>
                <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">
                  {selectedTrend.niche}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">{selectedTrend.keyword}</h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  +{selectedTrend.velocityGrowthPct}%
                </span>
                <span className="block text-[10px] text-neutral-400">7-Day Search Velocity</span>
              </div>
            </div>

            {/* The Content Gap Box (Crucial Differentiator!) */}
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
                <HelpCircle className="w-4 h-4" />
                <span>The Unsolved Content Gap (What Competitors Missed)</span>
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {selectedTrend.contentGap.summary}
              </p>

              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono uppercase text-amber-300 font-bold block">
                  Top Unanswered Viewer Questions:
                </span>
                {selectedTrend.contentGap.unansweredQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded bg-neutral-900/80 border border-neutral-800 text-xs text-neutral-200 flex items-start space-x-2"
                  >
                    <span className="text-amber-400 font-bold shrink-0">?</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Sources Grounding */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">
                Primary Grounded Sources (Verified via You.com):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedTrend.sources.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-purple-500/40 transition block text-xs"
                  >
                    <div className="flex items-center justify-between text-neutral-300 font-medium truncate">
                      <span className="truncate">{s.title}</span>
                      <ExternalLink className="w-3 h-3 ml-1 shrink-0 text-neutral-500" />
                    </div>
                    <div className="flex items-center space-x-2 mt-1 text-[10px] text-neutral-400">
                      <span className="text-emerald-400 font-mono">Trust: {(s.trustScore * 100).toFixed(0)}%</span>
                      <span>•</span>
                      <span>{s.publishedDate}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Action Bar */}
            <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <span>Active Sponsors:</span>
                <span className="text-white font-medium">{selectedTrend.relatedBrands.join(", ")}</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (onSendToResearch) onSendToResearch(selectedTrend.keyword);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-200 transition"
                >
                  Verify Claims in Track 4
                </button>
                <button
                  onClick={() => {
                    if (onSelectTrendForScript) onSelectTrendForScript(selectedTrend);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition flex items-center space-x-1"
                >
                  <span>Build Script in Track 1</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
