import { NextRequest, NextResponse } from "next/server";
import { verifyClaimWithYouCom } from "@/lib/youSearch";
import { graphStore } from "@/lib/graphStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { statement, apiKey } = body;

    if (!statement || typeof statement !== "string") {
      return NextResponse.json({ error: "Missing statement" }, { status: 400 });
    }

    const verifiedClaim = await verifyClaimWithYouCom(statement, apiKey);

    // Update Graph with verified or debunked claim
    if (verifiedClaim.status === "debunked") {
      graphStore.updateNodeStatus("claim-robotics", "debunked");
    } else if (verifiedClaim.status === "verified") {
      graphStore.updateNodeStatus("claim-pgvector", "verified");
    }

    return NextResponse.json({
      claim: verifiedClaim,
      graphUpdated: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Verification failed" }, { status: 500 });
  }
}
