"use client";

import React, { useEffect, useState } from "react";

const SEEN_KEY = "bonapptea:intro-seen";

/**
 * Netflix-style launch intro: the chrome wordmark resolves out of the dark, a phosphor scan
 * line sweeps across, then it fades into the app. Plays once per browser session; click or any key
 * skips it; skipped entirely for prefers-reduced-motion.
 */
export const IntroSplash: React.FC = () => {
  const [phase, setPhase] = useState<"hidden" | "play" | "out">("hidden");

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
      window.sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      // Storage blocked: play it, it's short
    }
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPhase("play");
    const out = setTimeout(() => setPhase("out"), 2100);
    const done = setTimeout(() => setPhase("hidden"), 2700);
    return () => {
      clearTimeout(out);
      clearTimeout(done);
    };
  }, []);

  useEffect(() => {
    if (phase !== "play") return;
    const skip = () => setPhase("out");
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [phase]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("hidden"), 600);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#04070c] transition-opacity duration-500 ${
        phase === "out" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      onClick={() => setPhase("out")}
      role="presentation"
    >
      <style>{`
        @keyframes intro-resolve {
          0% { opacity: 0; transform: scale(0.86); filter: blur(14px); letter-spacing: 0.6em; }
          55% { opacity: 1; filter: blur(0); }
          100% { opacity: 1; transform: scale(1.04); letter-spacing: 0.18em; }
        }
        @keyframes intro-sweep {
          0% { transform: translateX(-60vw); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateX(60vw); opacity: 0; }
        }
        @keyframes intro-tag { 0%, 50% { opacity: 0; } 100% { opacity: 1; } }
      `}</style>
      <div className="relative flex flex-col items-center">
        <span className="text-4xl mb-3" aria-hidden="true" style={{ animation: "intro-tag 1.2s ease-out both" }}>
          🍵
        </span>
        <h1
          className="font-display chrome-text text-4xl sm:text-7xl"
          style={{ animation: "intro-resolve 1.8s cubic-bezier(.2,.7,.1,1) both", textShadow: "0 0 40px rgba(124,255,196,0.25)" }}
        >
          BONAPPTEA
        </h1>
        <div
          className="absolute top-1/2 h-px w-[40vw] bg-gradient-to-r from-transparent via-emerald-300 to-transparent"
          style={{ animation: "intro-sweep 1.4s 0.5s ease-in-out both", boxShadow: "0 0 18px rgba(124,255,196,0.9)" }}
          aria-hidden="true"
        />
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.4em] phosphor" style={{ animation: "intro-tag 1.6s ease-out both" }}>
          Wake up, chef
        </p>
      </div>
    </div>
  );
};
