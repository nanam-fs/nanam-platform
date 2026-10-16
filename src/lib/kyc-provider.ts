import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { ProviderOutcome } from "./kyc-rules";
import { testMode } from "./test-mode";

export type CaptureFiles = { front: Uint8Array; back: Uint8Array | null; selfie: Uint8Array; liveness: Uint8Array[] };

export type SubmitInput = {
  checkId: string;
  applicationId: string;
  files: CaptureFiles;
  applicant: { givenNames: string; lastName: string; phone: string; email: string | null; nin: string };
  consentAt: Date;
};

export interface KycProvider {
  name: string;
  mode: "live" | "sandbox" | "simulator";
  submit(input: SubmitInput): Promise<{ jobId: string }>;
  /** null while still processing. */
  result(jobId: string, meta: { submittedAt: Date; applicant: SubmitInput["applicant"] }): Promise<ProviderOutcome | null>;
}

const blob = (bytes: Uint8Array, type = "image/jpeg") => new Blob([Buffer.from(bytes)], { type });

/* ───────────── Smile ID — Document Verification, V3 API ─────────────
 * docs.usesmileid.com: sandbox https://testapi.smileidentity.com, production https://api.smileidentity.com.
 * POST /v3/token → POST /v3/document_verification (multipart, 202) → GET /v3/status/{job_id} (200 terminal, 202 processing).
 */
function smileId(): KycProvider | null {
  const partnerId = process.env.SMILEID_PARTNER_ID;
  const apiKey = process.env.SMILEID_API_KEY;
  if (!partnerId || !apiKey) return null;
  const production = process.env.SMILEID_ENV === "production";
  const base = production ? "https://api.smileidentity.com" : "https://testapi.smileidentity.com";

  const token = async () => {
    const res = await fetch(`${base}/v3/token`, { method: "POST", headers: { "smileid-partner-id": partnerId, "smileid-api-key": apiKey } });
    const j = (await res.json().catch(() => ({}))) as { token?: string };
    if (!res.ok || !j.token) throw new Error(`Smile ID token request failed (${res.status})`);
    return j.token;
  };

  return {
    name: "smileid",
    mode: production ? "live" : "sandbox",
    async submit({ checkId, applicationId, files, applicant, consentAt }) {
      const fd = new FormData();
      fd.set("selfie_image", blob(files.selfie), "selfie.jpg");
      for (const [i, frame] of files.liveness.entries()) fd.append("liveness_images", blob(frame), `liveness-${i + 1}.jpg`);
      fd.set("document", blob(files.front), "id-front.jpg");
      if (files.back) fd.set("document_back", blob(files.back), "id-back.jpg");
      fd.set("country", "UG");
      fd.set("id_type", "IDENTITY_CARD");
      fd.set("user_id", applicationId);
      // TO CONFIRM in sandbox: nested objects are sent as JSON strings in the multipart body.
      fd.set("consent", JSON.stringify({ granted: true, granted_at: consentAt.toISOString(), notice_language: "EN", notice_privacy_policy_url: `${process.env.PUBLIC_BASE_URL ?? "https://nanam.ug"}/legal/privacy` }));
      fd.set("user_details", JSON.stringify({ given_names: applicant.givenNames, last_name: applicant.lastName, phone_number: applicant.phone, ...(applicant.email ? { email: applicant.email } : {}) }));
      fd.set("partner_params", JSON.stringify({ job_id: checkId, user_id: applicationId }));
      if (process.env.PUBLIC_BASE_URL?.startsWith("https://")) fd.set("callback_url", `${process.env.PUBLIC_BASE_URL}/api/kyc/smileid/callback`);
      const res = await fetch(`${base}/v3/document_verification`, { method: "POST", headers: { "SmileID-Partner-ID": partnerId, "SmileID-Token": await token() }, body: fd });
      const j = (await res.json().catch(() => ({}))) as { job_id?: string; message?: string };
      if (res.status !== 202 || !j.job_id) throw new Error(`Smile ID rejected the submission (${res.status}${j.message ? `: ${j.message}` : ""})`);
      return { jobId: j.job_id };
    },
    async result(jobId) {
      const res = await fetch(`${base}/v3/status/${encodeURIComponent(jobId)}`, { headers: { "SmileID-Partner-ID": partnerId, "SmileID-Token": await token() } });
      if (res.status === 202) return null;
      if (!res.ok) throw new Error(`Smile ID status request failed (${res.status})`);
      return parseSmileResult(await res.json());
    },
  };
}

/** Maps a Smile ID V3 result (status endpoint or webhook body) to our outcome shape. */
export function parseSmileResult(j: unknown): ProviderOutcome | null {
  const r = j as {
    status?: string;
    reason?: string | null;
    id_fields?: Record<string, string | null> | null;
    antifraud?: { summary?: { fraud_detected?: boolean } };
  };
  if (!r?.status || r.status === "processing") return null;
  return { status: r.status, reason: r.reason ?? null, fraudDetected: !!r.antifraud?.summary?.fraud_detected, idFields: r.id_fields ?? null };
}

/** Webhook authenticity: base64(HMAC-SHA256(api_key, timestamp + partner_id + "sid_request")). */
export function verifySmileSignature(signature: string | null, timestamp: string | null) {
  const partnerId = process.env.SMILEID_PARTNER_ID;
  const apiKey = process.env.SMILEID_API_KEY;
  if (!signature || !timestamp || !partnerId || !apiKey) return false;
  const expected = Buffer.from(createHmac("sha256", apiKey).update(timestamp + partnerId + "sid_request").digest("base64"));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* ───────────── Simulator (test mode) ─────────────
 * Mirrors Smile ID's sandbox: the outcome is chosen by the applicant's surname, otherwise "clear"
 * with ID fields that echo the application. Resolves ~4 s after submission.
 */
const scenarios: Record<string, Pick<ProviderOutcome, "status" | "reason">> = {
  TWINLEY: { status: "block", reason: "face_verification_failed" },
  MASQUERO: { status: "block", reason: "spoof_detected" },
  XEROXLEY: { status: "attention", reason: "document_copy_detected" },
  BLURTON: { status: "error", reason: "image_unavailable_or_invalid" },
};

function simulator(): KycProvider {
  return {
    name: "kyc-simulator",
    mode: "simulator",
    async submit() {
      return { jobId: `SIM-${randomUUID()}` };
    },
    async result(_jobId, { submittedAt, applicant }) {
      if (Date.now() - submittedAt.getTime() < 4000) return null;
      const s = scenarios[applicant.lastName.toUpperCase()];
      if (s) return { ...s, fraudDetected: false, idFields: null };
      // "Mismatch" in the name simulates an ID whose number differs from the application.
      const nin = /mismatch/i.test(applicant.givenNames) ? "CM00000000XXXX" : applicant.nin;
      return {
        status: "clear",
        reason: null,
        fraudDetected: false,
        idFields: { full_name: `${applicant.lastName} ${applicant.givenNames}`.toUpperCase(), id_number: nin, date_of_birth: null },
      };
    },
  };
}

export function kycProvider(): KycProvider | null {
  return smileId() ?? (testMode() ? simulator() : null);
}

export function kycProviderByName(name: string | null): KycProvider | null {
  if (name === "smileid") return smileId();
  if (name === "kyc-simulator") return testMode() ? simulator() : null;
  return null;
}
