import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import type { DocumentKind } from "@/db/schema";
import { audit } from "@/lib/audit";
import { applicantCanUpload, documentActor } from "@/lib/document-access";
import { cleanFileName, documentLabels, extensionFor, MAX_DOCS_PER_APPLICATION, MAX_UPLOAD_BYTES, sniffType } from "@/lib/documents-config";
import { putFile, storageAvailable } from "@/lib/storage";

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

export async function POST(req: NextRequest) {
  if (!storageAvailable()) return fail("Document upload isn’t available right now. Please bring your documents to our office.", 503);
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_UPLOAD_BYTES + 64 * 1024) return fail("That file is too large. The limit is 4 MB.", 413);

  const form = await req.formData().catch(() => null);
  if (!form) return fail("Upload a file.");
  const applicationId = String(form.get("applicationId") ?? "");
  const kind = String(form.get("kind") ?? "") as DocumentKind;
  const file = form.get("file");
  if (!(kind in documentLabels)) return fail("Choose what kind of document this is.");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a file to upload.");
  if (file.size > MAX_UPLOAD_BYTES) return fail("That file is too large. The limit is 4 MB.", 413);

  const access = await documentActor(applicationId, String(form.get("token") ?? "") || null);
  if (!access) return fail("You can’t add documents to this application.", 403);
  const { actor, app } = access;
  if (actor.kind === "staff" && !actor.canReview) return fail("Your role can’t add documents.", 403);
  if (actor.kind === "applicant" && !applicantCanUpload(app.status)) return fail("This application is closed. Please contact us.", 409);

  const [{ n }] = await db.select({ n: count() }).from(schema.documents).where(eq(schema.documents.applicationId, app.id));
  if (n >= MAX_DOCS_PER_APPLICATION) return fail("This application already has the maximum number of documents.", 409);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffType(bytes);
  if (!type) return fail("Upload a photo (JPG, PNG, WebP) or a PDF.", 415);

  const key = `applications/${app.id}/${randomUUID()}.${extensionFor[type]}`;
  await putFile(key, bytes, type);
  const [doc] = await db
    .insert(schema.documents)
    .values({
      applicationId: app.id,
      kind,
      fileName: cleanFileName(file.name, type),
      contentType: type,
      size: bytes.byteLength,
      storageKey: key,
      uploadedBy: actor.kind,
      staffId: actor.kind === "staff" ? actor.staffId : null,
    })
    .returning({ id: schema.documents.id, fileName: schema.documents.fileName });
  await audit(db, {
    actorId: actor.kind === "staff" ? actor.staffId : null,
    action: "document.uploaded",
    entity: "application",
    entityId: app.id,
    detail: { document: doc.id, kind, size: bytes.byteLength, by: actor.kind },
  });
  return NextResponse.json({ ok: true, id: doc.id, fileName: doc.fileName, kind });
}
