"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Info, ChevronLeft, ChevronRight, X, ExternalLink, Route, Clock } from "lucide-react";
import type {
  Insight, VettedCreator, BoardTrend, PostPlan, RivalComplaint, RestaurantProfile, TrackType, YouSearchResponse,
} from "@/types";
import { getJson } from "./ui";
import { useCutout } from "./useCutout";

/**
 * Netflix-style home: a rotating billboard of tonight's best opportunities, then carousels of
 * ready-made moves. Cards preview on hover, open a detail panel with "More like this", and the
 * header search filters every card. Recently opened cards come back in "Pick up where you left off".
 */

export interface Tile {
  id: string;
  kicker: string;
  title: string;
  blurb: string;
  meta: string[];
  tone: "mint" | "ice" | "lilac" | "pink" | "gold";
  glyph: string;
  track: TrackType;
  actionLabel: string;
  href?: string;
  hops?: number;
  row?: string;
}

const TONE: Record<Tile["tone"], { from: string; to: string; text: string; ring: string }> = {
  mint: { from: "rgba(124,255,196,0.35)", to: "rgba(6,10,17,0.2)", text: "text-emerald-300", ring: "hover:shadow-[0_0_44px_-6px_rgba(124,255,196,0.55)]" },
  ice: { from: "rgba(168,216,255,0.35)", to: "rgba(6,10,17,0.2)", text: "text-sky-300", ring: "hover:shadow-[0_0_44px_-6px_rgba(168,216,255,0.55)]" },
  lilac: { from: "rgba(201,184,255,0.38)", to: "rgba(6,10,17,0.2)", text: "text-purple-300", ring: "hover:shadow-[0_0_44px_-6px_rgba(201,184,255,0.55)]" },
  pink: { from: "rgba(255,159,196,0.35)", to: "rgba(6,10,17,0.2)", text: "text-rose-300", ring: "hover:shadow-[0_0_44px_-6px_rgba(255,159,196,0.55)]" },
  gold: { from: "rgba(255,216,107,0.32)", to: "rgba(6,10,17,0.2)", text: "text-amber-300", ring: "hover:shadow-[0_0_44px_-6px_rgba(255,216,107,0.5)]" },
};

const KIND_TILE: Record<Insight["kind"], { kicker: string; tone: Tile["tone"]; glyph: string; track: TrackType; action: string }> = {
  "warm-lead": { kicker: "Warm lead", tone: "mint", glyph: "♥", track: "creator-scout", action: "Draft the thank-you invite" },
  conquest: { kicker: "Conquest invite", tone: "ice", glyph: "⚔", track: "creator-scout", action: "Draft the invite" },
  "pantry-trend": { kicker: "Pantry-ready trend", tone: "gold", glyph: "✦", track: "trend-radar", action: "Open in Trend Radar" },
  "rival-gap": { kicker: "Rival weak spot", tone: "pink", glyph: "◎", track: "intel-desk", action: "Open in Intel Desk" },
  "open-trend": { kicker: "Open lane", tone: "lilac", glyph: "↗", track: "trend-radar", action: "Open in Trend Radar" },
  "cuisine-fit": { kicker: "Cuisine match", tone: "mint", glyph: "◈", track: "creator-scout", action: "Open in Creator Scout" },
};

interface HomeData {
  restaurant: RestaurantProfile | null;
  insights: Insight[];
  creators: VettedCreator[];
  trends: BoardTrend[];
  plans: PostPlan[];
  rivals: RivalComplaint[];
  web: YouSearchResponse["sources"];
}

interface RowDef {
  title: string;
  subtitle?: string;
  ranked?: boolean;
  tiles: Tile[];
}

const k = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function buildRows(d: HomeData): RowDef[] {
  const insights: Tile[] = d.insights.map((i) => {
    const t = KIND_TILE[i.kind];
    return {
      id: i.id, kicker: t.kicker, title: i.title.replace(/^(Warm lead|Conquest invite|Ready now|Open lane|Cuisine match):\s*/, ""),
      blurb: i.detail, meta: [`${i.hops} hops in the graph`], tone: t.tone, glyph: t.glyph, track: t.track, actionLabel: t.action, hops: i.hops,
    };
  });
  const warm: Tile[] = d.creators
    .filter((c) => c.alreadyPostedAboutUs)
    .map((c) => ({
      id: `c-${c.handle}`, kicker: c.passed ? "Passed vetting" : "Posted from you", title: c.handle,
      blurb: c.passed
        ? `${k(c.followers)} followers, ${c.localPct}% of tagged posts in NYC, ${c.engagement}% engagement. They already ate here.`
        : `They already posted from you. ${c.reasons[0] ?? ""}`.trim(),
      meta: [`${k(c.followers)} followers`, c.localPct !== null ? `${c.localPct}% local` : "local reach unknown"],
      tone: c.passed ? "mint" : "ice", glyph: "@", track: "creator-scout", actionLabel: "Draft the invite", href: c.profileUrl ?? undefined,
    }));
  const trends: Tile[] = d.trends
    .filter((t) => t.stage === "Emerging" || t.stage === "Accelerating")
    .map((t) => ({
      id: `t-${t.id}`, kicker: `${t.stage} · +${t.velocity}%`, title: t.name,
      blurb: t.missing.length ? `You'd need ${t.missing.join(", ")}.` : `Everything's already in your pantry: ${t.have.join(", ")}.`,
      meta: [t.missing.length ? `${t.missing.length} to buy` : "Pantry-ready", t.rivalsOnIt.length ? `${t.rivalsOnIt.join(", ")} on it` : "No rival on it"],
      tone: t.missing.length ? "lilac" : "gold", glyph: "✦", track: "trend-radar", actionLabel: "Open in Trend Radar",
    }));
  const shoots: Tile[] = d.plans
    .filter((p) => p.best)
    .map((p) => ({
      id: `p-${p.id}`, kicker: `${p.best!.hook} hook`, title: p.dish,
      blurb: `Film it as a ${p.best!.trend} moment: 1.5s macro of the ${p.best!.format}, 2s plating, first bite. Audio: ${p.best!.audio}.`,
      meta: [`+${p.best!.velocity}%`, p.best!.trend],
      tone: "pink", glyph: "▶", track: "dish-to-post", actionLabel: "Get the shot list",
    }));
  const rivals: Tile[] = d.rivals.map((r, i) => ({
    id: `r-${i}`, kicker: `${r.competitor} · ${r.rating ?? "?"}★`, title: `${r.theme[0].toUpperCase()}${r.theme.slice(1)} complaints`,
    blurb: `"${r.sample}"${r.ourAnswer ? ` Your answer: ${r.ourAnswer}.` : ""}`,
    meta: [`${r.mentions} of ${r.reviewsChecked} recent reviews`], tone: "pink", glyph: "◎", track: "intel-desk", actionLabel: "Open in Intel Desk",
    href: r.googleUrl ?? undefined,
  }));
  const web: Tile[] = d.web.map((s, i) => ({
    id: `w-${i}`, kicker: s.domain, title: s.title, blurb: s.snippet,
    meta: s.publishedAt ? [new Date(s.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })] : [],
    tone: "ice", glyph: "⌁", track: "trend-radar", actionLabel: "Open source", href: s.url,
  }));
  const rows: RowDef[] = [
    { title: "Top 10 moves tonight", subtitle: "Multi-hop opportunities from your knowledge graph", ranked: true, tiles: insights.slice(0, 10) },
    { title: "Warm leads", subtitle: "They already posted from your restaurant", tiles: warm },
    { title: "Ready-to-serve trends", subtitle: "Rising now, matched to your pantry", tiles: trends },
    { title: "Shoot this week", subtitle: "Dishes paired with a live trend", tiles: shoots },
    { title: "Rival weak spots", subtitle: "Real complaints from their recent Google reviews", tiles: rivals },
    { title: "Fresh from the web", subtitle: "Live from You.com", tiles: web },
  ];
  return rows
    .map((r) => ({ ...r, tiles: r.tiles.map((t) => ({ ...t, row: r.title })) }))
    .filter((r) => r.tiles.length > 0);
}

// ---------------------------------------------------------------------------
// "Pick up where you left off": recently opened cards, kept in this browser only
// ---------------------------------------------------------------------------

const RECENT_KEY = "bonapptea:recent";

function readRecent(): Tile[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function pushRecent(tile: Tile): Tile[] {
  const next = [tile, ...readRecent().filter((t) => t.id !== tile.id)].slice(0, 10);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage blocked: the row just won't persist
  }
  return next;
}

// ---------------------------------------------------------------------------

/** A card that previews on hover: it lifts, grows and reveals quick actions, like Netflix's preview cards. */
const Card: React.FC<{ tile: Tile; rank?: number; onOpen: (t: Tile) => void; onGo: (track: TrackType) => void; wide?: boolean }> = ({
  tile, rank, onOpen, onGo, wide,
}) => {
  const tone = TONE[tile.tone];
  return (
    <div className="relative shrink-0 snap-start flex items-end" style={{ width: rank ? 300 : wide ? 280 : 260 }}>
      {rank !== undefined && (
        <span className="rank-numeral text-[120px] leading-none -mr-6 select-none" aria-hidden="true">
          {rank}
        </span>
      )}
      <div
        className={`group/card relative w-[240px] h-[150px] rounded-xl glass overflow-hidden transition-all duration-300 ease-out hover:z-20 hover:scale-[1.12] hover:-translate-y-1 focus-within:z-20 focus-within:scale-[1.12] ${tone.ring}`}
      >
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 85% 0%, ${tone.from}, ${tone.to} 70%)` }} />
        <span className="absolute right-3 top-1 text-5xl opacity-30 group-hover/card:opacity-50 transition font-display" aria-hidden="true">
          {tile.glyph}
        </span>
        <button
          onClick={() => onOpen(tile)}
          className="absolute inset-0 text-left p-3 flex flex-col justify-end transition-transform duration-300 group-hover/card:-translate-y-9 group-focus-within/card:-translate-y-9"
          aria-label={`${tile.kicker}: ${tile.title}. More info`}
        >
          <span className={`font-mono text-[10px] uppercase tracking-widest ${tone.text}`}>{tile.kicker}</span>
          <span className="text-[13px] font-semibold text-white leading-snug line-clamp-2">{tile.title}</span>
        </button>
        {/* Preview strip: quick actions + meta, revealed on hover/focus */}
        <div className="absolute inset-x-0 bottom-0 px-3 py-2 flex items-center gap-1.5 bg-gradient-to-t from-neutral-950/95 to-neutral-950/40 translate-y-full group-hover/card:translate-y-0 group-focus-within/card:translate-y-0 transition-transform duration-300">
          {tile.actionLabel !== "Open source" && (
            <button
              onClick={() => onGo(tile.track)}
              className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:bg-neutral-200"
              aria-label={tile.actionLabel}
              title={tile.actionLabel}
            >
              <Play className="w-3.5 h-3.5 fill-black" />
            </button>
          )}
          <button
            onClick={() => onOpen(tile)}
            className="w-7 h-7 rounded-full border border-white/40 text-white flex items-center justify-center hover:border-white"
            aria-label="More info"
            title="More info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          {tile.href && (
            <a
              href={tile.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 rounded-full border border-white/40 text-white flex items-center justify-center hover:border-white"
              aria-label="Open link"
              title="Open link"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <span className="ml-1 font-mono text-[10px] text-neutral-300 truncate">{tile.meta.join(" · ")}</span>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<RowDef & { onOpen: (t: Tile) => void; onGo: (track: TrackType) => void; icon?: React.ReactNode }> = ({
  title, subtitle, ranked, tiles, onOpen, onGo, icon,
}) => {
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.85, behavior: "smooth" });
  return (
    <section className="group/row relative animate-fade-up" aria-label={title}>
      <div className="flex items-baseline gap-3 px-1 mb-1">
        <h2 className="font-display text-sm sm:text-base text-white tracking-wide flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {subtitle && <span className="font-mono text-[11px] text-neutral-400 hidden sm:inline">{subtitle}</span>}
      </div>
      <div className="relative">
        <button
          onClick={() => scrollBy(-1)}
          aria-label={`Scroll ${title} left`}
          className="absolute left-0 top-0 bottom-0 z-30 w-10 flex items-center justify-center bg-gradient-to-r from-neutral-950/90 to-transparent opacity-0 group-hover/row:opacity-100 focus:opacity-100 transition"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div ref={scroller} className="no-scrollbar flex gap-3 overflow-x-auto snap-x scroll-px-1 px-1 py-8 -my-5">
          {tiles.map((t, i) => (
            <Card key={t.id} tile={t} rank={ranked ? i + 1 : undefined} onOpen={onOpen} onGo={onGo} />
          ))}
        </div>
        <button
          onClick={() => scrollBy(1)}
          aria-label={`Scroll ${title} right`}
          className="absolute right-0 top-0 bottom-0 z-30 w-10 flex items-center justify-center bg-gradient-to-l from-neutral-950/90 to-transparent opacity-0 group-hover/row:opacity-100 focus:opacity-100 transition"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>
    </section>
  );
};

const DetailModal: React.FC<{
  tile: Tile;
  similar: Tile[];
  onClose: () => void;
  onGo: (track: TrackType) => void;
  onOpen: (t: Tile) => void;
}> = ({ tile, similar, onClose, onGo, onOpen }) => {
  const tone = TONE[tile.tone];
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, tile.id]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={tile.title}
    >
      <div key={tile.id} className="w-full max-w-2xl rounded-2xl overflow-hidden glass glass-iridescent animate-fade-up my-8" onClick={(e) => e.stopPropagation()}>
        <div className="relative h-48" style={{ background: `radial-gradient(120% 120% at 80% 0%, ${tone.from}, rgba(6,10,17,0.92) 75%)` }}>
          <span className="absolute right-8 top-2 text-9xl opacity-25 font-display" aria-hidden="true">
            {tile.glyph}
          </span>
          <button ref={closeRef} onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <div className={`font-mono text-[11px] uppercase tracking-widest ${tone.text}`}>{tile.kicker}</div>
            <h3 className="font-display chrome-text text-2xl leading-tight">{tile.title}</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {tile.actionLabel !== "Open source" && (
              <button onClick={() => onGo(tile.track)} className="flex items-center gap-2 px-5 py-2 rounded-md bg-white text-black text-sm font-semibold hover:bg-neutral-200">
                <Play className="w-4 h-4 fill-black" /> {tile.actionLabel}
              </button>
            )}
            {tile.hops !== undefined && (
              <button onClick={() => onGo("knowledge-graph")} className="flex items-center gap-2 px-4 py-2 rounded-md bg-white/10 text-white text-sm hover:bg-white/20">
                <Route className="w-4 h-4" /> See the path in the graph
              </button>
            )}
            {tile.href && (
              <a href={tile.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-md bg-white/10 text-white text-sm hover:bg-white/20">
                <ExternalLink className="w-4 h-4" /> {tile.actionLabel === "Open source" ? "Open source" : "Open link"}
              </a>
            )}
          </div>
          <p className="text-sm text-neutral-200 leading-relaxed">{tile.blurb}</p>
          <div className="flex flex-wrap gap-2">
            {tile.meta.map((m) => (
              <span key={m} className="font-mono text-[11px] px-2 py-0.5 rounded-full border border-neutral-700 text-neutral-300">
                {m}
              </span>
            ))}
            {tile.row && <span className="font-mono text-[11px] px-2 py-0.5 text-neutral-500">from &ldquo;{tile.row}&rdquo;</span>}
          </div>

          {similar.length > 0 && (
            <div className="pt-2">
              <h4 className="font-display text-sm text-white mb-3">More like this</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {similar.slice(0, 6).map((s) => {
                  const st = TONE[s.tone];
                  return (
                    <button
                      key={s.id}
                      onClick={() => onOpen(s)}
                      className="relative h-28 rounded-lg overflow-hidden glass text-left p-2.5 flex flex-col justify-end hover:scale-[1.03] transition"
                    >
                      <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 85% 0%, ${st.from}, ${st.to} 70%)` }} />
                      <span className={`relative font-mono text-[9px] uppercase tracking-widest ${st.text}`}>{s.kicker}</span>
                      <span className="relative text-[12px] font-semibold text-white leading-snug line-clamp-2">{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Billboard: React.FC<{ restaurant: RestaurantProfile | null; features: Tile[]; onOpen: (t: Tile) => void; onGo: (t: TrackType) => void }> = ({
  restaurant, features, onOpen, onGo,
}) => {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const chef = useCutout("/masko/chef-pepper.png");
  useEffect(() => {
    if (features.length < 2 || paused) return;
    const id = setInterval(() => setI((x) => (x + 1) % features.length), 9000);
    return () => clearInterval(id);
  }, [features.length, paused]);
  const f = features[i];
  return (
    <section
      className="relative min-h-[52vh] flex items-end overflow-hidden rounded-3xl glass glass-iridescent"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="absolute inset-y-0 right-0 w-full md:w-3/5 pointer-events-none" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={chef}
          alt=""
          className="absolute right-0 sm:right-10 bottom-0 h-[55%] md:h-[92%] w-auto object-contain opacity-30 md:opacity-100 drop-shadow-[0_0_40px_rgba(124,255,196,0.35)]"
          style={{ maskImage: "linear-gradient(to top, transparent 0%, black 18%)", WebkitMaskImage: "linear-gradient(to top, transparent 0%, black 18%)" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_70%_45%,rgba(124,255,196,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-transparent to-transparent" />
      </div>
      <div className="relative z-10 p-6 sm:p-10 max-w-2xl">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] phosphor mb-3">
          {restaurant ? `Tonight at ${restaurant.name} · ${restaurant.neighborhood}` : "Tonight"}
        </div>
        {f ? (
          <div key={f.id} className="animate-fade-up">
            <div className={`font-mono text-xs uppercase tracking-widest ${TONE[f.tone].text}`}>{f.kicker}</div>
            <h1 className="font-display chrome-text text-3xl sm:text-5xl leading-[1.05] mt-1">{f.title}</h1>
            <p className="mt-4 text-sm sm:text-base text-neutral-200 leading-relaxed line-clamp-3">{f.blurb}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => onGo(f.track)} className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-white text-black font-semibold hover:bg-neutral-200">
                <Play className="w-5 h-5 fill-black" /> Make it happen
              </button>
              <button onClick={() => onOpen(f)} className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-white/15 text-white font-semibold hover:bg-white/25 backdrop-blur">
                <Info className="w-5 h-5" /> More info
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-pulse">
            <div className="h-10 w-3/4 rounded bg-white/10" />
            <div className="h-4 w-full rounded bg-white/5" />
            <div className="h-4 w-2/3 rounded bg-white/5" />
          </div>
        )}
        {features.length > 1 && (
          <div className="mt-6 flex gap-1.5" role="tablist" aria-label="Featured opportunities">
            {features.map((x, n) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={n === i}
                aria-label={x.title}
                onClick={() => setI(n)}
                className={`h-1 rounded-full transition-all ${n === i ? "w-8 bg-emerald-300" : "w-4 bg-white/30 hover:bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export const BrowseHome: React.FC<{ onNavigate: (track: TrackType) => void; query?: string }> = ({ onNavigate, query = "" }) => {
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Tile | null>(null);
  const [recent, setRecent] = useState<Tile[]>([]);

  useEffect(() => {
    setRecent(readRecent());
    Promise.allSettled([
      getJson<{ insights: Insight[] }>("/api/graph/insights"),
      getJson<{ restaurant: RestaurantProfile; creators: VettedCreator[] }>("/api/creators"),
      getJson<{ restaurant: RestaurantProfile; trends: BoardTrend[]; pulse: YouSearchResponse }>("/api/radar/trends"),
      getJson<{ plans: PostPlan[] }>("/api/post/plans"),
      getJson<{ rivals: RivalComplaint[] }>("/api/intel"),
    ]).then(([ins, cr, tr, pl, iv]) => {
      const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
      const insights = ok(ins), creators = ok(cr), trends = ok(tr), plans = ok(pl), intel = ok(iv);
      if (!insights && !creators && !trends) {
        setError(ins.status === "rejected" ? String(ins.reason?.message ?? ins.reason) : "Could not load the graph");
        return;
      }
      setData({
        restaurant: creators?.restaurant ?? trends?.restaurant ?? null,
        insights: insights?.insights ?? [],
        creators: creators?.creators ?? [],
        trends: trends?.trends ?? [],
        plans: plans?.plans ?? [],
        rivals: intel?.rivals ?? [],
        web: trends?.pulse?.sources ?? [],
      });
    });
  }, []);

  const rows = useMemo(() => (data ? buildRows(data) : []), [data]);
  const allTiles = useMemo(() => {
    const seen = new Set<string>();
    return rows.flatMap((r) => r.tiles).filter((t) => (seen.has(t.id) ? false : (seen.add(t.id), true)));
  }, [rows]);
  const features = useMemo(() => {
    const top = rows.find((r) => r.ranked)?.tiles ?? [];
    const seen = new Set<string>();
    return top.filter((t) => (seen.has(t.kicker) ? false : (seen.add(t.kicker), true))).slice(0, 5);
  }, [rows]);

  const openTile = useCallback((t: Tile) => {
    setOpen(t);
    setRecent(pushRecent(t));
  }, []);
  const go = useCallback(
    (track: TrackType) => {
      setOpen(null);
      onNavigate(track);
    },
    [onNavigate]
  );

  const similarTo = (t: Tile) => {
    const sameRow = rows.find((r) => r.title === t.row)?.tiles ?? [];
    const pool = sameRow.length > 1 ? sameRow : allTiles.filter((x) => x.track === t.track);
    return pool.filter((x) => x.id !== t.id);
  };

  // Search: every card, matched on title, kicker, blurb and meta
  const q = query.trim().toLowerCase();
  const results = q
    ? allTiles.filter((t) => [t.title, t.kicker, t.blurb, ...t.meta].join(" ").toLowerCase().includes(q))
    : [];

  return (
    <div className="space-y-10">
      {q ? (
        <section className="animate-fade-up space-y-4" aria-live="polite">
          <h2 className="font-display text-lg text-white">
            Results for <span className="chrome-text">&ldquo;{query.trim()}&rdquo;</span>
            <span className="ml-3 font-mono text-[11px] text-neutral-400">{results.length} found</span>
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-neutral-400">Nothing in the graph matches that. Try a dish, a trend, a rival or a creator handle.</p>
          ) : (
            <div className="flex flex-wrap gap-x-3 gap-y-6 pt-4">
              {results.map((t) => (
                <Card key={t.id} tile={t} onOpen={openTile} onGo={go} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <Billboard restaurant={data?.restaurant ?? null} features={features} onOpen={openTile} onGo={go} />
          {error && <div className="text-sm text-rose-300">{error}</div>}
          {!data && !error && (
            <div className="space-y-8" aria-busy="true">
              {[0, 1, 2].map((r) => (
                <div key={r} className="space-y-3">
                  <div className="h-4 w-48 rounded bg-white/10 animate-pulse" />
                  <div className="flex gap-3 overflow-hidden">
                    {[0, 1, 2, 3, 4].map((c) => (
                      <div key={c} className="shrink-0 w-[240px] h-[150px] rounded-xl glass animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {data && recent.length > 0 && (
            <Row
              title="Pick up where you left off"
              subtitle="Cards you opened recently, saved in this browser"
              icon={<Clock className="w-4 h-4 text-emerald-300" />}
              tiles={recent}
              onOpen={openTile}
              onGo={go}
            />
          )}
          {rows.map((r) => (
            <Row key={r.title} {...r} onOpen={openTile} onGo={go} />
          ))}
        </>
      )}
      {open && <DetailModal tile={open} similar={similarTo(open)} onClose={() => setOpen(null)} onGo={go} onOpen={openTile} />}
    </div>
  );
};
