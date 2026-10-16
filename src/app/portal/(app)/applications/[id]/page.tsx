import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { DocumentUploader } from "@/components/document-uploader";
import { db, schema } from "@/db";
import { requireCustomer } from "@/lib/customer-auth";
import { applicantCanUpload } from "@/lib/document-access";
import { documentLabels, documentSlots, requiredDocuments } from "@/lib/documents-config";
import { getProduct, type ProductSlug } from "@/lib/products";
import { formatUGX } from "@/lib/utils";

export const metadata = { title: "Application documents" };

export default async function ApplicationDocuments({ params }: PageProps<"/portal/applications/[id]">) {
  const { phone } = await requireCustomer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const app = await db.query.applications.findFirst({
    where: and(eq(schema.applications.id, id), eq(schema.applications.phone, phone)),
    with: { documents: { orderBy: asc(schema.documents.createdAt), columns: { kind: true, fileName: true, status: true, reviewNote: true } } },
  });
  if (!app) notFound();
  const rejected = app.documents.filter((d) => d.status === "rejected");

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-xl shadow-forest-950/5 md:p-8">
      <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest-700">
        <ArrowLeft className="size-4" /> My account
      </Link>
      <h1 className="mt-4 font-display text-4xl text-forest-950">Your documents</h1>
      <p className="mt-1 text-muted">
        {getProduct(app.product)?.name} · {formatUGX(app.approvedAmount ?? app.amount)} · <span className="font-mono">{app.reference}</span>
      </p>
      {rejected.length > 0 && (
        <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-medium">Please upload a new copy of:</p>
          <ul className="mt-1 list-disc pl-5">
            {rejected.map((d, i) => (
              <li key={i}>
                {documentLabels[d.kind]}
                {d.reviewNote ? `: ${d.reviewNote}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {applicantCanUpload(app.status) ? (
        <div className="mt-6">
          <DocumentUploader
            applicationId={app.id}
            slots={documentSlots(app.product)}
            required={requiredDocuments[app.product as ProductSlug]}
            existing={app.documents.filter((d) => d.status !== "rejected").map((d) => ({ kind: d.kind, fileName: d.fileName }))}
          />
          <p className="mt-4 text-xs text-muted">Photos or PDFs up to 4 MB each. Only NANAM staff can see your documents.</p>
        </div>
      ) : (
        <p className="mt-6 rounded-2xl bg-sand p-5 text-sm">This application is closed, so documents can no longer be added here.</p>
      )}
    </section>
  );
}
