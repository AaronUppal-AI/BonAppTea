"use client";

import React, { useState } from "react";
import { Search, ShieldCheck, AlertTriangle, XCircle, CheckCircle, Copy, Check, ExternalLink, FileText, Sparkles } from "lucide-react";
import { Claim } from "@/types";
import { MOCK_CLAIMS } from "@/lib/mockData";

export const TrackResearchDesk: React.FC = () => {
  const [statementInput, setStatementInput] = useState(
    "OpenAI quietly acquired an open-source humanoid robotics startup in Germany for $1.2B."
  );
  const [claimsList, setClaimsList] = useState<Claim[]>(MOCK_CLAIMS);
  const [activeClaim, setActiveClaim] = useState<Claim>(MOCK_CLAIMS[0]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedBrief, setCopiedBrief] = useState(false);

  const handleVerifyClaim = async () => {
    if (!statementInput.trim()) return;
    setIsVerifying(true);
    try {
      const res = await fetch("/api/research/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statement: statementInput }),
      });
      const data = await res.json();
      if (data.claim) {
        setClaimsList((prev) => [data.claim, ...prev]);
        setActiveClaim(data.claim);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyProductionBrief = () => {
    const brief = `# Research & Fact-Check Production Brief
**Topic Claim:** "${activeClaim.statement}"
**Verdict:** ${activeClaim.status.toUpperCase()} (Confidence Score: ${activeClaim.confidenceScore}%)
**Grounded via:** You.com Multi-Source Web Index

## 1. Editorial Verdict & Summary
${activeClaim.verdictExplanation}

## 2. Primary Source Footnotes
- Source: [${activeClaim.primarySource?.title}](${activeClaim.primarySource?.url})
- Published: ${activeClaim.primarySource?.publicationDate}
- Snippet: "${activeClaim.primarySource?.snippet}"

## 3. Discrepancy & Steelmanned Counterarguments
${activeClaim.counterargument || "No major counterarguments recorded."}

---
Verified via BonAppTea Research Desk Engine`;

    navigator.clipboard.writeText(brief);
    setCopiedBrief(true);
    setTimeout(() => setCopiedBrief(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Search className="w-5 h-5 text-pink-400" />
            <span>Track 4: Research Desk & Anti-Hallucination Engine</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Fact-checks scripts and breaking claims against You.com's live web index and Neo4j GraphRAG before you post.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2.5 py-1 rounded-full font-mono flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Grounding: You.com Search API</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Verification Prompt Bar & Recent Claims */}
        <div className="lg:col-span-5 space-y-4">
          {/* Claim Verification Input */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300">
                Check Any Claim or News Rumor:
              </label>
              <div className="flex space-x-1.5">
                <button
                  onClick={() =>
                    setStatementInput(
                      "OpenAI quietly acquired an open-source humanoid robotics startup in Germany for $1.2B."
                    )
                  }
                  className="text-[10px] text-neutral-400 hover:text-white bg-neutral-800 px-2 py-0.5 rounded transition"
                >
                  Rumor 1
                </button>
                <button
                  onClick={() =>
                    setStatementInput(
                      "pgvector with HNSW on Postgres reduces vector memory overhead by over 60% compared to pure IVFFlat."
                    )
                  }
                  className="text-[10px] text-neutral-400 hover:text-white bg-neutral-800 px-2 py-0.5 rounded transition"
                >
                  Benchmark 2
                </button>
              </div>
            </div>

            <textarea
              value={statementInput}
              onChange={(e) => setStatementInput(e.target.value)}
              rows={3}
              placeholder="Paste a spicy claim, benchmark statistic, or tweet rumor..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-pink-500 transition"
            />

            <button
              onClick={handleVerifyClaim}
              disabled={isVerifying}
              className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 shadow-md shadow-pink-600/20 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isVerifying ? "Querying You.com & Knowledge Graph..." : "Fact-Check With You.com"}</span>
            </button>
          </div>

          {/* Claims Feed List */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
              Audited Claims in Episode
            </span>

            {claimsList.map((c) => {
              const isSelected = activeClaim.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveClaim(c)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? "bg-neutral-900/90 border-pink-500/80 shadow-lg shadow-pink-500/10"
                      : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 ${
                        c.status === "debunked"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : c.status === "verified"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {c.status === "debunked" && <XCircle className="w-3 h-3" />}
                      {c.status === "verified" && <CheckCircle className="w-3 h-3" />}
                      {c.status === "disputed" && <AlertTriangle className="w-3 h-3" />}
                      <span>{c.status.toUpperCase()}</span>
                    </span>

                    <span className="text-[10px] font-mono text-neutral-400">
                      {c.confidenceScore}% Confidence
                    </span>
                  </div>

                  <p className="text-xs text-neutral-200 font-medium line-clamp-2">
                    "{c.statement}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Cited Brief & Footnotes */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-5">
            {/* Verdict Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-800 gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-pink-400 font-bold block">
                  Grounding Audit Result
                </span>
                <h3 className="text-sm font-bold text-white mt-1">
                  "{activeClaim.statement}"
                </h3>
              </div>

              <div
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold shrink-0 ${
                  activeClaim.status === "debunked"
                    ? "bg-rose-950/40 border-rose-500/60 text-rose-300"
                    : activeClaim.status === "verified"
                    ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-300"
                    : "bg-amber-950/40 border-amber-500/60 text-amber-300"
                }`}
              >
                Verdict: {activeClaim.status.toUpperCase()}
              </div>
            </div>

            {/* Verdict Explanation Box */}
            <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">
                Investigative Synthesis:
              </span>
              <p className="text-xs text-neutral-200 leading-relaxed font-sans">
                {activeClaim.verdictExplanation}
              </p>
              {activeClaim.discrepancyNote && (
                <div className="p-2 rounded bg-neutral-950 border border-neutral-800 text-[11px] text-amber-300/90 font-mono">
                  🚨 Discrepancy Note: {activeClaim.discrepancyNote}
                </div>
              )}
            </div>

            {/* Primary Grounded Source (You.com) */}
            {activeClaim.primarySource && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">
                  Primary Source Citation (Retrieved via You.com API):
                </span>
                <div className="p-3.5 rounded-xl bg-neutral-900/40 border border-neutral-800 hover:border-pink-500/30 transition space-y-1.5">
                  <div className="flex items-center justify-between">
                    <a
                      href={activeClaim.primarySource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-indigo-400 hover:underline flex items-center space-x-1"
                    >
                      <span>{activeClaim.primarySource.title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {activeClaim.primarySource.publicationDate}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 italic">
                    "{activeClaim.primarySource.snippet}"
                  </p>
                </div>
              </div>
            )}

            {/* Steelmanned Counterargument */}
            {activeClaim.counterargument && (
              <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/30 space-y-1">
                <span className="text-[10px] font-mono uppercase text-indigo-300 font-bold block">
                  🛡️ Steelmanned Counterargument (Prepare For Comments):
                </span>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {activeClaim.counterargument}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">
                Confidence: <strong className="text-white">{activeClaim.confidenceScore}%</strong>
              </span>

              <button
                onClick={handleCopyProductionBrief}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
              >
                {copiedBrief ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{copiedBrief ? "Brief Copied!" : "Copy Production Brief"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
