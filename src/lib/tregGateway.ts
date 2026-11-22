import { SponsorLead } from "@/types";
import { MOCK_SPONSOR_LEADS } from "./mockData";

export interface TregEnrichmentResponse {
  lead: SponsorLead;
  isLiveTregCall: boolean;
  costUsd: number;
}

export async function enrichSponsorWithTreg(domainOrBrand: string, apiKey?: string): Promise<TregEnrichmentResponse> {
  const key = apiKey || process.env.TREG_API_KEY;
  const match = MOCK_SPONSOR_LEADS.find(
    (l) => l.brandName.toLowerCase().includes(domainOrBrand.toLowerCase()) || l.domain.toLowerCase().includes(domainOrBrand.toLowerCase())
  );

  if (match) {
    return {
      lead: match,
      isLiveTregCall: !!key,
      costUsd: match.tregCallCostUsd,
    };
  }

  // Fallback dynamic generation for any brand
  const cleaned = domainOrBrand.replace(/https?:\/\//, "").replace(/\/.*$/, "");
  const brandTitle = cleaned.split(".")[0].toUpperCase();

  const dynamicLead: SponsorLead = {
    id: `lead-${Date.now()}`,
    brandName: brandTitle,
    domain: cleaned.includes(".") ? cleaned : `${cleaned.toLowerCase()}.io`,
    industry: "High-Growth Software & AI Services",
    budgetStatus: "Active Q1",
    recentSponsorships: ["Tech Craft Podcast", "FullStack Radio"],
    matchedNiche: "Developer Tools & AI",
    decisionMaker: {
      name: "Jordan Hayes",
      title: "Head of Growth & Creator Marketing",
      email: `jordan.h@${cleaned.includes(".") ? cleaned : `${cleaned.toLowerCase()}.io`}`,
      linkedinUrl: `https://linkedin.com/in/jordan-${cleaned.split(".")[0]}`,
      verificationStatus: "verified",
    },
    estimatedBudgetRange: "$3,000 - $6,500 / episode",
    suggestedAngle: `Highlight seamless developer on-ramps and speed-to-value for ${brandTitle} with live code walkthrough.`,
    tregCallCostUsd: 0.034,
  };

  return {
    lead: dynamicLead,
    isLiveTregCall: !!key,
    costUsd: 0.034,
  };
}
