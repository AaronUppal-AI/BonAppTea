"use client";

import React, { useState } from "react";
import { Play, CheckCircle2, ArrowRight, Sparkles, Radio, Cpu, Search, X } from "lucide-react";
import { TrackType } from "@/types";

interface JudgeDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTrack: (track: TrackType) => void;
}

export const JudgeDemoModal: React.FC<JudgeDemoModalProps> = ({
  isOpen,
  onClose,
  onNavigateTrack,
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const demoSteps = [
    {
      title: "1. The Hook & The Creator Dilemma",
      time: "0:00 - 0:45",
      icon: Sparkles,
      track: "idea-to-post" as TrackType,
      summary: "Generic AI tools are amnesiacs trapped in static data. When a creator gets a viral tip or breaking rumor, existing tools hallucinate or repeat outdated tweets.",
      actionPrompt: "Show Track 1: Creator inputs a raw hypothesis about local reasoning models.",
      highlight: "Notice how You.com context is injected in real time (within 12 hours of GitHub release).",
    },
    {
      title: "2. The Trend Radar & Content Gap",
      time: "0:45 - 1:30",
      icon: Radio,
      track: "trend-radar" as TrackType,
      summary: "BonAppTea scans Reddit, X, and search velocity via Treg. Rather than just reporting a keyword, it detects the exact 'Content Gap'—what competitor YouTube videos missed.",
      actionPrompt: "Show Track 2: Local reasoning models spike +410%, exposing unanswered questions about 16GB Mac RAM limits.",
      highlight: "Neo4j Graph connects the accelerating topic directly to primary arXiv papers.",
    },
    {
      title: "3. Research Desk & Rumor Debunking",
      time: "1:30 - 2:15",
      icon: Search,
      track: "research-desk" as TrackType,
      summary: "Creator tests a viral rumor: 'OpenAI bought a German robotics startup for $1.2B'. In sub-second time, You.com crawls primary SEC records and Reuters denials.",
      actionPrompt: "Show Track 4: The claim node flashes RED on the Graph, saving the creator from brand cancellation.",
      highlight: "Masko Mascot speaks up to alert the creator and suggests a pivot.",
    },
    {
      title: "4. Creator Business & Zero-Markup Leads",
      time: "2:15 - 3:00",
      icon: Cpu,
      track: "creator-business" as TrackType,
      summary: "BonAppTea identifies which brands are actively sponsoring content in this niche (Neon, Together AI, Supabase) and enriches the decision-maker via Treg for $0.038.",
      actionPrompt: "Show Track 3: 1-click tailored pitch + live interactive media kit (plate.bio/@aaron) powered by Masko.",
      highlight: "83.7% Software Gross Margins thanks to You.com speed and Treg pay-per-call gateway.",
    },
  ];

  const step = demoSteps[currentStep];
  const StepIcon = step.icon;

  const handleNext = () => {
    if (currentStep < demoSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      onNavigateTrack(demoSteps[nextStep].track);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      onNavigateTrack(demoSteps[prevStep].track);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-6 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Play className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">3-Minute Hackathon Judge Walkthrough</h3>
              <span className="text-[10px] text-amber-400 font-mono">
                Step {currentStep + 1} of 4 • {step.time}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2">
          {demoSteps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentStep(idx);
                onNavigateTrack(s.track);
              }}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep
                  ? "bg-amber-400"
                  : idx < currentStep
                  ? "bg-amber-500/40"
                  : "bg-neutral-800"
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <StepIcon className="w-4 h-4 text-amber-400" />
            <span>{step.title}</span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">{step.summary}</p>

          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 space-y-1">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block">
              Presenter Action & Demonstration:
            </span>
            <p className="text-xs text-neutral-200 font-medium">{step.actionPrompt}</p>
          </div>

          <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-300">
            💡 <strong>Judge Note:</strong> {step.highlight}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 hover:text-white transition disabled:opacity-30"
          >
            Previous
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onNavigateTrack(step.track);
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 hover:text-white transition"
            >
              Jump to Track
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center space-x-1.5 shadow-md shadow-amber-500/20"
            >
              <span>{currentStep === demoSteps.length - 1 ? "Finish Demo" : "Next Step"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
