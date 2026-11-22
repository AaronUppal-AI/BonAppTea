"use client";

import React, { useEffect, useState } from "react";
import { Radio, Flame, Check, ShoppingCart, Clapperboard } from "lucide-react";
import type { BoardTrend, RestaurantProfile, YouSearchResponse } from "@/types";
import { YouSources, CypherTrace, TrackHeader, ErrorNote, stageStyle, getJson, Skeleton, FreshnessLine } from "./ui";
import type { Freshness } from "./ui";

interface RadarData {
  freshness?: Freshness[];
  restaurant: RestaurantProfile;
  trends: BoardTrend[];
  pulse: YouSearchResponse;
  cypher: string;
}

export const TrackTrendRadar: React.FC<{ onPlanPost?: (trend: string) => void }> = ({ onPlanPost }) => {
  const [data, setData] = useState<RadarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BoardTrend | null>(null);
  const [evidence, setEvidence] = useState<YouSearchResponse | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    getJson<RadarData>("/api/radar/trends")
      .then((d) => {
        setData(d);
        setSelected(d.trends.find((t) => t.stage === "Accelerating" && t.missing.length === 0) ?? d.trends[0] ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setEvidenceLoading(true);
    getJson<YouSearchResponse>(`/api/radar/evidence?trend=${encodeURIComponent(selected.name)}`)
      .then(setEvidence)
      .catch((e) => setEvidence({ query: selected.name, live: false, sources: [], error: e.message }))
      .finally(() => setEvidenceLoading(false));
  }, [selected]);

  return (
    <div className="space-y-6">
      <TrackHeader
        icon={<Radio className="w-5 h-5 text-amber-400" />}
        title="Trend Radar: Menu Hacking Before It Peaks"
        subtitle={
          data
            ? `Food trends matched against what ${data.restaurant.name} already stocks, with live web proof from You.com.`
            : "Food trends matched against your pantry, with live web proof from You.com."
        }
      />

      {error && <ErrorNote message={error} />}
      {!data && !error && <Skeleton label="Reading the trend graph…" />}
      {data && <FreshnessLine items={data.freshness} />}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Trend board from Neo4j */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Trend lifecycle board</span>
              <CypherTrace cypher={data.cypher} rows={data.trends.length} />
            </div>
            <p className="text-[10px] text-neutral-500">
              Stage, velocity and weekly upside are illustrative demo values. The pantry match and the You.com web proof are live.
            </p>
            {data.trends.map((t) => {
              const isSelected = selected?.id === t.id;
              const ready = t.missing.length === 0;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`w-full text-left p-3.5 rounded-xl border transition ${
                    isSelected
                      ? "bg-amber-950/20 border-amber-500/70"
                      : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${stageStyle[t.stage]}`}>{t.stage}</span>
                    <span className="text-[11px] font-mono text-amber-300 flex items-center gap-1">
                      <Flame className="w-3 h-3" />+{t.velocity}%
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white mt-1.5">{t.name}</div>
                  <div className="text-[11px] mt-1 flex items-center gap-1.5">
                    {ready ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> You stock everything
                      </span>
                    ) : (
                      <span className="text-neutral-400 flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3" /> Need: {t.missing.join(", ")}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected trend detail */}
          <div className="lg:col-span-7 space-y-4">
            {selected && (
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{selected.name}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {selected.hook} hook · {selected.format}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-bold text-emerald-400">${selected.weeklyRevenue.toLocaleString()}</div>
                    <div className="text-[10px] text-neutral-500">est. weekly upside</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[10px] text-neutral-500 uppercase mb-1">In your pantry</div>
                    <div className="text-emerald-300">{selected.have.join(", ") || "Nothing yet"}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800">
                    <div className="text-[10px] text-neutral-500 uppercase mb-1">To buy</div>
                    <div className="text-amber-300">{selected.missing.join(", ") || "Nothing, ready this weekend"}</div>
                  </div>
                </div>
                <p className="text-[11px] text-neutral-400">
                  Fits {selected.fits.join(", ")}
                  {selected.fitsUs ? " (your menu)" : " (not your cuisine)"} ·{" "}
                  {selected.rivalsOnIt.length ? (
                    <span className="text-rose-300">{selected.rivalsOnIt.join(", ")} already on it</span>
                  ) : (
                    <span className="text-emerald-300">no rival nearby is doing it</span>
                  )}
                </p>
                {(selected.stage === "Saturated" || selected.stage === "Mainstream") && (
                  <p className="text-[11px] text-rose-300/90">
                    This one is past its peak. Chasing it now makes you look late, not trendy.
                  </p>
                )}
                {onPlanPost && (selected.stage === "Emerging" || selected.stage === "Accelerating") && (
                  <button
                    onClick={() => onPlanPost(selected.name)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 flex items-center gap-1.5"
                  >
                    <Clapperboard className="w-3.5 h-3.5" /> Plan a post for this trend
                  </button>
                )}
                <YouSources
                  result={evidence}
                  loading={evidenceLoading}
                  title={`Web proof: ${selected.name}`}
                  emptyText="No coverage this month. Could be early, or could be a graph-only signal."
                />
              </div>
            )}

            <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
              <YouSources
                result={data.pulse}
                title={`${data.restaurant.city} food buzz this week`}
                emptyText="Nothing new this week."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
