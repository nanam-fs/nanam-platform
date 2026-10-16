import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { refreshKycCheck } from "@/lib/kyc";
import { parseSmileResult, verifySmileSignature } from "@/lib/kyc-provider";

/** Smile ID webhook. Accepted only with a valid signature; delivery is at-least-once, so processing is idempotent. */
export async function POST(req: NextRequest) {
  if (!verifySmileSignature(req.headers.get("response-signature"), req.headers.get("response-timestamp"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { job_id?: string };
  const jobId = req.headers.get("smileid-job-id") ?? body.job_id;
  if (jobId) {
    const check = await db.query.kycChecks.findFirst({ where: eq(schema.kycChecks.providerJobId, jobId), columns: { id: true } });
    const outcome = parseSmileResult(body);
    if (check) await refreshKycCheck(check.id, outcome ?? undefined).catch((e) => console.error("[kyc] webhook processing failed", e));
  }
  return NextResponse.json({ received: true });
}
