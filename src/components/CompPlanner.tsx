"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Copy, Check, CalendarPlus, Ban, RotateCcw, AlertTriangle } from "lucide-react";
import type { RestaurantProfile, VettedCreator, CompRecord } from "@/types";
import { ErrorNote, getJson } from "./ui";
import { ScoreBars, ScoreBadge, VerdictChip } from "./scorecard";

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (d: Date) => d.toISOString().slice(0, 10);
const dayOf = (s: string) => new Date(`${s}T12:00:00Z`).getUTCDay();
const kindOf = (s: string) => (dayOf(s) === 2 || dayOf(s) === 3 ? "midweek" : dayOf(s) === 1 ? "other" : "peak");
const weekStart = (s: string) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
};
const compCode = (handle: string) => `COMP-CREATOR-${handle.replace(/^@/, "").toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
const MIDWEEK_MAX = 3;
const PEAK_MAX = 2;

function inviteText(c: VettedCreator, r: RestaurantProfile, dish: string | null, when: string, code: string) {
  const name = c.handle.replace(/^@/, "");
  const intro = c.alreadyPostedAboutUs
    ? `Hey ${name}! This is the team at ${r.name}. We saw your post from your dinner with us and loved it, thank you.`
    : `Hey ${name}! We're ${r.name}, ${/^[aeiou]/i.test(r.cuisine) ? "an" : "a"} ${r.cuisine} restaurant in ${r.neighborhood}${r.award ? ` (${r.award})` : ""}. Your food posts around ${r.city} caught our eye.`;
  return `${intro} We'd love to host you and a guest for a comped tasting${dish ? ` featuring our ${dish}` : ""} on ${when}. No posting required; if you love it and share it, please tag it #gifted, and if your followers book, ask them to mention ${code}. Which time works?`;
}

export const CompPlanner: React.FC<{
  creator: VettedCreator;
  restaurant: RestaurantProfile;
  featuredDish: string | null;
  onChanged: () => void;
}> = ({ creator, restaurant, featuredDish, onChanged }) => {
  const days = useMemo(() => {
    const out: string[] = [];
    const d = new Date();
    for (let i = 1; i <= 14; i++) {
      const x = new Date(d);
      x.setDate(d.getDate() + i);
      out.push(iso(x));
    }
    return out;
  }, []);
  const [date, setDate] = useState(() => days.find((d) => kindOf(d) === "midweek") ?? days[0]);
  const [covers, setCovers] = useState(2);
  const [value, setValue] = useState(2 * (restaurant.tastingPrice ?? 145));
  const [comps, setComps] = useState<CompRecord[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "cadence" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"invite" | "dm" | null>(null);
  const [dm, setDm] = useState<string | null>(null);

  const loadComps = () => getJson<{ comps: CompRecord[] }>("/api/comps").then((d) => setComps(d.comps)).catch(() => setComps([]));
  useEffect(() => {
    loadComps();
  }, []);
  useEffect(() => {
    setMsg(null);
    setDm(null);
  }, [creator.handle]);

  const code = compCode(creator.handle);
  const ws = weekStart(date);
  const weekComps = comps.filter((c) => weekStart(c.date) === ws);
  const midUsed = weekComps.filter((c) => kindOf(c.date) === "midweek").length;
  const peakUsed = weekComps.filter((c) => kindOf(c.date) === "peak").length;
  const when = `${new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}`;
  const invite = inviteText(creator, restaurant, featuredDish, when, code);
  const discontinued = creator.status === "discontinued";

  const copy = (text: string, which: "invite" | "dm") => {
    navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  const plan = async (override = false) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await getJson<{ comp?: CompRecord; cadence?: string }>("/api/comps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: creator.handle, date, covers, valueUsd: value, status: "planned", override }),
      });
      if (res.cadence) setMsg({ kind: "cadence", text: res.cadence });
      else {
        setMsg({ kind: "ok", text: `Planned ${res.comp?.code} for ${when}. Track bookings in the Comp Ledger.` });
        loadComps();
        onChanged();
      }
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (action: "discontinue" | "reinstate") => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await getJson<{ offRampDm: string | null }>("/api/creators/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: creator.handle, action, reason: action === "discontinue" ? "Owner decision" : "" }),
      });
      setDm(res.offRampDm);
      onChanged();
    } catch (e: any) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4 lg:sticky lg:top-24">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white">{creator.handle}</h3>
        <div className="flex items-center gap-2">
          <VerdictChip verdict={creator.scorecard.verdict} />
          <ScoreBadge s={creator.scorecard} />
        </div>
      </div>
      <ScoreBars s={creator.scorecard} />
      {creator.scorecard.returnRatio !== null && (
        <p className="font-mono text-[10px] text-neutral-400">
          {creator.scorecard.compsCompleted} completed comp{creator.scorecard.compsCompleted === 1 ? "" : "s"} · return{" "}
          {creator.scorecard.returnRatio}× · first booking {creator.scorecard.ttvDays === null ? "none yet" : `in ${creator.scorecard.ttvDays} days`}
          {creator.scorecard.leaks > 0 && <span className="text-rose-300"> · {creator.scorecard.leaks} leak{creator.scorecard.leaks === 1 ? "" : "s"}</span>}
        </p>
      )}

      {discontinued ? (
        <div className="space-y-2">
          <p className="text-xs text-neutral-300">Discontinued{creator.discontinuedAt ? ` on ${creator.discontinuedAt}` : ""}. No new comps until reinstated.</p>
          <button onClick={() => setStatus("reinstate")} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg border border-neutral-600 text-neutral-200 hover:bg-white/5 flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reinstate
          </button>
        </div>
      ) : (
        <>
          <div>
            <div className="text-[11px] text-neutral-400 mb-1.5 flex items-center justify-between">
              <span>Pick a night (next 2 weeks)</span>
              <span className="font-mono text-[10px]">
                week of {ws}: Tue/Wed {midUsed}/{MIDWEEK_MAX} · Thu–Sun {peakUsed}/{PEAK_MAX}
              </span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => {
                const k = kindOf(d);
                const active = d === date;
                return (
                  <button
                    key={d}
                    onClick={() => setDate(d)}
                    title={k === "midweek" ? "Discovery night (Tue/Wed): 2–3 creators a week" : k === "peak" ? "Peak night (Thu–Sun): 1–2 creators a week in total" : "Monday"}
                    className={`rounded-md py-1 text-center text-[10px] border transition ${
                      active ? "border-white bg-white/10 text-white" : k === "midweek" ? "border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10" : k === "peak" ? "border-rose-500/25 text-rose-200/80 hover:bg-rose-500/10" : "border-neutral-700 text-neutral-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="font-mono">{DAY[dayOf(d)]}</div>
                    <div className="font-semibold">{Number(d.slice(8))}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[10px] text-neutral-500">Green: Tue/Wed discovery nights (2–3 creators). Pink: Thu–Sun, protected (1–2 total).</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-neutral-400">
              Covers
              <input type="number" min={1} max={20} value={covers} onChange={(e) => { const n = Number(e.target.value); setCovers(n); setValue(n * (restaurant.tastingPrice ?? 145)); }} className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white" />
            </label>
            <label className="text-[11px] text-neutral-400">
              Comp value ($)
              <input type="number" min={1} max={5000} value={value} onChange={(e) => setValue(Number(e.target.value))} className="mt-1 w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-1.5 text-xs text-white" />
            </label>
          </div>
          <p className="font-mono text-[10px] text-neutral-400">
            Attribution code <span className="text-emerald-300">{code}</span> · direct cost ≈ ${Math.round(value * 0.3)} (30%)
          </p>

          <p className="text-xs text-neutral-200 leading-relaxed p-3 rounded-lg bg-neutral-950/60 border border-neutral-800">{invite}</p>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => plan(false)} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg bg-emerald-400 text-black font-semibold hover:bg-emerald-300 disabled:opacity-50 flex items-center gap-1.5">
              <CalendarPlus className="w-3.5 h-3.5" /> Plan this comp
            </button>
            <button onClick={() => copy(invite, "invite")} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center gap-1.5">
              {copied === "invite" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === "invite" ? "Copied" : "Copy invite"}
            </button>
            <button onClick={() => setStatus("discontinue")} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-200 hover:bg-rose-500/10 flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5" /> Discontinue
            </button>
          </div>
        </>
      )}

      {msg?.kind === "cadence" && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/20 text-xs text-amber-200 space-y-2" role="alert">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {msg.text}
          </div>
          <button onClick={() => plan(true)} disabled={busy} className="px-2.5 py-1 rounded-md border border-amber-400/50 hover:bg-amber-500/10">
            Override with GM sign-off
          </button>
        </div>
      )}
      {msg?.kind === "ok" && <p className="text-xs text-emerald-300">{msg.text}</p>}
      {msg?.kind === "error" && <ErrorNote message={msg.text} onRetry={() => setMsg(null)} />}

      {dm && (
        <div className="space-y-2 animate-fade-up">
          <div className="text-[11px] text-neutral-400">Soft Off-Ramp message (review, then send it yourself)</div>
          <p className="text-xs text-neutral-200 leading-relaxed p-3 rounded-lg bg-neutral-950/60 border border-neutral-800">{dm}</p>
          <button onClick={() => copy(dm, "dm")} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 flex items-center gap-1.5">
            {copied === "dm" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === "dm" ? "Copied" : "Copy message"}
          </button>
        </div>
      )}
    </div>
  );
};
