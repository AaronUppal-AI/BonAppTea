"use client";

import React, { useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { TrackType } from "@/types";

interface JudgeDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTrack: (track: TrackType) => void;
}

const STEPS: { time: string; track: TrackType; title: string; say: string; show: string }[] = [
  {
    time: "0:00 – 0:40",
    track: "knowledge-graph",
    title: "Knowledge Graph: Kochi's real neighborhood, live",
    say: "This is Kochi, a one-Michelin-star Korean restaurant in Hell's Kitchen. Its menu comes from its website; rivals, their Google reviews and the creators who posted from Kochi were pulled live through Treg into Neo4j.",
    show: "Click a warm lead to light up creator → post → Kochi, then Danji's portion complaint → theme → Kochi's eight-course tasting.",
  },
  {
    time: "0:40 – 1:20",
    track: "trend-radar",
    title: "Trend Radar: catch it before it peaks",
    say: "Black sesame desserts are rising, and Kochi already stocks everything for them; its Black Sesame course is the vehicle. No new inventory needed.",
    show: "Click Black Sesame Desserts: pantry match, no tracked rival on it, then the You.com web proof (stored in the graph).",
  },
  {
    time: "1:20 – 2:00",
    track: "dish-to-post",
    title: "Dish-to-Post: a shot list the chef can film in 10 seconds",
    say: "Chefs aren't videographers. BonAppTea pairs the Tuna Bibimbap with the tableside-mix trend and hands over three clips, a caption, hashtags and audio.",
    show: "Show the shot list, copy the caption, then the You.com filming references.",
  },
  {
    time: "2:00 – 3:00",
    track: "chef-pepper",
    title: "Chef Pepper + Creator Scout: grounded answers",
    say: "Real posters are messy: lots of tiny accounts, mega-accounts and restaurants posing as creators. The graph keeps nano and micro creators (2k–30k) who mostly post in NYC, and flags warm leads who just ate at Kochi.",
    show: "Ask Chef Pepper about rivals and creators, open the Neo4j query behind an answer, then draft a thank-you invite in Creator Scout.",
  },
];

export const JudgeDemoModal: React.FC<JudgeDemoModalProps> = ({ isOpen, onClose, onNavigateTrack }) => {
  const [step, setStep] = useState(0);
  if (!isOpen) return null;
  const s = STEPS[step];

  const go = (i: number) => {
    setStep(i);
    onNavigateTrack(STEPS[i].track);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
          <span className="text-sm font-bold text-white">
            3-minute demo · step {step + 1} of {STEPS.length}
          </span>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="text-[11px] font-mono text-amber-400">{s.time}</div>
          <h3 className="text-base font-bold text-white">{s.title}</h3>
          <div className="text-xs text-neutral-300 leading-relaxed">
            <span className="text-neutral-500 uppercase text-[10px] block mb-0.5">Say</span>
            {s.say}
          </div>
          <div className="text-xs text-neutral-300 leading-relaxed">
            <span className="text-neutral-500 uppercase text-[10px] block mb-0.5">Show</span>
            {s.show}
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-800">
          <button
            onClick={() => go(step - 1)}
            disabled={step === 0}
            className="text-xs text-neutral-300 disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </button>
          <button onClick={() => onNavigateTrack(s.track)} className="text-xs text-amber-300 hover:text-amber-200">
            Open this tab
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => go(step + 1)}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold">
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
