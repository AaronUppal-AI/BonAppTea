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
    time: "0:00 – 0:45",
    track: "trend-radar",
    title: "Trend Radar: catch it before it peaks",
    say: "Osteria Pepe already stocks mascarpone, espresso and ladyfingers. The graph says Tableside Tiramisu is accelerating, so they can add it this weekend with zero new inventory.",
    show: "Click Tableside Tiramisu. Point at the pantry match, then the You.com web-proof links showing the trend is real and current.",
  },
  {
    time: "0:45 – 1:30",
    track: "dish-to-post",
    title: "Dish-to-Post: a shot list the chef can film in 10 seconds",
    say: "Chefs are not videographers. BonAppTea pairs the dish with the trend's hook and hands them three clips, a caption, hashtags and the audio to use.",
    show: "Show the Tiramisu shot list, copy the caption, then scroll to the You.com filming references.",
  },
  {
    time: "1:30 – 2:15",
    track: "creator-scout",
    title: "Creator Scout: stop comping freeloaders",
    say: "Six creators, three worth a table. The graph drops the 240k account with 11% local reach and the one who promoted a rival 20 days ago.",
    show: "Point at the filtered-out reasons, then copy the VIP invite for the slow Tuesday dinner.",
  },
  {
    time: "2:15 – 3:00",
    track: "intel-desk",
    title: "Intel Desk + Chef Pepper: exploit rival weak spots",
    say: "Lucky Slice is getting roasted for wait times; we have walk-in tables at 5 PM. And before posting 'San Marzano DOP', we check it against live sources.",
    show: "Run a fact-check example, then ask Chef Pepper how to fill slow Tuesday nights and expand the Neo4j query behind his answer.",
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
