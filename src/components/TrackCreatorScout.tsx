"use client";

import React, { useEffect, useState } from "react";
import { Users, CheckCircle2, XCircle, Copy, Check, MapPin, Radar, ExternalLink } from "lucide-react";
import type { RestaurantProfile, VettedCreator } from "@/types";
import { CypherTrace, TrackHeader, ErrorNote, getJson } from "./ui";

interface ScanStatus {
  tregConfigured: boolean;
  lastScanAt: string | null;
  lastScanCostUsd: number | null;
  nextScanAt: string | null;
}

interface CreatorsData {
  restaurant: RestaurantProfile;
  creators: VettedCreator[];
  featuredDish: string | null;
  cypher: string;
  scan: ScanStatus;
}

interface ScanResult {
  skipped: boolean;
  nextScanAt: string | null;
  hashtags: string[];
  postsScanned: number;
  added: { handle: string }[];
  businessesSkipped: { handle: string; category: string }[];
  failures: string[];
  costUsd: number;
}

const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const LiveBadge: React.FC = () => (
  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30">
    Live · Treg
  </span>
);

/** The handle, linked to the real Instagram profile when there is one. Demo creators are labeled, not linked. */
const Handle: React.FC<{ c: VettedCreator; className?: string }> = ({ c, className }) =>
  c.profileUrl ? (
    <a
      href={c.profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`${className ?? ""} hover:underline inline-flex items-center gap-0.5`}
      title={`Open ${c.handle} on Instagram`}
    >
      {c.handle} <ExternalLink className="w-3 h-3 opacity-60" />
    </a>
  ) : (
    <span className={className}>
      {c.handle}{" "}
      <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-neutral-800 text-neutral-400 align-middle" title="Made-up seed data, not a real account">
        Demo
      </span>
    </span>
  );

const localText = (c: VettedCreator) =>
  c.localPct === null ? "local reach unknown" : c.localMetric === "posting" ? `${c.localPct}% of tagged posts in NYC` : `${c.localPct}% local`;

const proximityText: Record<VettedCreator["proximity"], string> = {
  home: "your neighborhood",
  adjacent: "next door",
  city: "city-wide",
  outside: "outside your area",
};

const k = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function inviteText(c: VettedCreator, r: RestaurantProfile, dish: string | null, shift: string) {
  const name = c.handle.replace(/^@/, "");
  const intro = c.alreadyPostedAboutUs
    ? `Hey ${name}! This is the team at ${r.name}. We saw your post from your dinner with us and loved it, thank you.`
    : `Hey ${name}! We're ${r.name}, ${/^[aeiou]/i.test(r.cuisine) ? "an" : "a"} ${r.cuisine} restaurant in ${r.neighborhood}${r.award ? ` (${r.award})` : ""}. Your food posts around ${r.city} caught our eye.`;
  return `${intro} We'd love to host you and a guest for a comped tasting${dish ? ` featuring our ${dish}` : ""} on ${shift}. No posting required; if you love it, we'd be thrilled if you shared it. Which night works?`;
}

export const TrackCreatorScout: React.FC = () => {
  const [data, setData] = useState<CreatorsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<VettedCreator | null>(null);
  const [shift, setShift] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const load = (keepSelection = false) =>
    getJson<CreatorsData>("/api/creators")
      .then((d) => {
        setData(d);
        if (!keepSelection) setSelected(d.creators.find((c) => c.passed) ?? d.creators.find((c) => c.alreadyPostedAboutUs) ?? null);
        setShift((s) => s || d.restaurant.slowShifts[0] || "a weeknight");
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const runScan = async () => {
    setScanning(true);
    setScanError(null);
    try {
      const result = await getJson<ScanResult>("/api/creators/discover", { method: "POST" });
      setScanResult(result);
      await load(true);
    } catch (e: any) {
      setScanError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const coolingDown = Boolean(data?.scan.nextScanAt && new Date(data.scan.nextScanAt).getTime() > Date.now());

  const passed = data?.creators.filter((c) => c.passed) ?? [];
  const rejected = data?.creators.filter((c) => !c.passed) ?? [];
  const invite = selected && data ? inviteText(selected, data.restaurant, data.featuredDish, shift) : "";

  return (
    <div className="space-y-6">
      <TrackHeader
        icon={<Users className="w-5 h-5 text-emerald-400" />}
        title="Creator Scout: Stop Comping Freeloaders"
        subtitle="Every creator is vetted in the graph: 2k–30k followers, mostly local, near you, and not working for a rival."
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
        <div className="p-3.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/10 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-xs">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Radar className="w-4 h-4 text-fuchsia-400" /> Live discovery from Instagram, via Treg
            </div>
            <p className="text-neutral-400 mt-0.5">
              Finds people who posted from {data.restaurant.name}&apos;s Instagram location tag
              {data.restaurant.instagram ? ` or #${data.restaurant.instagram}` : ""}, plus {data.restaurant.neighborhood} food hashtags.
              Drops restaurant accounts, measures each creator&apos;s followers, engagement and where they post, then writes them into the
              Neo4j graph for vetting. About 3¢ per scan.
            </p>
            {data.scan.lastScanAt && (
              <p className="text-[11px] text-neutral-500 mt-1">
                Last scan {new Date(data.scan.lastScanAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {data.scan.lastScanCostUsd !== null && ` · $${data.scan.lastScanCostUsd.toFixed(4)}`}
              </p>
            )}
          </div>
          <button
            onClick={runScan}
            disabled={scanning || coolingDown || !data.scan.tregConfigured}
            className="shrink-0 text-xs px-3 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold disabled:opacity-50"
          >
            {!data.scan.tregConfigured
              ? "Treg not configured"
              : scanning
              ? "Scanning Instagram… (~30s)"
              : coolingDown
              ? `Next scan after ${timeOf(data.scan.nextScanAt!)}`
              : "Scan for new creators"}
          </button>
        </div>
      )}
      {scanError && <ErrorNote message={scanError} />}
      {scanResult && !scanResult.skipped && (
        <div className="text-[11px] text-neutral-300 -mt-3 px-1">
          Scanned {scanResult.postsScanned} posts from {scanResult.hashtags.map((h) => `#${h}`).join(", ")} · added{" "}
          {scanResult.added.length} creator{scanResult.added.length === 1 ? "" : "s"} to the graph · skipped{" "}
          {scanResult.businessesSkipped.length} restaurant/business account{scanResult.businessesSkipped.length === 1 ? "" : "s"} · cost $
          {scanResult.costUsd.toFixed(4)}
          {scanResult.failures.length > 0 && <span className="text-amber-400"> · {scanResult.failures.length} lookups failed</span>}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Passed vetting</span>
              <CypherTrace cypher={data.cypher} rows={data.creators.length} />
            </div>
            {passed.length === 0 && (
              <div className="text-xs text-neutral-400 p-3 rounded-xl border border-neutral-800 bg-neutral-900/40">
                No creator passes the rules yet (2k–30k followers, at least 70% local). Real posters are often smaller or
                bigger. You can still pick anyone below, such as a warm lead who already posted from you, to draft an invite.
              </div>
            )}
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
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> <Handle c={c} />
                    {c.source === "treg" && <LiveBadge />}
                    {c.alreadyPostedAboutUs && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Already posted about you
                      </span>
                    )}
                    {c.cuisineFit && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                        Covers your cuisine
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-300">score {c.score}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-400">
                  <span>{k(c.followers)} followers</span>
                  <span className="text-emerald-300">{localText(c)}</span>
                  <span>{c.engagement}% engagement</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" /> {c.audienceHood} ({proximityText[c.proximity]})
                  </span>
                  {c.samplePostUrl && (
                    <a
                      href={c.samplePostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-fuchsia-300 hover:text-fuchsia-200 flex items-center gap-0.5"
                    >
                      post <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </button>
            ))}

            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block pt-2">Filtered out</span>
            {rejected.map((c) => (
              <div
                key={c.handle}
                onClick={() => setSelected(c)}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selected?.handle === c.handle ? "border-neutral-500 bg-neutral-900/70" : "border-neutral-800/70 bg-neutral-950/40 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400/80" /> <Handle c={c} />
                    {c.alreadyPostedAboutUs && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Posted from you
                      </span>
                    )}
                    {c.source === "treg" && <LiveBadge />}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {k(c.followers)} · {localText(c)}
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
                <h3 className="text-sm font-bold text-white">
                  VIP tasting invite for <Handle c={selected} />
                </h3>
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
                  {selected.source === "treg"
                    ? "Found live on Instagram through Treg. Instagram doesn't publish audience location, so local reach is measured by where they post."
                    : "Demo creator from the seed graph. Run a live scan to add real creators."}
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
