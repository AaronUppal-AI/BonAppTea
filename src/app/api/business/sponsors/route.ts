import { NextRequest, NextResponse } from "next/server";
import { enrichSponsorWithTreg } from "@/lib/tregGateway";
import { MOCK_SPONSOR_LEADS } from "@/lib/mockData";

export async function GET() {
  return NextResponse.json({
    leads: MOCK_SPONSOR_LEADS,
    rateCard: {
      newsletterDedicated: 1800,
      podcastPreRoll60s: 2200,
      youtubeIntegration: 4500,
      tiktokSeries: 2800,
      blendedCpm: 54,
    },
    tregGatewayStatus: "online",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { domainOrBrand, apiKey } = await req.json();
    if (!domainOrBrand) {
      return NextResponse.json({ error: "Missing domain or brand" }, { status: 400 });
    }

    const enrichment = await enrichSponsorWithTreg(domainOrBrand, apiKey);
    return NextResponse.json(enrichment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Enrichment failed" }, { status: 500 });
  }
}
