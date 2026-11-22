"use client";

import React, { useEffect, useRef } from "react";
import { X, Check } from "lucide-react";

export type AboutSection = "about" | "pricing";

interface Props {
  isOpen: boolean;
  section: AboutSection;
  onClose: () => void;
}

const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-bold text-white mt-6 mb-2">{children}</h3>
);
const P: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[13px] text-neutral-300 leading-relaxed">{children}</p>
);
const List: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="space-y-1.5 text-[13px] text-neutral-300 leading-relaxed list-disc pl-5">
    {items.map((it, i) => (
      <li key={i}>{it}</li>
    ))}
  </ul>
);

const TIERS = [
  {
    name: "CompGuard",
    tag: "Good",
    price: "$149",
    per: "per month · $1,490/yr",
    buyer: "Single $100–$200/plate NYC venue: owner-operator, GM or chef-owner",
    payback: "Pays back with ~2 prevented $350 comps a month",
    features: [
      "Under-10-second live-web creator checks with source cards",
      "Disclosure flags (#ad / #gifted)",
      "Weekly comp ROI and time-to-value",
      "One-click Discontinue with a polite Soft Off-Ramp DM",
    ],
  },
  {
    name: "GroupPulse",
    tag: "Better",
    price: "$399",
    per: "per month · $3,990/yr",
    featured: true,
    buyer: "City group, 3–4 locations: multi-unit GM or director of operations",
    payback: "Pays back with ~3–4 tracked two-tops a month at $150/plate",
    features: [
      "Everything in CompGuard",
      "Shared vetting rules across venues",
      "Off-peak seat routing (Tue/Wed discovery nights)",
      "Multi-venue ROI and time-to-value",
    ],
  },
  {
    name: "BoroughCommand",
    tag: "Best",
    price: "$999",
    per: "per month · $9,990/yr",
    buyer: "Multi-concept group across all five boroughs: VP Hospitality, CMO, PR, finance/legal",
    payback: "Pays back with ~10+ tracked covers a month, or one major brand save",
    features: [
      "Everything in GroupPulse",
      "Concept governance and PR/VIP whitelist",
      "30–60s Research API creator dossiers",
      "Instant Discontinue across the portfolio",
    ],
  },
];

export const AboutModal: React.FC<Props> = ({ isOpen, section, onClose }) => {
  const pricingRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (section === "pricing") pricingRef.current?.scrollIntoView({ block: "start" });
    else scrollRef.current?.scrollTo({ top: 0 });
  }, [isOpen, section]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-800">
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
              className="font-bold text-white hover:text-rose-300"
            >
              About BonAppTea
            </button>
            <button
              onClick={() => pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="text-neutral-400 hover:text-white"
            >
              Pricing
            </button>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div ref={scrollRef} className="overflow-y-auto px-6 pb-8">
          <p className="mt-5 text-[11px] uppercase tracking-wider text-rose-300/80">Built for the You.com Hackathon</p>
          {/* About */}
          <H>Inspiration</H>
          <P>
            Restaurants run on 5–12% margins, and in NYC that drops to 3–8% once rent is paid. Most independents can&apos;t pay a
            $3,000/month social agency. One viral TikTok can still fill a dining room for months, and NYC proves it again and again
            with its line culture. Owners also get dozens of DMs a week from &ldquo;influencers&rdquo; asking for free meals, and many
            of those accounts have almost no local followers. We wanted to give every neighborhood spot the marketing brain a big
            restaurant group would pay for.
          </P>

          <H>What it does</H>
          <P>BonAppTea is a CMO in a box for independent restaurants. It has four tools:</P>
          <div className="mt-2">
            <List
              items={[
                <>
                  <b className="text-white">Dish-to-Post:</b> pairs a dish with a live trend and hands the kitchen a ready-to-film Reel
                  or TikTok plan: a hook, a 3-shot storyboard, trending audio and hyperlocal hashtags.
                </>,
                <>
                  <b className="text-white">Trend Radar:</b> spots food trends while they&apos;re still taking off and matches each one
                  to what the kitchen already stocks, for example: &ldquo;Black sesame desserts are rising, and you already have
                  everything for them.&rdquo;
                </>,
                <>
                  <b className="text-white">Creator Scout:</b> finds creators who post near the restaurant, including people who
                  already posted from it. It filters out vanity accounts, businesses and creators paid by rivals, then drafts a personal
                  invite to a VIP tasting.
                </>,
                <>
                  <b className="text-white">Intel Desk:</b> reads nearby rivals&apos; recent Google reviews and neighborhood news,
                  finds the complaints the restaurant can answer, and fact-checks menu claims before they&apos;re posted.
                </>,
              ]}
            />
          </div>
          <div className="mt-2">
            <P>
              <b className="text-white">Chef Pepper</b> is an animated concierge built with Masko. Owners ask it questions in plain
              English, and it answers from the restaurant&apos;s own knowledge graph.
            </P>
          </div>

          <H>How we built it</H>
          <List
            items={[
              "Next.js 14 + TypeScript + Tailwind for the app and its API routes.",
              "You.com Search API for real-time grounding in food press and local news: proof for every trend, neighborhood coverage, filming references and claim checks.",
              "Neo4j GraphRAG holds a hospitality knowledge graph of restaurants, menu courses, ingredients, neighborhoods, trends, rivals, review complaints, creators and their posts. Chef Pepper's answers are built only from the rows a Cypher query returns, which keeps it from making things up.",
              "Cytoscape.js shows the live graph, and each insight lights up the exact path through it, so judges can see how the reasoning works.",
              "Treg is the tool layer: Google Maps search and reviews for rivals, and Instagram location, hashtag, profile and post data for creators.",
              "Masko powers the Chef Pepper mascot.",
              "The demo runs on Kochi, a one-Michelin-star Korean restaurant in Hell's Kitchen. Its menu and facts come from its website; rivals, reviews and creators are pulled live. Trend velocity scores are illustrative.",
            ]}
          />

          <H>Challenges we ran into</H>
          <List
            items={[
              "Pivoting mid-hackathon. We started with a creator intelligence tool and switched to restaurants once we saw the pain was sharper there. That meant redesigning the graph schema and rewriting every track in the middle of the build.",
              "Keeping the AI honest. Restaurants can't post a false claim about allergens or sourcing, so Chef Pepper answers only from graph query results.",
              "Messy real-world data. Many restaurants pose as creators on Instagram, and location tags often lack a city, so we detect businesses from their bios and measure local reach from coordinates.",
              "Designing for busy operators. Chefs won't log into a dashboard during service. Every output had to be something they could act on in seconds.",
            ]}
          />

          <H>Accomplishments that we&apos;re proud of</H>
          <List
            items={[
              "A working GraphRAG pipeline that links trends to the restaurant's stocked ingredients and menu, rivals' complaints to the restaurant's strengths, and creators to the places they post from.",
              "Multi-hop opportunity paths, such as people who just posted from the restaurant (warm leads) or rival weak spots the menu answers.",
              "A grounded mascot concierge whose answers can be traced back to graph data.",
              "A business case that holds up: about $29/month in costs on a $399 plan (≈93% gross margin), and two or three extra tables a month cover the fee.",
              "An NYC go-to-market plan: the \"Free Food Influencer Audit\" as the cold-outreach hook and the \"Tuesday Night Engine\" positioning.",
            ]}
          />

          <H>What we learned</H>
          <List
            items={[
              "Graphs are a natural fit for hospitality. Questions like \"which creator posts near me and hasn't worked with my rival?\" are relationship questions at heart.",
              "Grounding matters more than generating. Owners trust real numbers more than clever copy.",
              "The best feature is the one that stops wasted money. Vetting creators beat every other idea in our NYC evaluation, at 9.8/10.",
            ]}
          />

          <H>What&apos;s next for BonAppTea</H>
          <List
            items={[
              "Scheduled Treg scans and contact enrichment, so creator and rival data refreshes on its own.",
              "WhatsApp/SMS-first delivery: chefs reply \"Approve\" or \"Send\" instead of opening a dashboard.",
              "POS and reservation integrations (Toast, Square, OpenTable, Resy) to tie each viral post or creator visit to booked covers and revenue.",
              "An NYC beta with three restaurants (a burger spot, a brunch café, an upscale casual) on a free 30-day pilot focused on filling off-peak shifts.",
              "A channel partner program for freelance social media managers who run 5–10 restaurants each.",
            ]}
          />

          {/* Pricing */}
          <div ref={pricingRef} className="pt-8 scroll-mt-4">
            <h2 className="text-lg font-bold text-white">Pricing</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              For $100–$200/plate NYC dining rooms. Stop comping guests whose audience never books, and prove the return on the ones who do.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {TIERS.map((t) => (
                <div
                  key={t.name}
                  className={`relative rounded-2xl border p-5 flex flex-col ${
                    t.featured ? "border-rose-500/70 bg-rose-950/20 shadow-lg shadow-rose-500/10" : "border-neutral-800 bg-neutral-900/40"
                  }`}
                >
                  {t.featured && (
                    <span className="absolute -top-2.5 left-5 text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-white px-2 py-0.5 rounded-full">
                      Most popular
                    </span>
                  )}
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500">{t.tag}</div>
                  <div className="text-base font-bold text-white">{t.name}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">{t.price}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400">{t.per}</div>
                  <p className="mt-3 text-[11px] text-neutral-300 leading-snug">{t.buyer}</p>
                  <ul className="mt-4 space-y-2 text-[12px] text-neutral-300 flex-1">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 pt-3 border-t border-white/10 font-mono text-[10px] text-emerald-300 leading-snug">{t.payback}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
