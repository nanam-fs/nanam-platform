import type { Metadata } from "next";
import { CtaBand, FaqList } from "@/components/blocks";
import { ButtonLink, PageHero } from "@/components/ui";
import { faqs } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Help & FAQs",
  description: "Answers about NANAM loan requirements, costs, collateral, repayment and regulation.",
};

const groups = ["Getting started", "Cost & repayment", "Security & trust"] as const;

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        eyebrow="Help centre"
        title={
          <>
            Straight answers, <em className="text-lime-400">no jargon.</em>
          </>
        }
      />
      <section className="container-page grid gap-14 py-20 lg:grid-cols-[16rem_1fr] [&>*]:min-w-0">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="FAQ sections" className="flex gap-2 overflow-x-auto lg:flex-col">
            {groups.map((g) => (
              <a key={g} href={`#${g.replace(/\W+/g, "-").toLowerCase()}`} className="whitespace-nowrap rounded-full px-4 py-2 text-sm text-muted hover:bg-white hover:text-forest-700">
                {g}
              </a>
            ))}
          </nav>
          <div className="mt-8 hidden rounded-3xl bg-forest-950 p-6 text-white lg:block">
            <p className="font-medium">Still have a question?</p>
            <p className="mt-1 text-sm text-white/60">Email {site.email} or send us a message.</p>
            <ButtonLink href="/contact" variant="lime" className="mt-5 h-10">
              Contact us
            </ButtonLink>
          </div>
        </aside>
        <div className="space-y-16">
          {groups.map((g) => (
            <div key={g} id={g.replace(/\W+/g, "-").toLowerCase()} className="scroll-mt-28">
              <h2 className="mb-4 font-display text-3xl text-forest-950">{g}</h2>
              <FaqList items={faqs.filter((f) => f.group === g)} />
            </div>
          ))}
        </div>
      </section>
      <CtaBand />
    </>
  );
}
