import { NextResponse, type NextRequest } from "next/server";
import { KycError, submitKycCapture } from "@/lib/kyc";

const MAX_TOTAL = 4 * 1024 * 1024;

export async function POST(req: NextRequest, ctx: RouteContext<"/api/kyc/[token]/submit">) {
  if (Number(req.headers.get("content-length") ?? 0) > MAX_TOTAL + 64 * 1024) {
    return NextResponse.json({ ok: false, message: "The photos are too large. Please retake them." }, { status: 413 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, message: "No photos received." }, { status: 400 });
  const bytes = async (v: FormDataEntryValue | null) => (v instanceof File && v.size > 0 ? new Uint8Array(await v.arrayBuffer()) : null);
  const front = await bytes(form.get("front"));
  const selfie = await bytes(form.get("selfie"));
  if (!front || !selfie) return NextResponse.json({ ok: false, message: "The ID photo and selfie are both required." }, { status: 400 });
  const liveness = (await Promise.all(form.getAll("liveness").map(bytes))).filter((b) => b !== null) as Uint8Array[];
  try {
    const check = await submitKycCapture((await ctx.params).token, { front, back: await bytes(form.get("back")), selfie, liveness }, form.get("consent") === "on");
    return NextResponse.json({ ok: true, status: check?.status, reason: check?.decisionReason ?? null });
  } catch (err) {
    const message = err instanceof KycError ? err.message : "Something went wrong. Please try again.";
    if (!(err instanceof KycError)) console.error("[kyc] submit failed", err);
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
