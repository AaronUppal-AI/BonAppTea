"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle2, XCircle } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Status {
  neo4j: { connected: boolean; detail?: string };
  youCom: { configured: boolean };
  masko: { configured: boolean };
  treg: { configured: boolean };
}

/** Read-only view of which services the server is connected to. Keys stay server-side. */
export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStatus(null);
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [isOpen]);

  if (!isOpen) return null;

  const rows = status
    ? [
        { name: "You.com Search", ok: status.youCom.configured, env: "YOU_API_KEY", use: "Trend proof, city buzz, filming references, fact checks" },
        { name: "Neo4j AuraDB", ok: status.neo4j.connected, env: "NEO4J_URI / NEO4J_PASSWORD", use: "The restaurant graph behind every tab and Chef Pepper" },
        { name: "Masko", ok: status.masko.configured, env: "MASKO_API_KEY", use: "Chef Pepper's character and animations" },
        { name: "Treg", ok: status.treg.configured, env: "TREG_API_KEY", use: "Live creator discovery from Instagram (Creator Scout)" },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
          <span className="text-sm font-bold text-white">Connections</span>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {!status && <div className="text-xs text-neutral-500 animate-pulse">Checking…</div>}
          {rows.map((r) => (
            <div key={r.name} className="flex items-start gap-2.5">
              {r.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 mt-0.5" />
              )}
              <div>
                <div className="text-xs font-semibold text-white">
                  {r.name} <span className="font-mono text-[10px] text-neutral-500">{r.env}</span>
                </div>
                <div className="text-[11px] text-neutral-400">{r.use}</div>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-neutral-500 pt-2 border-t border-neutral-800">
            Keys live in server environment variables (.env.local locally, Vercel project settings in production). They never
            reach the browser.
          </p>
        </div>
      </div>
    </div>
  );
};
