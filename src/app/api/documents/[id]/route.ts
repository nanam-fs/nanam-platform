import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { documentActor } from "@/lib/document-access";
import { getFile } from "@/lib/storage";

/** Streams a private document to staff, or to the customer who owns the application. */
export async function GET(_: NextRequest, ctx: RouteContext<"/api/documents/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new NextResponse(null, { status: 404 });
  const doc = await db.query.documents.findFirst({ where: eq(schema.documents.id, id) });
  if (!doc) return new NextResponse(null, { status: 404 });

  // Upload tokens grant upload only, never read access.
  const access = await documentActor(doc.applicationId, null);
  if (!access) return new NextResponse(null, { status: 404 });

  const stream = await getFile(doc.storageKey);
  if (!stream) return new NextResponse(null, { status: 404 });
  if (access.actor.kind === "staff") {
    await audit(db, { actorId: access.actor.staffId, action: "document.viewed", entity: "application", entityId: doc.applicationId, detail: { document: doc.id, kind: doc.kind } });
  }
  return new NextResponse(stream, {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Length": String(doc.size),
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      // Images get a locked-down policy; a sandbox CSP would stop the browser's PDF viewer.
      ...(doc.contentType.startsWith("image/") ? { "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox" } : {}),
      "Cache-Control": "private, no-store",
    },
  });
}
