import { NextResponse, type NextRequest } from "next/server";
import { runReminders } from "@/lib/notifications";

/** Daily payment reminders. Call with `Authorization: Bearer $CRON_SECRET` (Vercel Cron does this). */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  return NextResponse.json(await runReminders());
}
