import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui";
import { getLegalDoc, LEGAL_IS_DRAFT, LEGAL_UPDATED, legalDocs } from "@/lib/legal";

export function generateStaticParams() {
  return legalDocs.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const doc = getLegalDoc((await params).slug);
  return doc ? { title: doc.title, description: doc.summary } : {};
}

export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const doc = getLegalDoc((await params).slug);
  if (!doc) notFound();
  return (
    <>
      <PageHero eyebrow="Legal" title={doc.title} body={doc.summary} />
      <section className="container-page grid gap-12 py-16 lg:grid-cols-[14rem_1fr] [&>*]:min-w-0">
        <nav aria-label="Legal documents" className="lg:sticky lg:top-28 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {legalDocs.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`/legal/${d.slug}`}
                  aria-current={d.slug === doc.slug ? "page" : undefined}
                  className="block whitespace-nowrap rounded-full px-4 py-2 text-sm text-muted hover:bg-white hover:text-forest-700 aria-[current=page]:bg-white aria-[current=page]:font-medium aria-[current=page]:text-forest-800"
                >
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl">
          {LEGAL_IS_DRAFT && (
            <p className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              <strong>Draft for legal review.</strong> This document is pending review by NANAM’s legal counsel. Items in [brackets] are being confirmed.
            </p>
          )}
          <p className="text-sm text-muted">Last updated {LEGAL_UPDATED}</p>
          {doc.sections.map((s) => (
            <section key={s.h} className="mt-10">
              <h2 className="font-display text-2xl text-forest-950">{s.h}</h2>
              {s.p?.map((t) => (
                <p key={t} className="mt-3 leading-relaxed text-ink/80">{t}</p>
              ))}
              {s.list && (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink/80 marker:text-lime-600">
                  {s.list.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </section>
    </>
  );
}
