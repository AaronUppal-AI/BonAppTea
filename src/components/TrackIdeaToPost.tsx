"use client";

import React, { useState } from "react";
import { Sparkles, Mic, Link2, Copy, Check, Video, ArrowRight, ShieldCheck } from "lucide-react";
import { MOCK_TRENDS } from "@/lib/mockData";

export const TrackIdeaToPost: React.FC = () => {
  const [inputText, setInputText] = useState(
    "Local reasoning models like DeepSeek R1 are everywhere, but will my 16GB M3 Mac melt if I try to code with them all day?"
  );
  const [selectedFormat, setSelectedFormat] = useState<"contrarian" | "analytical" | "narrative">("contrarian");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const matchedTrend = MOCK_TRENDS[0];

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getFormatScript = () => {
    switch (selectedFormat) {
      case "contrarian":
        return {
          hook: "Everyone tells you to run DeepSeek R1 locally, but on a 16GB MacBook, you're paying in 80-second thermal throttling. Here's the benchmark nobody published.",
          body: [
            "[0:00 - 0:05] HOOK: Visual of terminal frozen at 100% memory pressure.",
            "[0:05 - 0:25] THE CONTEXT: You.com telemetry shows 410% search spike in local LLMs this week, but 90% of tutorials use a $4,000 Mac Studio.",
            "[0:25 - 0:45] THE TEST: Real-world TypeScript refactor benchmark across 50 production files.",
            "[0:45 - 0:55] THE VERDICT: Run 1.5B locally for quick autocomplete; offload 7B+ reasoning to cloud endpoints like Together AI.",
            "[0:55 - 1:00] CTA: Grab the free benchmarking script in the description.",
          ],
          retentionScore: "84% (Top 5% in Niche)",
        };
      case "analytical":
        return {
          hook: "I benchmarked 5 distilled reasoning models against Claude 3.5 Sonnet across 50 real bugs. Here is the actual latency and accuracy breakdown.",
          body: [
            "[0:00 - 0:05] HOOK: Side-by-side timer showing Claude vs DeepSeek R1 7B distilled.",
            "[0:05 - 0:20] METRICS: Tokens per second, first token latency, RAM consumption.",
            "[0:20 - 0:40] CODE QUALITY: Syntax accuracy, hallucinated imports, edge-case coverage.",
            "[0:40 - 0:55] COST COMPARISON: Cloud API costs ($0.03/run) vs local hardware battery degradation.",
            "[0:55 - 1:00] CTA: What model are you running locally? Comment below.",
          ],
          retentionScore: "79% (High Engagement)",
        };
      case "narrative":
        return {
          hook: "I disconnected my Wi-Fi for 48 hours and tried to build a production SaaS using only local open-source models.",
          body: [
            "[0:00 - 0:05] HOOK: Pulling the Ethernet cable / turning off Wi-Fi on screen.",
            "[0:05 - 0:20] THE STAKES: Building auth, database migrations, and Stripe webhooks with zero internet access.",
            "[0:20 - 0:45] THE STRUGGLE: When the 7B model hallucinated an obsolete Prisma method and I had no StackOverflow.",
            "[0:45 - 0:55] THE SURPRISE: How local models actually forced me to write cleaner architecture.",
            "[0:55 - 1:00] CTA: Could you survive without cloud AI? Let me know.",
          ],
          retentionScore: "88% (Viral Algorithmic Potential)",
        };
    }
  };

  const scriptData = getFormatScript();

  return (
    <div className="space-y-6">
      {/* Track Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <span>Track 1: Idea to High-Performing Post</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Transforms messy voice notes or raw ideas into tuned scripts backed by live 7-day retention data.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-full font-mono">
            Format Engine: Neo4j Graph v2
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Creator Input & You.com Fresh Context */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300">Creator Input (Voice / Memo / Link)</label>
              <div className="flex space-x-1.5">
                <button
                  onClick={() =>
                    setInputText(
                      "Is Postgres with pgvector really 70% cheaper than Pinecone for vector embeddings?"
                    )
                  }
                  className="text-[10px] text-neutral-400 hover:text-white bg-neutral-800 px-2 py-0.5 rounded transition"
                >
                  Preset: Postgres
                </button>
                <button
                  onClick={() =>
                    setInputText(
                      "Local reasoning models like DeepSeek R1 are everywhere, but will my 16GB M3 Mac melt if I try to code with them all day?"
                    )
                  }
                  className="text-[10px] text-neutral-400 hover:text-white bg-neutral-800 px-2 py-0.5 rounded transition"
                >
                  Preset: Local AI
                </button>
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition"
              placeholder="Paste raw thoughts, a video URL, or transcription..."
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex space-x-2 text-neutral-400 text-xs">
                <span className="flex items-center space-x-1 hover:text-white cursor-pointer">
                  <Mic className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Voice Memo</span>
                </span>
                <span className="flex items-center space-x-1 hover:text-white cursor-pointer">
                  <Link2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Attach URL</span>
                </span>
              </div>
              <button
                onClick={() => {
                  setIsGenerating(true);
                  setTimeout(() => setIsGenerating(false), 600);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-indigo-600/20"
              >
                {isGenerating ? "Synthesizing..." : "Analyze & Generate Hooks"}
              </button>
            </div>
          </div>

          {/* Real-time Fact & Context Injection (You.com) */}
          <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-300 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>You.com Real-Time Context Injection</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full">
                FRESH (12h)
              </span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Ollama v0.5.8 released native 1.5B/7B quantized reasoning checkpoints 12 hours ago. Reddit r/LocalLLaMA
              reports 7B models consume ~8.4GB Unified Memory on Apple Silicon.
            </p>
            <div className="pt-1 flex flex-wrap gap-1.5 text-[10px]">
              <span className="bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded">
                Source: arxiv.org/abs/2501.12948
              </span>
              <span className="bg-neutral-900 text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded">
                Source: github.com/ollama
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: 3 Tuned Formats & Script Teleprompter */}
        <div className="lg:col-span-7 space-y-4">
          {/* Format Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSelectedFormat("contrarian")}
              className={`p-3 rounded-xl border text-left transition ${
                selectedFormat === "contrarian"
                  ? "bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10"
                  : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-indigo-400 font-bold mb-1">
                Format A
              </div>
              <div className="text-xs font-semibold">The Contrarian Take</div>
              <div className="text-[10px] text-neutral-400 mt-1">High retention (84%)</div>
            </button>

            <button
              onClick={() => setSelectedFormat("analytical")}
              className={`p-3 rounded-xl border text-left transition ${
                selectedFormat === "analytical"
                  ? "bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-500/10"
                  : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-purple-400 font-bold mb-1">
                Format B
              </div>
              <div className="text-xs font-semibold">Analytical Breakdown</div>
              <div className="text-[10px] text-neutral-400 mt-1">CTO & Lead Audience</div>
            </button>

            <button
              onClick={() => setSelectedFormat("narrative")}
              className={`p-3 rounded-xl border text-left transition ${
                selectedFormat === "narrative"
                  ? "bg-pink-600/20 border-pink-500 text-white shadow-md shadow-pink-500/10"
                  : "bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              <div className="text-[10px] font-mono uppercase text-pink-400 font-bold mb-1">
                Format C
              </div>
              <div className="text-xs font-semibold">Narrative Challenge</div>
              <div className="text-[10px] text-neutral-400 mt-1">Viral YouTube Reach</div>
            </button>
          </div>

          {/* Generated Hook & Teleprompter Draft */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center space-x-2">
                <Video className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Ready-to-Film Script Draft
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Proj. Retention: {scriptData.retentionScore}
              </span>
            </div>

            {/* Hook Callout */}
            <div className="p-3.5 rounded-lg bg-neutral-900/90 border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-indigo-400">
                Opening 5-Second Hook:
              </span>
              <p className="text-xs font-semibold text-white leading-relaxed">
                "{scriptData.hook}"
              </p>
            </div>

            {/* Script Breakdown */}
            <div className="space-y-2 text-xs text-neutral-300 font-mono">
              {scriptData.body.map((line, idx) => (
                <div key={idx} className="p-2 rounded bg-neutral-900/50 border border-neutral-900 hover:border-neutral-800 transition">
                  {line}
                </div>
              ))}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleCopy(scriptData.hook + "\n\n" + scriptData.body.join("\n"), 1)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs transition"
              >
                {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === 1 ? "Copied Script!" : "Copy Full Script"}</span>
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-neutral-400">Send to Masko:</span>
                <button
                  onClick={() => alert("Masko Avatar video render queued! Avatar preview loaded in co-host pane.")}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center space-x-1"
                >
                  <span>Generate Avatar Draft</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
