import { NextResponse, type NextRequest } from "next/server";
import { checkByToken, refreshKycCheck } from "@/lib/kyc";

/** Polled by the waiting computer and the phone. The token itself is the capability. */
export async function GET(_: NextRequest, ctx: RouteContext<"/api/kyc/[token]/status">) {
  const check = await checkByToken((await ctx.params).token);
  if (!check) return NextResponse.json({ status: "not_found" }, { status: 404 });
  const latest = check.status === "processing" ? await refreshKycCheck(check.id) : check;
  const expired = latest?.status === "awaiting_capture" && check.tokenExpiresAt < new Date();
  return NextResponse.json(
    { status: expired ? "expired" : latest?.status, reason: latest?.decisionReason ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
