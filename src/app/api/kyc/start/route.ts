import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { applicantCanUpload, documentActor } from "@/lib/document-access";
import { KycError, startKycCheck } from "@/lib/kyc";

/** Opens a capture link for an application and returns it as a QR code for phone handoff. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { applicationId?: string; token?: string };
  const access = await documentActor(String(body.applicationId ?? ""), body.token ?? null);
  if (!access) return NextResponse.json({ ok: false, message: "You can’t verify this application." }, { status: 403 });
  if (access.actor.kind === "applicant" && !applicantCanUpload(access.app.status)) {
    return NextResponse.json({ ok: false, message: "This application is closed." }, { status: 409 });
  }
  try {
    const { token } = await startKycCheck(access.app.id);
    const origin = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
    const captureUrl = `${origin}/verify/${token}`;
    const qrSvg = await QRCode.toString(captureUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#031a0f", light: "#ffffff" } });
    return NextResponse.json({ ok: true, token, captureUrl, qrSvg });
  } catch (err) {
    const message = err instanceof KycError ? err.message : "Couldn’t start identity verification.";
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
