import { NextResponse, type NextRequest } from "next/server";
import { sweepPendingPayments } from "@/lib/payments";

/** Safety net for missed callbacks. Call on a schedule with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const checked = await sweepPendingPayments();
  return NextResponse.json({ checked });
}
