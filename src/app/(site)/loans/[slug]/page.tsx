import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { photos } from "@/lib/photos";
import { ArrowRight, Check } from "lucide-react";
import { CtaBand, ProductCard, productIcons } from "@/components/blocks";
import { LoanCalculator } from "@/components/loan-calculator";
import { ButtonLink, Eyebrow, SectionHeading } from "@/components/ui";
import { generalRequirements, getProduct, products } from "@/lib/products";
import { site } from "@/lib/site";
import { compactUGX } from "@/lib/utils";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/loans/[slug]">): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return {};
  return { title: product.name, description: product.summary };
}

export default async function ProductPage({ params }: PageProps<"/loans/[slug]">) {
  const product = getProduct((await params).slug);
  if (!product) notFound();
  const Icon = productIcons[product.slug];
  const photo = { logbook: photos.logbook, business: photos.business, "asset-finance": photos.land, "contract-finance": photos.contract }[product.slug];
  const others = products.filter((p) => p.slug !== product.slug);

  return (
    <>
      <section className="surface-forest relative isolate overflow-hidden text-white">
        <Image src={photo.src} alt={photo.alt} fill priority sizes="100vw" className="-z-20 object-cover opacity-40" style={{ objectPosition: photo.position }} />
        <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-forest-950 via-forest-950/90 to-forest-950/50" />
        <div className="container-page grid items-start gap-14 pt-32 pb-20 md:pt-40 lg:grid-cols-[1.1fr_1fr] lg:gap-20 lg:pb-28">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-lime-500 text-forest-950">
                <Icon className="size-5" />
              </span>
              <Eyebrow className="text-lime-400">{product.name}</Eyebrow>
            </div>
            <h1 className="mt-7 font-display text-5xl leading-[1.02] tracking-tight text-balance md:text-7xl">{product.headline}</h1>
            <p className="mt-6 max-w-xl text-lg text-white/70">{product.summary}</p>

            <dl className="mt-10 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
              {[
                { k: "Amount", v: `${compactUGX(product.minAmount)}–${compactUGX(product.maxAmount)}` },
                { k: "Term", v: `${product.minMonths}–${product.maxMonths} mo` },
                { k: "Rate", v: `${site.pricing.monthlyRate}%/mo` },
                { k: "Decision", v: "24 hrs" },
              ].map((s) => (
                <div key={s.k} className="bg-forest-950/60 p-4">
                  <dt className="text-xs text-white/50">{s.k}</dt>
                  <dd className="mt-1 font-medium tabular">{s.v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-sm text-white/60">
              <span className="text-white/90">Security:</span> {product.security}
            </p>
          </div>
          <LoanCalculator variant="glass" defaultProduct={product.slug} />
        </div>
      </section>

      <section className="container-page py-24">
        <div className="grid gap-5 md:grid-cols-3">
          {product.highlights.map((h) => (
            <div key={h.title} className="rounded-3xl border border-line bg-white p-8">
              <span className="block h-1 w-10 rounded-full bg-lime-500" />
              <h3 className="mt-6 text-xl font-medium text-forest-950">{h.title}</h3>
              <p className="mt-3 text-muted">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-sand/60">
        <div className="container-page grid gap-14 py-24 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Requirements" title={<>What you’ll <em>need.</em></>} />
            <ul className="mt-8 space-y-4">
              {[...product.requirements, ...generalRequirements].map((r) => (
                <li key={r} className="flex gap-3 rounded-2xl bg-white p-4">
                  <Check className="mt-0.5 size-5 shrink-0 text-forest-600" /> {r}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeading eyebrow="Ideal for" title={<>Who it’s <em>built for.</em></>} />
            <ul className="mt-8 flex flex-wrap gap-3">
              {product.bestFor.map((b) => (
                <li key={b} className="rounded-full border border-forest-600/20 bg-white px-5 py-2.5 text-forest-800">
                  {b}
                </li>
              ))}
            </ul>
            <div className="mt-12 rounded-3xl bg-forest-950 p-8 text-white">
              <p className="font-display text-3xl">Ready to apply?</p>
              <p className="mt-2 text-white/65">It takes about five minutes. Have your ID and statement ready.</p>
              <ButtonLink href={`/apply?product=${product.slug}`} variant="lime" className="mt-6">
                Apply for a {product.name} <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-24">
        <SectionHeading eyebrow="Also consider" title={<>Other NANAM <em>loans.</em></>} />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {others.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
