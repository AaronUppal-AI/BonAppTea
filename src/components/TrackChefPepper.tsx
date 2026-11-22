"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChefHat, Send, Volume2, VolumeX } from "lucide-react";
import type { GraphQueryTrace } from "@/types";
import { TrackHeader } from "./ui";

type Mood = "idle" | "speaking" | "thinking" | "alert" | "excited";

interface Message {
  role: "user" | "chef";
  text: string;
  mood?: Mood;
  queries?: GraphQueryTrace[] | null;
}

const SUGGESTIONS = [
  { emoji: "🎬", text: "How do I fill slow Tuesday nights?" },
  { emoji: "📈", text: "What trend should I add to the menu?" },
  { emoji: "🤝", text: "Which creators should I invite?" },
  { emoji: "🕵️", text: "What are my competitors getting roasted for?" },
  { emoji: "📱", text: "What should I film today?" },
];

const moodRing: Record<Mood, string> = {
  idle: "ring-neutral-700",
  speaking: "ring-indigo-500",
  thinking: "ring-neutral-400 animate-pulse",
  alert: "ring-rose-500",
  excited: "ring-amber-400",
};

const Trace: React.FC<{ queries: GraphQueryTrace[] }> = ({ queries }) => {
  const [open, setOpen] = useState(false);
  const rows = queries.reduce((n, q) => n + q.rows.length, 0);
  return (
    <div className="mt-2 text-[10px] font-mono">
      <button onClick={() => setOpen((v) => !v)} className="text-emerald-400 hover:text-emerald-300">
        ● From Neo4j: {rows} rows, {queries.length} quer{queries.length === 1 ? "y" : "ies"} {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-1 max-h-56 overflow-auto rounded-lg bg-black/60 border border-neutral-800 p-2 space-y-2">
          {queries.map((q, i) => (
            <div key={i}>
              <div className="text-neutral-500">// {q.name}</div>
              <pre className="whitespace-pre-wrap text-indigo-300">{q.cypher}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const TrackChefPepper: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "chef",
      mood: "speaking",
      text: "Ciao! I'm Chef Pepper, your co-host. Everything I tell you comes straight from your restaurant's knowledge graph: trends, your menu, local creators and what the rivals are up to. What are we cooking up?",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [voice, setVoice] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const mood: Mood = thinking ? "thinking" : messages[messages.length - 1]?.mood ?? "idle";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, thinking]);

  const speak = (text: string) => {
    if (!voice || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 1.05;
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  };

  const ask = async (text: string) => {
    const message = text.trim();
    if (!message || thinking) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    setThinking(true);
    try {
      const res = await fetch("/api/masko/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "chef", text: data.speech, mood: data.mood, queries: data.graph?.queries ?? null }]);
      speak(data.speech);
    } catch {
      setMessages((m) => [...m, { role: "chef", text: "I couldn't reach the kitchen. Try me again in a second.", mood: "alert" }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="space-y-5">
      <TrackHeader
        icon={<ChefHat className="w-5 h-5 text-rose-400" />}
        title="Chef Pepper: Your Co-Host"
        subtitle="Ask in plain words. Every answer is a live Cypher query over your restaurant graph, and you can open the query."
        right={
          <button
            onClick={() => {
              setVoice((v) => !v);
              if (voice && typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
            }}
            className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
              voice ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300" : "bg-neutral-900 border-neutral-800 text-neutral-400"
            }`}
          >
            {voice ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />} Voice {voice ? "on" : "off"}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chef portrait */}
        <div className="lg:col-span-4 flex flex-col items-center text-center gap-3">
          <div className={`relative w-48 h-48 sm:w-56 sm:h-56 rounded-3xl overflow-hidden ring-4 ${moodRing[mood]} transition shadow-2xl`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/masko/chef-pepper.png" alt="Chef Pepper" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-base font-bold text-white">Chef Pepper</div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">{mood}</div>
          </div>
          <p className="text-[11px] text-neutral-500 max-w-xs">
            A Masko mascot backed by Neo4j GraphRAG. He knows the menu, the pantry, trend velocity, every vetted creator (including
            ones found live through Treg) and this week&apos;s rival complaints.
          </p>
        </div>

        {/* Conversation */}
        <div className="lg:col-span-8 flex flex-col rounded-xl border border-neutral-800 bg-neutral-950/60 min-h-[420px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[460px]">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-rose-600/80 px-3.5 py-2 text-sm text-white">{m.text}</div>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/masko/chef-pepper.png" alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-neutral-900 border border-neutral-800 px-3.5 py-2.5">
                    <p className="text-sm text-neutral-100 leading-relaxed">{m.text}</p>
                    {m.queries && m.queries.length > 0 && <Trace queries={m.queries} />}
                  </div>
                </div>
              )
            )}
            {thinking && (
              <div className="flex gap-2.5 items-center text-xs text-neutral-500">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/masko/chef-pepper.png" alt="" className="w-8 h-8 rounded-full object-cover" />
                <span className="animate-pulse">Chef Pepper is checking the graph…</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-neutral-800 p-3 space-y-2.5">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.text}
                  onClick={() => ask(s.text)}
                  disabled={thinking}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-rose-500/50 hover:text-white disabled:opacity-50"
                >
                  {s.emoji} {s.text}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask(input)}
                maxLength={300}
                placeholder="Ask Chef Pepper anything about your restaurant…"
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />
              <button
                onClick={() => ask(input)}
                disabled={thinking || !input.trim()}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
