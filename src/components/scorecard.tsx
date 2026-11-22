"use client";

import React from "react";
import type { Scorecard } from "@/types";

const VERDICT: Record<Scorecard["verdict"], { label: string; style: string }> = {
  continue: { label: "Continue", style: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  discontinue: { label: "Discontinue", style: "bg-rose-500/15 text-rose-300 border-rose-500/40" },
  review: { label: "Review", style: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  "ready-to-test": { label: "Ready to test", style: "bg-sky-500/15 text-sky-300 border-sky-500/40" },
  "not-eligible": { label: "Not eligible", style: "bg-neutral-700/30 text-neutral-400 border-neutral-600" },
  discontinued: { label: "Discontinued", style: "bg-neutral-700/30 text-neutral-400 border-neutral-600" },
};

export const VerdictChip: React.FC<{ verdict: Scorecard["verdict"] }> = ({ verdict }) => (
  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${VERDICT[verdict].style}`}>{VERDICT[verdict].label}</span>
);

/** Overall 1–10 with the 6.5 line; colour shows which side of it the creator sits. */
export const ScoreBadge: React.FC<{ s: Scorecard }> = ({ s }) => (
  <span
    className={`font-display text-sm tabular-nums ${s.overall >= 6.5 ? "text-emerald-300" : s.overall >= 4 ? "text-amber-300" : "text-rose-300"}`}
    title="Overall score out of 10 (6.5+ and a positive payback to continue)"
  >
    {s.overall.toFixed(1)}
    <span className="text-[10px] text-neutral-500">/10</span>
  </span>
);

const Bar: React.FC<{ label: string; value: number | null; hint: string }> = ({ label, value, hint }) => (
  <div className="flex items-center gap-1.5" title={hint}>
    <span className="w-14 text-[10px] text-neutral-400">{label}</span>
    <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
      {value !== null && (
        <div
          className={`h-full rounded-full ${value >= 6.5 ? "bg-emerald-300" : value >= 4 ? "bg-amber-300" : "bg-rose-300"}`}
          style={{ width: `${value * 10}%` }}
        />
      )}
    </div>
    <span className="w-8 text-right font-mono text-[10px] text-neutral-300">{value === null ? "—" : value.toFixed(1)}</span>
  </div>
);

/** The three spaces from the PM brief: local pull, culinary fit, tracked ROI & speed. */
export const ScoreBars: React.FC<{ s: Scorecard }> = ({ s }) => (
  <div className="space-y-1">
    <Bar label="Local pull" value={s.local} hint="Share of local audience or local posts, weighted by how close they are to you" />
    <Bar label="Culinary" value={s.culinary} hint="Covers your cuisine, and whether they already posted from you" />
    <Bar
      label="ROI & TTV"
      value={s.roi}
      hint={s.roi === null ? "No completed comps yet" : `Return ${s.returnRatio}× of comp value; first booking in ${s.ttvDays ?? "—"} days`}
    />
  </div>
);
