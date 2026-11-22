"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Clapperboard, Music, Hash, Copy, Check } from "lucide-react";
import type { PostPlan, RestaurantProfile, YouSearchResponse } from "@/types";
import { YouSources, CypherTrace, TrackHeader, ErrorNote, stageStyle, getJson } from "./ui";

interface PlansData {
  restaurant: RestaurantProfile;
  plans: PostPlan[];
  cypher: string;
}

const tag = (s: string) => "#" + s.replace(/[^A-Za-z0-9]/g, "");

function buildPost(plan: PostPlan, r: RestaurantProfile) {
  const b = plan.best!;
  const captions: Record<string, string> = {
    "Sensory ASMR": `Sound on. ${plan.dish} at ${r.name}, ${r.neighborhood}. Tag who you're bringing.`,
    "Shock/Scale": `Nobody believes we do this until they see it. ${plan.dish}, only at ${r.name} in ${r.neighborhood}.`,
    "Secret Menu": `What our chef orders off the clock: ${plan.dish}. Ask for it at ${r.name}.`,
  };
  return {
    clips: [
      { secs: "1.5s", shot: `Macro: the ${b.format}` },
      { secs: "2s", shot: `Chef plating the ${plan.dish}` },
      { secs: "2s", shot: "First bite, real reaction, no talking" },
    ],
    caption: captions[b.hook] ?? `${plan.dish} at ${r.name}, ${r.neighborhood}.`,
    hashtags: [
      tag(r.city === "New York" ? "NYCFoodie" : `${r.city}Foodie`),
      tag(`${r.neighborhood}Eats`),
      tag(plan.dish),
      tag(b.trend),
    ],
  };
}

export const TrackDishToPost: React.FC<{ focusTrend?: string | null }> = ({ focusTrend }) => {
  const [data, setData] = useState<PlansData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refs, setRefs] = useState<YouSearchResponse | null>(null);
  const [refsLoading, setRefsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getJson<PlansData>("/api/post/plans")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  // Pick the dish that matches a trend handed over from Trend Radar, else the best match.
  useEffect(() => {
    if (!data) return;
    const focused = focusTrend ? data.plans.find((p) => p.best?.trend === focusTrend) : undefined;
    setSelectedId((focused ?? data.plans.find((p) => p.best) ?? data.plans[0])?.id ?? null);
  }, [data, focusTrend]);

  const plan = data?.plans.find((p) => p.id === selectedId) ?? null;
  const post = useMemo(() => (plan?.best && data ? buildPost(plan, data.restaurant) : null), [plan, data]);

  useEffect(() => {
    if (!plan?.best) {
      setRefs(null);
      return;
    }
    setRefsLoading(true);
    getJson<YouSearchResponse>(
      `/api/post/references?dish=${encodeURIComponent(plan.dish)}&trend=${encodeURIComponent(plan.best.trend)}`
    )
      .then(setRefs)
      .catch((e) => setRefs({ query: plan.dish, live: false, sources: [], error: e.message }))
      .finally(() => setRefsLoading(false));
  }, [plan]);

  const copyPost = () => {
    if (!post) return;
    navigator.clipboard?.writeText(`${post.caption}\n\n${post.hashtags.join(" ")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <TrackHeader
        icon={<Clapperboard className="w-5 h-5 text-pink-400" />}
        title="Dish-to-Post: Go Viral on FoodTok & Reels"
        subtitle="Pick a dish. The graph pairs it with a live trend and hands the kitchen a 10-second shot list."
      />

      {error && <ErrorNote message={error} />}
      {!data && !error && <div className="text-xs text-neutral-500 animate-pulse">Matching your menu to trends…</div>}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Your menu</span>
              <CypherTrace cypher={data.cypher} rows={data.plans.length} />
            </div>
            {data.plans.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  p.id === selectedId ? "bg-pink-950/20 border-pink-500/70" : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{p.dish}</span>
                  <span className="text-[10px] font-mono text-neutral-400">{p.margin !== null ? `${Math.round(p.margin * 100)}% margin` : "tasting course"}</span>
                </div>
                <div className="text-[11px] mt-1">
                  {p.best ? (
                    <span className="text-pink-300">
                      ↗ {p.best.trend} (+{p.best.velocity}%)
                    </span>
                  ) : (
                    <span className="text-neutral-500">No live trend match</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 space-y-4">
            {plan && !plan.best && (
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 text-xs text-neutral-400">
                {plan.dish} doesn&apos;t share ingredients with an emerging or accelerating trend right now. Post it as a
                plain beauty shot, or pick a dish with a trend match.
              </div>
            )}

            {plan?.best && post && (
              <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-white">{plan.dish}</h3>
                  <span className="text-xs text-neutral-500">as a</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full border ${stageStyle[plan.best.stage]}`}>
                    {plan.best.trend} · +{plan.best.velocity}%
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">{plan.best.hook} hook</span>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Shot list (text this to the chef)</span>
                  <ol className="mt-2 grid sm:grid-cols-3 gap-2">
                    {post.clips.map((c, i) => (
                      <li key={i} className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs">
                        <div className="text-[10px] font-mono text-pink-300">
                          Clip {i + 1} · {c.secs}
                        </div>
                        <div className="text-neutral-200 mt-0.5">{c.shot}</div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-neutral-500">Caption</span>
                    <button onClick={copyPost} className="text-[11px] text-pink-300 hover:text-pink-200 flex items-center gap-1">
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="text-neutral-200">{post.caption}</p>
                  <p className="text-sky-300 flex items-center gap-1 flex-wrap">
                    <Hash className="w-3 h-3" /> {post.hashtags.join(" ")}
                  </p>
                  <p className="text-neutral-400 flex items-center gap-1">
                    <Music className="w-3 h-3" /> {plan.best.audio}
                  </p>
                </div>

                <YouSources
                  result={refs}
                  loading={refsLoading}
                  title="How others are filming it"
                  emptyText="No reference videos this month. You'd be early."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
