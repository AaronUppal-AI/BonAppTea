"use client";

import React, { useState } from "react";
import { Cpu, DollarSign, Mail, Linkedin, Copy, Check, ExternalLink, Sparkles, UserCheck } from "lucide-react";
import { MOCK_SPONSOR_LEADS } from "@/lib/mockData";
import { SponsorLead } from "@/types";

export const TrackCreatorBusiness: React.FC = () => {
  const [leads, setLeads] = useState<SponsorLead[]>(MOCK_SPONSOR_LEADS);
  const [selectedLead, setSelectedLead] = useState<SponsorLead>(MOCK_SPONSOR_LEADS[0]);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [customBrandInput, setCustomBrandInput] = useState("");
  const [isSearchingTreg, setIsSearchingTreg] = useState(false);

  // Dynamic Rate Card state
  const [subscribers, setSubscribers] = useState(45000);
  const [avgViews, setAvgViews] = useState(28000);
  const cpm = 54; // $54 CPM for verified developers
  const podcastPreRoll = Math.round((avgViews / 1000) * 35);
  const youtubeIntegration = Math.round((avgViews / 1000) * cpm);
  const newsletterDedicated = Math.round((subscribers / 1000) * 40);

  const handleCopyPitch = () => {
    const pitch = `Subject: Partnership concept: ${selectedLead.brandName} x Aaron (DevTools audience)

Hi ${selectedLead.decisionMaker.name.split(" ")[0]},

Saw ${selectedLead.brandName}'s recent developer marketing push and loved your emphasis on ${selectedLead.industry}.

I run a publication and video channel reaching 45,000+ software engineers and technical founders (72% verified devs). We are currently filming a benchmark breakdown on local reasoning models and database scalability.

Given your product capabilities, I'd love to integrate a native 60-second walkthrough showing developers how ${selectedLead.suggestedAngle}

Our 30-day average engagement is ${avgViews.toLocaleString()} views with a $${cpm} CPM. Would you be open to reviewing our interactive live rate card and availability for next month?

Live Media Kit: https://plate.bio/@aaron

Best,
Aaron`;

    navigator.clipboard.writeText(pitch);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleEnrichBrand = async () => {
    if (!customBrandInput.trim()) return;
    setIsSearchingTreg(true);
    try {
      const res = await fetch("/api/business/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainOrBrand: customBrandInput }),
      });
      const data = await res.json();
      if (data.lead) {
        setLeads((prev) => [data.lead, ...prev]);
        setSelectedLead(data.lead);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingTreg(false);
      setCustomBrandInput("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <span>Track 3: Creator Business & Sponsor Lead Waterfall</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Identifies active brand budgets in your niche, enriches verified decision-makers via Treg with 0% markup, and maintains dynamic rate cards.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono">
            Treg Micro-Billing: ~$0.038 / Lead
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Sponsor Roster & Treg Enrichment Search */}
        <div className="lg:col-span-5 space-y-4">
          {/* Custom Brand Enrichment via Treg */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2">
            <label className="text-xs font-semibold text-neutral-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Enrich Any Brand via Treg Gateway:</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={customBrandInput}
                onChange={(e) => setCustomBrandInput(e.target.value)}
                placeholder="e.g. modal.com, pinecone.io, stripe..."
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleEnrichBrand}
                disabled={isSearchingTreg}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
              >
                {isSearchingTreg ? "..." : "Enrich"}
              </button>
            </div>
            <span className="text-[10px] text-neutral-500 block">
              Powered by Treg: Apollo/Hunter waterfall with zero monthly SaaS seat licenses.
            </span>
          </div>

          {/* Active Sponsors List */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
              Active Advertisers in Your Niche
            </span>

            {leads.map((lead) => {
              const isSelected = selectedLead.id === lead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? "bg-emerald-950/20 border-emerald-500/80 shadow-lg shadow-emerald-500/10"
                      : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">{lead.brandName}</span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {lead.budgetStatus}
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-400">{lead.industry}</p>

                  <div className="mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <UserCheck className="w-3 h-3" />
                      <span>{lead.decisionMaker.name}</span>
                    </span>
                    <span>Treg Cost: ${lead.tregCallCostUsd.toFixed(3)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Verified Lead Profile, 1-Click Pitch, and Dynamic Media Kit Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-5">
            {/* Sponsor Header & Decision Maker */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-800 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-white">{selectedLead.brandName}</h3>
                  <a
                    href={`https://${selectedLead.domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-neutral-400 hover:text-white flex items-center space-x-0.5"
                  >
                    <span>{selectedLead.domain}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">{selectedLead.industry}</p>
              </div>

              <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
                <span className="text-[10px] text-neutral-500 block uppercase font-mono">Budget Tier:</span>
                <span className="font-semibold text-emerald-400">{selectedLead.estimatedBudgetRange}</span>
              </div>
            </div>

            {/* Decision Maker Contact Card */}
            <div className="p-3.5 rounded-xl bg-neutral-900/80 border border-neutral-800 space-y-2">
              <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">
                Verified Decision Maker (Enriched via Treg):
              </span>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                    <span>{selectedLead.decisionMaker.name}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-normal">
                      Verified
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">{selectedLead.decisionMaker.title}</div>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="font-mono text-neutral-300 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
                    {selectedLead.decisionMaker.email}
                  </span>
                  <a
                    href={selectedLead.decisionMaker.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
                    title="LinkedIn Profile"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-sky-400" />
                  </a>
                </div>
              </div>
            </div>

            {/* Tailored Pitch Generator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-neutral-400 font-bold">
                  High-Converting Sponsor Pitch (Auto-Personalized):
                </span>
                <button
                  onClick={handleCopyPitch}
                  className="flex items-center space-x-1 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  {copiedPitch ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPitch ? "Copied Pitch!" : "Copy Pitch"}</span>
                </button>
              </div>

              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-1.5 leading-relaxed font-sans">
                <p className="font-semibold text-white">
                  Angle: {selectedLead.suggestedAngle}
                </p>
                <p className="text-neutral-400 text-[11px]">
                  Recent Competitor Deals: {selectedLead.recentSponsorships.join(" • ")}
                </p>
              </div>
            </div>

            {/* Live Media Kit & Dynamic Rate Card Calculator */}
            <div className="pt-3 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Dynamic Rate Card Calculator
                  </span>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">
                  Blended CPM: <strong className="text-emerald-400">${cpm}</strong>
                </span>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex justify-between text-neutral-400 text-[11px] mb-1">
                    <span>Newsletter Readers</span>
                    <span className="font-mono text-white">{subscribers.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="10000"
                    max="150000"
                    step="5000"
                    value={subscribers}
                    onChange={(e) => setSubscribers(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-neutral-400 text-[11px] mb-1">
                    <span>Avg Video Views</span>
                    <span className="font-mono text-white">{avgViews.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="5000"
                    max="100000"
                    step="2000"
                    value={avgViews}
                    onChange={(e) => setAvgViews(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>

              {/* Rate Card Estimates */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">60s Pre-Roll</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    ${podcastPreRoll.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">Dedicated Email</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    ${newsletterDedicated.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                  <span className="text-[10px] text-neutral-400 block">YouTube Integration</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    ${youtubeIntegration.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Dynamic URL Callout */}
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-bold">🌐 Live Media Kit:</span>
                  <span className="font-mono text-neutral-200">plate.bio/@aaron</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
                  Masko Mascot Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
