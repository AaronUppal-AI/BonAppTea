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

export const TrackHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; right?: React.ReactNode }> = ({
  icon,
  title,
  subtitle,
  right,
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-neutral-800">
    <div>
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h2>
      <p className="text-xs text-neutral-400">{subtitle}</p>
    </div>
    {right}
  </div>
);

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
