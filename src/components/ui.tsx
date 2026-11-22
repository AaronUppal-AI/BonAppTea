"use client";

import React, { useState } from "react";
import { ExternalLink, Globe, Database } from "lucide-react";
import type { YouSearchResponse } from "@/types";

/** A list of You.com web sources, with an honest empty/offline state. */
export const YouSources: React.FC<{
  result: YouSearchResponse | null;
  loading?: boolean;
  title?: string;
  emptyText?: string;
}> = ({ result, loading, title = "Live from the web", emptyText = "No recent sources found." }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-sky-400" /> {title}
      </span>
      <span className="text-[10px] font-mono text-sky-400/80">You.com Search</span>
    </div>
    {loading && <div className="text-xs text-neutral-500 animate-pulse">Searching You.com…</div>}
    {!loading && result && !result.live && (
      <div className="text-xs text-amber-400/90">Live search unavailable: {result.error}</div>
    )}
    {!loading && result?.live && result.sources.length === 0 && (
      <div className="text-xs text-neutral-500">{emptyText}</div>
    )}
    {!loading &&
      result?.sources.map((s) => (
        <a
          key={s.url}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 hover:border-sky-500/40 transition group"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
            {s.faviconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.faviconUrl} alt="" className="w-3 h-3 rounded-sm" />
            )}
            <span>{s.domain}</span>
            {s.publishedAt && <span>· {formatDate(s.publishedAt)}</span>}
            <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
          </div>
          <div className="text-xs font-semibold text-neutral-200 group-hover:text-white mt-0.5 line-clamp-1">{s.title}</div>
          {s.snippet && <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">{s.snippet}</p>}
        </a>
      ))}
  </div>
);

/** Collapsible display of the Cypher query behind a panel. */
export const CypherTrace: React.FC<{ cypher?: string; rows?: number }> = ({ cypher, rows }) => {
  const [open, setOpen] = useState(false);
  if (!cypher) return null;
  return (
    <div className="text-[10px] font-mono">
      <button onClick={() => setOpen((v) => !v)} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
        <Database className="w-3 h-3" /> Neo4j query{rows !== undefined ? ` · ${rows} rows` : ""} {open ? "▲" : "▼"}
      </button>
      {open && (
        <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-black/60 border border-neutral-800 p-2 whitespace-pre-wrap text-indigo-300">
          {cypher}
        </pre>
      )}
    </div>
  );
};

/** Cinematic section header: "Trend Radar: Menu Hacking…" becomes a mono kicker over a chrome headline. */
export const TrackHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; right?: React.ReactNode }> = ({
  icon,
  title,
  subtitle,
  right,
}) => {
  const [kicker, ...rest] = title.split(":");
  const headline = rest.length ? rest.join(":").trim() : kicker;
  return (
    <div className="relative -mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-2 px-5 sm:px-6 pt-8 pb-6 rounded-t-3xl overflow-hidden border-b border-white/5">
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(70% 120% at 0% 0%, rgba(124,255,196,0.14), transparent 60%), radial-gradient(60% 120% at 100% 0%, rgba(201,184,255,0.14), transparent 60%)",
        }}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          {rest.length > 0 && (
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.3em] phosphor">
              {icon}
              {kicker}
            </div>
          )}
          <h2 className="font-display chrome-text text-2xl sm:text-4xl leading-tight mt-1 flex items-center gap-2">
            {rest.length === 0 && icon}
            {headline}
          </h2>
          <p className="text-sm text-neutral-300 mt-2 max-w-3xl">{subtitle}</p>
        </div>
        {right}
      </div>
    </div>
  );
};

/** Placeholder blocks shown while a panel's data loads, so the layout appears at once. */
export const Skeleton: React.FC<{ label: string; cards?: number; side?: boolean }> = ({ label, cards = 3, side = true }) => (
  <div className="space-y-3" aria-busy="true" aria-label={label}>
    <div className="text-[11px] text-neutral-500 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> {label}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className={`${side ? "lg:col-span-5" : "lg:col-span-12"} space-y-3`}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-900/40 animate-pulse space-y-2">
            <div className="h-3 w-24 rounded bg-neutral-800" />
            <div className="h-4 w-2/3 rounded bg-neutral-800" />
            <div className="h-3 w-1/2 rounded bg-neutral-800/70" />
          </div>
        ))}
      </div>
      {side && (
        <div className="lg:col-span-7 p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 animate-pulse space-y-3">
          <div className="h-5 w-1/2 rounded bg-neutral-800" />
          <div className="h-3 w-full rounded bg-neutral-800/70" />
          <div className="h-3 w-5/6 rounded bg-neutral-800/70" />
          <div className="h-24 w-full rounded-lg bg-neutral-800/50" />
        </div>
      )}
    </div>
  </div>
);

export interface Freshness {
  key: string;
  label: string;
  source: string;
  at: string | null;
}

function ago(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  // Date-only values (e.g. "2026-11-22") are checks, not timestamps
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Where the data behind a panel or answer came from, and how fresh it is. */
export const FreshnessLine: React.FC<{ items?: Freshness[] | null }> = ({ items }) =>
  items && items.length ? (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-neutral-500">
      {items.map((f) => (
        <span key={f.key}>
          {f.label}: {f.source} · {f.at ? ago(f.at) : "not fetched yet"}
        </span>
      ))}
    </div>
  ) : null;

export const ErrorNote: React.FC<{ message: string }> = ({ message }) => (
  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300">{message}</div>
);

export const stageStyle: Record<string, string> = {
  Emerging: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  Accelerating: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  Mainstream: "bg-neutral-500/10 text-neutral-300 border-neutral-500/30",
  Saturated: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

export function formatDate(value: string): string {
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Small fetch helper that throws the server's error message. */
export async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}
