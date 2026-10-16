import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { KycCheck } from "@/db/schema";
import { audit } from "./audit";
import { sniffType } from "./documents-config";
import { kycProvider, kycProviderByName, type CaptureFiles } from "./kyc-provider";
import { decide } from "./kyc-rules";
import { putFile } from "./storage";

const LINK_MINUTES = 30;
const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export class KycError extends Error {}

export function kycAvailable() {
  return !!kycProvider();
}

/** Opens a new capture link for an application. Returns the raw token (shown once, in the QR / link). */
export async function startKycCheck(applicationId: string) {
  if (!kycAvailable()) throw new KycError("Identity verification isn’t available right now.");
  const token = randomBytes(24).toString("base64url");
  const [row] = await db
    .insert(schema.kycChecks)
    .values({ applicationId, tokenHash: sha(token), tokenExpiresAt: new Date(Date.now() + LINK_MINUTES * 60_000) })
    .returning({ id: schema.kycChecks.id });
  await audit(db, { actorId: null, action: "kyc.started", entity: "application", entityId: applicationId, detail: { check: row.id } });
  return { token, checkId: row.id };
}

export async function checkByToken(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  return db.query.kycChecks.findFirst({
    where: eq(schema.kycChecks.tokenHash, sha(token)),
    with: { application: { columns: { id: true, fullName: true, nin: true, phone: true, email: true, product: true } } },
  });
}

export const linkUsable = (c: Pick<KycCheck, "status" | "tokenExpiresAt">) => c.status === "awaiting_capture" && c.tokenExpiresAt > new Date();

function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? { givenNames: parts.slice(0, -1).join(" "), lastName: parts.at(-1)! } : { givenNames: parts[0], lastName: parts[0] };
}

async function storeImage(applicationId: string, kind: "id_front" | "id_back" | "selfie", bytes: Uint8Array) {
  const type = sniffType(bytes);
  if (type !== "image/jpeg" && type !== "image/png" && type !== "image/webp") throw new KycError("Photos must be JPEG, PNG or WebP images.");
  const key = `applications/${applicationId}/kyc/${randomUUID()}.${type === "image/jpeg" ? "jpg" : type.split("/")[1]}`;
  await putFile(key, bytes, type);
  await db.insert(schema.documents).values({
    applicationId,
    kind,
    fileName: `${kind.replace("_", "-")}.${type === "image/jpeg" ? "jpg" : type.split("/")[1]}`,
    contentType: type,
    size: bytes.byteLength,
    storageKey: key,
    uploadedBy: "applicant",
  });
}

/** Receives the captured photos, keeps the ID and selfie privately, and submits everything to the provider. */
export async function submitKycCapture(token: string, files: CaptureFiles, consent: boolean) {
  const check = await checkByToken(token);
  if (!check || !linkUsable(check)) throw new KycError("This verification link has expired. Start again from your computer or the portal.");
  if (!consent) throw new KycError("Please agree to the identity check to continue.");
  if (files.liveness.length < 6 || files.liveness.length > 8) throw new KycError("The selfie video didn’t capture properly. Please try again.");
  const provider = kycProvider();
  if (!provider) throw new KycError("Identity verification isn’t available right now.");

  // Claim the link so a second submission can't race the first.
  const consentAt = new Date();
  const [claimed] = await db
    .update(schema.kycChecks)
    .set({ status: "processing", consentAt, submittedAt: consentAt, provider: provider.name })
    .where(and(eq(schema.kycChecks.id, check.id), eq(schema.kycChecks.status, "awaiting_capture")))
    .returning({ id: schema.kycChecks.id });
  if (!claimed) throw new KycError("These photos were already submitted.");

  const app = check.application;
  try {
    await storeImage(app.id, "id_front", files.front);
    if (files.back) await storeImage(app.id, "id_back", files.back);
    await storeImage(app.id, "selfie", files.selfie);
    // Liveness frames go to the provider only; we don't keep them.
    const { jobId } = await provider.submit({
      checkId: check.id,
      applicationId: app.id,
      files,
      applicant: { ...splitName(app.fullName), phone: app.phone, email: app.email, nin: app.nin },
      consentAt,
    });
    await db.update(schema.kycChecks).set({ providerJobId: jobId }).where(eq(schema.kycChecks.id, check.id));
    await db.update(schema.applications).set({ kycStatus: "processing" }).where(eq(schema.applications.id, app.id));
    await audit(db, { actorId: null, action: "kyc.submitted", entity: "application", entityId: app.id, detail: { check: check.id, provider: provider.name, mode: provider.mode } });
  } catch (err) {
    await db.update(schema.kycChecks).set({ status: "retake", decisionReason: "We couldn’t send your photos for checking. Please try again.", completedAt: new Date() }).where(eq(schema.kycChecks.id, check.id));
    throw err instanceof KycError ? err : new KycError("We couldn’t send your photos for checking. Please try again.");
  }
  return refreshKycCheck(check.id);
}

/** Pulls the provider result if still processing, applies our decision rules, and records the outcome. Idempotent. */
export async function refreshKycCheck(checkId: string, pushed?: Parameters<typeof decide>[0]) {
  const check = await db.query.kycChecks.findFirst({
    where: eq(schema.kycChecks.id, checkId),
    with: { application: { columns: { id: true, fullName: true, nin: true, phone: true, email: true } } },
  });
  if (!check || check.status !== "processing" || !check.providerJobId) return check;
  const provider = kycProviderByName(check.provider);
  if (!provider) return check;

  const app = check.application;
  const outcome =
    pushed ??
    (await provider
      .result(check.providerJobId, { submittedAt: check.submittedAt ?? check.createdAt, applicant: { ...splitName(app.fullName), phone: app.phone, email: app.email, nin: app.nin } })
      .catch(() => null));
  if (!outcome) return check;

  const d = decide(outcome, { fullName: app.fullName, nin: app.nin });
  const [updated] = await db
    .update(schema.kycChecks)
    .set({
      status: d.status,
      providerStatus: outcome.status,
      providerReason: outcome.reason,
      idFields: outcome.idFields,
      checks: d.checks,
      decisionReason: d.reason,
      completedAt: new Date(),
    })
    .where(and(eq(schema.kycChecks.id, check.id), eq(schema.kycChecks.status, "processing")))
    .returning();
  if (!updated) return db.query.kycChecks.findFirst({ where: eq(schema.kycChecks.id, check.id) });
  await db.update(schema.applications).set({ kycStatus: d.status }).where(eq(schema.applications.id, app.id));
  await audit(db, { actorId: null, action: `kyc.${d.status}`, entity: "application", entityId: app.id, detail: { check: check.id, provider: check.provider, providerStatus: outcome.status, reason: outcome.reason } });
  return updated;
}

/** Safety net for missed webhooks: re-check anything still processing from the last day. */
export async function sweepKycChecks() {
  const open = await db.query.kycChecks.findMany({
    where: and(eq(schema.kycChecks.status, "processing"), gt(schema.kycChecks.createdAt, new Date(Date.now() - 86_400_000))),
    columns: { id: true },
  });
  for (const c of open) await refreshKycCheck(c.id).catch((e) => console.error("[kyc] refresh failed", c.id, e));
  return open.length;
}

export async function latestKycCheck(applicationId: string) {
  return db.query.kycChecks.findFirst({ where: eq(schema.kycChecks.applicationId, applicationId), orderBy: desc(schema.kycChecks.createdAt) });
}

/** Officer override after manual review. */
export async function reviewKycCheck(checkId: string, staffId: string, outcome: "verified" | "rejected", note: string) {
  const [row] = await db
    .update(schema.kycChecks)
    .set({ status: outcome, reviewedBy: staffId, reviewNote: note, completedAt: new Date() })
    .where(and(eq(schema.kycChecks.id, checkId), inArray(schema.kycChecks.status, ["review", "processing", "retake"])))
    .returning({ applicationId: schema.kycChecks.applicationId });
  if (!row) throw new KycError("This check has already been decided.");
  await db.update(schema.applications).set({ kycStatus: outcome }).where(eq(schema.applications.id, row.applicationId));
  await audit(db, { actorId: staffId, action: `kyc.manual_${outcome}`, entity: "application", entityId: row.applicationId, detail: { check: checkId, note } });
}
