"use client";

import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, XCircle, Timer, Search } from "lucide-react";
import type { CreatorCheckResult } from "@/types";
import { YouSources, ErrorNote, getJson } from "./ui";
import { ScoreBars, VerdictChip, ScoreBadge } from "./scorecard";

const ICON = {
  good: <ShieldCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />,
  warn: <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />,
  bad: <XCircle className="w-3.5 h-3.5 text-rose-300 shrink-0" />,
};

/** Under-10-second live-web creator check: paste a handle from a DM before promising a seat. */
export const CreatorCheckPanel: React.FC<{ onChecked?: () => void }> = ({ onChecked }) => {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreatorCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!handle.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const r = await getJson<CreatorCheckResult>(
        "/api/creators/check",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle }) },
        15000
      );
      setResult(r);
      onChecked?.();
    } catch (e: any) {
      setError(e.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-3" aria-label="Creator check">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-emerald-300" /> Check a creator in under 10 seconds
          </div>
          <p className="text-[11px] text-neutral-400">
            Got a DM asking for a comp? Paste the handle: live You.com sources, what your graph knows, and #ad/#gifted disclosure flags.
          </p>
        </div>
        <div className="flex gap-2 sm:w-80">
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="@handle"
            maxLength={40}
            aria-label="Instagram handle to check"
            className="flex-1 min-w-0 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
          />
          <button
            onClick={run}
            disabled={loading || !handle.trim()}
            className="px-3 py-2 rounded-lg bg-emerald-400 text-black text-sm font-semibold hover:bg-emerald-300 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" /> {loading ? "Checking…" : "Check"}
          </button>
        </div>
      </div>

      {error && <ErrorNote message={error} onRetry={run} />}

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-1 animate-fade-up">
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold text-white">{result.handle}</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${result.elapsedMs < 10000 ? "border-emerald-500/40 text-emerald-300" : "border-amber-500/40 text-amber-300"}`}>
                checked in {(result.elapsedMs / 1000).toFixed(1)}s
              </span>
              {result.creator && <VerdictChip verdict={result.creator.scorecard.verdict} />}
              {result.creator && <ScoreBadge s={result.creator.scorecard} />}
            </div>
            {result.creator && <ScoreBars s={result.creator.scorecard} />}
            <ul className="space-y-1.5">
              {result.flags.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[12px] text-neutral-200">
                  {ICON[f.level]} <span>{f.text}</span>
                </li>
              ))}
            </ul>
            {result.disclosure.postsChecked > 0 && (
              <p className="font-mono text-[10px] text-neutral-500">
                Disclosure scan: {result.disclosure.disclosed}/{result.disclosure.postsChecked} recent posts tagged ·{" "}
                {result.disclosure.atUsDisclosed}/{result.disclosure.postsAtUs} posts from you tagged
              </p>
            )}
          </div>
          <div className="lg:col-span-7">
            <YouSources
              result={{ query: result.handle, live: !result.webError, sources: result.sources, error: result.webError ?? undefined }}
              title="Live web sources"
              emptyText="No web coverage found beyond Instagram."
            />
          </div>
        </div>
      )}
    </section>
  );
};
