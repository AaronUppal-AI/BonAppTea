"use client";

import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Sparkles, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";
import { MaskoAgentState, GraphQueryTrace } from "@/types";

interface MaskoWidgetProps {
  initialPrompt?: string;
  creatorName?: string;
  onActionTrigger?: (action: string) => void;
}

export const MaskoAvatarWidget: React.FC<MaskoWidgetProps> = ({
  initialPrompt,
  creatorName = "Aaron",
  onActionTrigger,
}) => {
  const [mascotState, setMascotState] = useState<MaskoAgentState>({
    avatarId: "9321515e-95e2-4367-8f09-185e05c6988c",
    mascotName: "Chef Pepper",
    imageUrl: "/masko/chef-pepper.png",
    mood: "idle",
    currentSpeech: "Ciao! I'm Chef Pepper. Every answer I give comes straight from your restaurant's knowledge graph. Ask me what to film, who to invite, or how to fill a slow Tuesday.",
    isVoiceActive: false,
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [graphTrace, setGraphTrace] = useState<GraphQueryTrace[] | null>(null);
  const [showCypher, setShowCypher] = useState(false);

  // Web Speech API Voice synthesis helper
  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window && mascotState.isVoiceActive) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.1;
      utterance.rate = 1.05;
      utterance.onstart = () => setMascotState((prev) => ({ ...prev, mood: "speaking" }));
      utterance.onend = () => setMascotState((prev) => ({ ...prev, mood: "idle" }));
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (msgText: string) => {
    const textToSend = msgText || inputMessage;
    if (!textToSend.trim()) return;

    setIsThinking(true);
    setMascotState((prev) => ({ ...prev, mood: "thinking" }));

    try {
      const res = await fetch("/api/masko/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });
      const data = await res.json();

      setMascotState((prev) => ({
        ...prev,
        currentSpeech: data.speech,
        mood: data.mood || "speaking",
      }));
      setGraphTrace(data.graph?.queries ?? null);

      if (mascotState.isVoiceActive) {
        speakText(data.speech);
      }
    } catch (e) {
      setMascotState((prev) => ({
        ...prev,
        currentSpeech: "I couldn't reach the kitchen. Try me again in a second.",
        mood: "alert",
      }));
      setGraphTrace(null);
    } finally {
      setIsThinking(false);
      setInputMessage("");
    }
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 shadow-xl flex flex-col justify-between h-full">
      {/* Widget Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide">
            MASKO CO-HOST: {mascotState.mascotName.toUpperCase()}
          </span>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
            v2.4
          </span>
        </div>

        <button
          onClick={() => {
            const nextActive = !mascotState.isVoiceActive;
            setMascotState((prev) => ({ ...prev, isVoiceActive: nextActive }));
            if (nextActive) speakText(mascotState.currentSpeech);
            else if (typeof window !== "undefined" && "speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
          }}
          className={`p-1.5 rounded-lg border transition text-xs flex items-center space-x-1 ${
            mascotState.isVoiceActive
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
          }`}
          title="Toggle Mascot Voice Synthesis"
        >
          {mascotState.isVoiceActive ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span className="text-[10px] font-mono">{mascotState.isVoiceActive ? "Voice ON" : "Voice OFF"}</span>
        </button>
      </div>

      {/* Mascot Viewport & Animation Canvas */}
      <div className="py-4 flex flex-col items-center">
        <div className="relative group">
          {/* Animated Glow Halo */}
          <div
            className={`absolute -inset-1.5 rounded-full blur-md opacity-70 transition duration-500 ${
              mascotState.mood === "alert"
                ? "bg-rose-500 animate-pulse"
                : mascotState.mood === "speaking"
                ? "bg-indigo-500 animate-pulse"
                : mascotState.mood === "excited"
                ? "bg-amber-400 animate-pulse"
                : "bg-neutral-700"
            }`}
          />

          {/* Masko Avatar Face */}
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-neutral-700 shadow-inner bg-neutral-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mascotState.imageUrl}
              alt={mascotState.mascotName}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${
                mascotState.mood === "thinking" ? "animate-pulse" : ""
              }`}
            />
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neutral-300 bg-neutral-900 border border-neutral-700 px-1.5 rounded uppercase tracking-widest">
            {mascotState.mood}
          </span>
        </div>

        {/* Mascot Dynamic Speech Bubble */}
        <div className="mt-4 relative bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 max-w-sm text-center shadow-lg">
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-neutral-900 border-t border-l border-neutral-800 rotate-45" />
          <p className="text-xs text-neutral-200 leading-relaxed font-medium">
            "{mascotState.currentSpeech}"
          </p>
        </div>

        {/* GraphRAG provenance: the Cypher and rows behind the answer */}
        {graphTrace && (
          <div className="mt-2 w-full max-w-sm text-[10px] font-mono">
            <button
              onClick={() => setShowCypher((v) => !v)}
              className="text-emerald-400 hover:text-emerald-300"
            >
              ● Grounded in Neo4j: {graphTrace.reduce((n, q) => n + q.rows.length, 0)} rows from{" "}
              {graphTrace.length} quer{graphTrace.length === 1 ? "y" : "ies"} {showCypher ? "▲" : "▼"}
            </button>
            {showCypher && (
              <div className="mt-1 max-h-32 overflow-auto rounded-lg bg-black/60 border border-neutral-800 p-2 space-y-2">
                {graphTrace.map((q, i) => (
                  <div key={i}>
                    <div className="text-neutral-500">// {q.name}</div>
                    <pre className="whitespace-pre-wrap text-indigo-300">{q.cypher}</pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Interactive Triggers */}
      <div className="space-y-2 pt-2 border-t border-neutral-800/80">
        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
          ⚡ Quick Mascot Triggers:
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { emoji: "📈", label: "Menu Trend Gaps", prompt: "What trend should I add to the menu?" },
            { emoji: "🤝", label: "Vet Local Creators", prompt: "Which creators should I invite?" },
            { emoji: "🕵️", label: "Rival Weak Spots", prompt: "What are my competitors getting roasted for?" },
            { emoji: "🎬", label: "Fill Slow Tuesday", prompt: "How do I fill slow Tuesday nights?" },
          ].map((t) => (
            <button
              key={t.label}
              onClick={() => handleSendMessage(t.prompt)}
              disabled={isThinking}
              className="text-left text-[11px] p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition flex items-center space-x-1.5 hover:border-indigo-500/40 disabled:opacity-50"
            >
              <span>{t.emoji}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex space-x-1.5 mt-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputMessage)}
            placeholder="Ask Chef Pepper about trends, creators, rivals..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSendMessage(inputMessage)}
            disabled={isThinking}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
          >
            {isThinking ? "..." : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
};
