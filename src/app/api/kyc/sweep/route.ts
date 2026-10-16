import { NextResponse, type NextRequest } from "next/server";
import { sweepKycChecks } from "@/lib/kyc";

/** Safety net for missed Smile ID webhooks. Call with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  return NextResponse.json({ checked: await sweepKycChecks() });
}
