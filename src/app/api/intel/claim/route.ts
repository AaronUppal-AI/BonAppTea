import { NextRequest, NextResponse } from "next/server";
import { claimEvidence } from "@/lib/youSearch";
import { cleanParam } from "@/lib/routeUtils";

export async function POST(req: NextRequest) {
  let claim = "";
  try {
    claim = cleanParam(String((await req.json())?.claim ?? ""), 300);
  } catch {
    return NextResponse.json({ error: "Expected a JSON body with a claim" }, { status: 400 });
  }
  if (claim.length < 8) return NextResponse.json({ error: "Write the claim as a full sentence" }, { status: 400 });
  return NextResponse.json(await claimEvidence(claim));
}
