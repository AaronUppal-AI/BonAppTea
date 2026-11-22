export type TrackType = "idea-to-post" | "trend-radar" | "creator-business" | "research-desk";

export interface TrendSource {
  title: string;
  url: string;
  snippet: string;
  trustScore: number;
  publishedDate?: string;
  isPrimary?: boolean;
}

export interface ContentGap {
  summary: string;
  unansweredQuestions: string[];
  searchVolumeGrowth: string;
  competitorVideoCount: number;
}

export interface Trend {
  id: string;
  keyword: string;
  niche: string;
  velocityScore: number; // 0 to 1
  velocityGrowthPct: number; // e.g. 410
  status: "accelerating" | "peak" | "cooling";
  firstDetected: string;
  summary: string;
  sources: TrendSource[];
  contentGap: ContentGap;
  recommendedHooks: {
    type: "contrarian" | "analytical" | "narrative";
    hook: string;
    targetAudience: string;
  }[];
  relatedBrands: string[];
}

export interface Claim {
  id: string;
  statement: string;
  category: "statistic" | "quote" | "financial_metric" | "news_event" | "technical_benchmark";
  status: "verified" | "disputed" | "debunked" | "unverified";
  confidenceScore: number; // 0 to 100
  verdictExplanation: string;
  primarySource?: {
    title: string;
    url: string;
    snippet: string;
    publicationDate: string;
  };
  discrepancyNote?: string;
  counterargument?: string;
}

export interface DecisionMaker {
  name: string;
  title: string;
  email: string;
  linkedinUrl: string;
  verificationStatus: "verified" | "catch_all" | "pending";
}

export interface SponsorLead {
  id: string;
  brandName: string;
  domain: string;
  industry: string;
  budgetStatus: "Active Q1" | "Accelerating" | "Seasonal";
  recentSponsorships: string[];
  matchedNiche: string;
  decisionMaker: DecisionMaker;
  estimatedBudgetRange: string;
  suggestedAngle: string;
  tregCallCostUsd: number;
}

export interface DynamicRateCard {
  newsletterDedicated: number;
  podcastPreRoll60s: number;
  youtubeIntegration: number;
  tiktokSeries: number;
  blendedCpm: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "creator" | "niche" | "trend" | "source" | "brand" | "claim" | "format";
  status?: "verified" | "disputed" | "debunked" | "active" | "neutral";
  details?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface MaskoAgentState {
  avatarId: string;
  mascotName: string;
  mood: "idle" | "speaking" | "thinking" | "alert" | "excited";
  currentSpeech: string;
  isVoiceActive: boolean;
  imageUrl?: string;
}

export interface GraphQueryTrace {
  name: string;
  cypher: string;
  rows: Record<string, unknown>[];
}
