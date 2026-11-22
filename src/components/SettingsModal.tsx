"use client";

import React, { useState } from "react";
import { Key, X, Shield, ExternalLink, Check } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [youApiKey, setYouApiKey] = useState("");
  const [tregApiKey, setTregApiKey] = useState("");
  const [neo4jUri, setNeo4jUri] = useState("");
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("plateos_you_key", youApiKey);
      localStorage.setItem("plateos_treg_key", tregApiKey);
      localStorage.setItem("plateos_neo4j_uri", neo4jUri);
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">API Keys & Live Environment</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400">
          BonAppTea includes built-in high-fidelity grounding simulations for hackathon presentation. Add live keys to route directly to third-party endpoints.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-neutral-300 font-medium">You.com API Key:</span>
              <a
                href="https://you.com/platform"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-indigo-400 hover:underline flex items-center space-x-0.5"
              >
                <span>Get Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <input
              type="password"
              value={youApiKey}
              onChange={(e) => setYouApiKey(e.target.value)}
              placeholder="ydc_api_..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-neutral-300 font-medium">Treg Tool Gateway Key:</span>
              <a
                href="https://treg.to"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-sky-400 hover:underline flex items-center space-x-0.5"
              >
                <span>treg.to</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <input
              type="password"
              value={tregApiKey}
              onChange={(e) => setTregApiKey(e.target.value)}
              placeholder="treg_live_..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-neutral-300 font-medium">Neo4j AuraDB Connection URI:</span>
              <span className="text-[10px] text-neutral-500">Optional</span>
            </div>
            <input
              type="text"
              value={neo4jUri}
              onChange={(e) => setNeo4jUri(e.target.value)}
              placeholder="neo4j+s://xxxx.databases.neo4j.io"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
          <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
            <Shield className="w-3 h-3" />
            <span>Keys stored locally in browser session</span>
          </span>

          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1"
          >
            {saved ? <Check className="w-3 h-3 text-emerald-400" /> : null}
            <span>{saved ? "Saved!" : "Save Keys"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
