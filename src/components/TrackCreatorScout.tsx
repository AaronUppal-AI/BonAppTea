"use client";

import React, { useEffect, useState } from "react";
import { Users, CheckCircle2, XCircle, Copy, Check, MapPin } from "lucide-react";
import type { RestaurantProfile, VettedCreator } from "@/types";
import { CypherTrace, TrackHeader, ErrorNote, getJson } from "./ui";

interface CreatorsData {
  restaurant: RestaurantProfile;
  creators: VettedCreator[];
  featuredDish: string | null;
  cypher: string;
}

const k = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));

function inviteText(c: VettedCreator, r: RestaurantProfile, dish: string | null, shift: string) {
  const name = c.handle.replace(/^@/, "");
  return `Hey ${name}! We're ${r.name}, a ${r.cuisine.toLowerCase()} spot in ${r.neighborhood}. Your ${c.audienceHood} followers are exactly the neighbors we cook for. We'd love to host you and a guest for a comped tasting${dish ? ` of our ${dish}` : ""} on ${shift}. No posting required; if you love it, we'd be thrilled if you shared it. Which night works?`;
}

export const TrackCreatorScout: React.FC = () => {
  const [data, setData] = useState<CreatorsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<VettedCreator | null>(null);
  const [shift, setShift] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getJson<CreatorsData>("/api/creators")
      .then((d) => {
        setData(d);
        setSelected(d.creators.find((c) => c.passed) ?? null);
        setShift(d.restaurant.slowShifts[0] ?? "a weeknight");
      })
      .catch((e) => setError(e.message));
  }, []);

  const passed = data?.creators.filter((c) => c.passed) ?? [];
  const rejected = data?.creators.filter((c) => !c.passed) ?? [];
  const invite = selected && data ? inviteText(selected, data.restaurant, data.featuredDish, shift) : "";

  return (
    <div className="space-y-6">
      <TrackHeader
        icon={<Users className="w-5 h-5 text-emerald-400" />}
        title="Creator Scout: Stop Comping Freeloaders"
        subtitle="Every creator is vetted in the graph: micro-sized, mostly local, near you, and not working for a rival."
        right={
          data && (
            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              {passed.length} of {data.creators.length} worth a table
            </span>
          )
        }
      />

      {error && <ErrorNote message={error} />}
      {!data && !error && <div className="text-xs text-neutral-500 animate-pulse">Vetting local creators…</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Passed vetting</span>
              <CypherTrace cypher={data.cypher} rows={data.creators.length} />
            </div>
            {passed.length === 0 && <div className="text-xs text-neutral-500">No creator passes yet.</div>}
            {passed.map((c) => (
              <button
                key={c.handle}
                onClick={() => setSelected(c)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  selected?.handle === c.handle ? "bg-emerald-950/20 border-emerald-500/70" : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {c.handle}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-300">score {c.score}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-400">
                  <span>{k(c.followers)} followers</span>
                  <span className="text-emerald-300">{c.localPct}% local</span>
                  <span>{c.engagement}% engagement</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" /> {c.audienceHood} ({c.proximity === "home" ? "your neighborhood" : "next door"})
                  </span>
                </div>
              </button>
            ))}

            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block pt-2">Filtered out</span>
            {rejected.map((c) => (
              <div key={c.handle} className="p-3 rounded-xl border border-neutral-800/70 bg-neutral-950/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400/80" /> {c.handle}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {k(c.followers)} · {c.localPct}% local
                  </span>
                </div>
                <ul className="mt-1 text-[11px] text-rose-300/80 list-disc list-inside">
                  {c.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5">
            {selected ? (
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3 lg:sticky lg:top-32">
                <h3 className="text-sm font-bold text-white">VIP tasting invite for {selected.handle}</h3>
                <label className="block text-[11px] text-neutral-400">
                  Slow shift to fill
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white"
                  >
                    {data.restaurant.slowShifts.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-neutral-200 leading-relaxed p-3 rounded-lg bg-neutral-950/60 border border-neutral-800">
                  {invite}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(invite);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy invite"}
                </button>
                <p className="text-[10px] text-neutral-500">
                  Creator stats are demo data in the graph. Live discovery from geo-tagged posts goes through Treg.
                </p>
              </div>
            ) : (
              <div className="text-xs text-neutral-500">Select a creator to draft an invite.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
