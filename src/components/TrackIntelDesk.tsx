"use client";

import React, { useEffect, useState } from "react";
import { Binoculars, Target, ShieldQuestion, Search } from "lucide-react";
import type { RestaurantProfile, RivalComplaint, YouSearchResponse } from "@/types";
import { YouSources, CypherTrace, TrackHeader, ErrorNote, getJson } from "./ui";

interface IntelData {
  restaurant: RestaurantProfile;
  rivals: RivalComplaint[];
  buzz: YouSearchResponse;
  cypher: string;
}

const EXAMPLE_CLAIMS = [
  "San Marzano tomatoes must be grown near Mount Vesuvius to be DOP certified",
  "Traditional cacio e pepe has only three ingredients",
  "Guanciale is made from pork cheek",
];

export const TrackIntelDesk: React.FC = () => {
  const [data, setData] = useState<IntelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claim, setClaim] = useState("");
  const [claimResult, setClaimResult] = useState<YouSearchResponse | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    getJson<IntelData>("/api/intel")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const checkClaim = async (text: string) => {
    const value = text.trim();
    if (!value) return;
    setClaim(value);
    setClaimLoading(true);
    setClaimError(null);
    try {
      setClaimResult(
        await getJson<YouSearchResponse>("/api/intel/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claim: value }),
        })
      );
    } catch (e: any) {
      setClaimError(e.message);
      setClaimResult(null);
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <TrackHeader
        icon={<Binoculars className="w-5 h-5 text-sky-400" />}
        title="Intel Desk: Competitor Spy & Fact Check"
        subtitle="What your rivals are getting roasted for, what the neighborhood is saying, and proof for every claim you post."
      />

      {error && <ErrorNote message={error} />}
      {!data && !error && <div className="text-xs text-neutral-500 animate-pulse">Scanning the block…</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Rival complaints in {data.restaurant.neighborhood} · last 7 days
              </span>
              <CypherTrace cypher={data.cypher} rows={data.rivals.length} />
            </div>
            {data.rivals.length === 0 && <div className="text-xs text-neutral-500">No complaints about nearby rivals.</div>}
            {data.rivals.map((r) => (
              <div
                key={`${r.competitor}-${r.theme}`}
                className={`p-3.5 rounded-xl border ${r.ourAnswer ? "border-sky-500/40 bg-sky-950/10" : "border-neutral-800 bg-neutral-900/40"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    {r.competitor} <span className="text-[11px] text-neutral-500 font-normal">· {r.cuisine}</span>
                  </span>
                  <span className="text-[11px] font-mono text-rose-300">
                    {r.mentions}× {r.theme}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 italic mt-1">&ldquo;{r.sample}&rdquo;</p>
                {r.ourAnswer ? (
                  <p className="text-xs text-sky-200 mt-2 flex items-start gap-1.5">
                    <Target className="w-3.5 h-3.5 mt-0.5 shrink-0 text-sky-400" />
                    <span>
                      Opening: post a Reel about your <b>{r.ourAnswer}</b>.
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] text-neutral-500 mt-2">No matching strength on file. Nothing to exploit here.</p>
                )}
              </div>
            ))}
          </div>

          <div className="lg:col-span-6 space-y-5">
            <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
              <YouSources
                result={data.buzz}
                title={`${data.restaurant.neighborhood} restaurant news · last month`}
                emptyText="No neighborhood coverage this month."
              />
            </div>

            <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldQuestion className="w-3.5 h-3.5 text-sky-400" /> Fact-check a menu or marketing claim
              </span>
              <div className="flex gap-1.5">
                <input
                  value={claim}
                  onChange={(e) => setClaim(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkClaim(claim)}
                  maxLength={300}
                  placeholder="e.g. Our tomatoes are San Marzano DOP"
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={() => checkClaim(claim)}
                  disabled={claimLoading}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium disabled:opacity-50 flex items-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" /> Check
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_CLAIMS.map((c) => (
                  <button
                    key={c}
                    onClick={() => checkClaim(c)}
                    className="text-[10px] px-2 py-1 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  >
                    {c.length > 48 ? c.slice(0, 48) + "…" : c}
                  </button>
                ))}
              </div>
              {claimError && <ErrorNote message={claimError} />}
              {(claimResult || claimLoading) && (
                <>
                  <YouSources result={claimResult} loading={claimLoading} title="Evidence" emptyText="No sources found for this claim." />
                  {claimResult?.live && (
                    <p className="text-[10px] text-neutral-500">
                      These are the sources You.com found. Read them before you post; BonAppTea doesn&apos;t rule on claims for you.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
