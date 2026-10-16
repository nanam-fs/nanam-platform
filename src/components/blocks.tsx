import { ArrowRight, BriefcaseBusiness, Car, FileText, LandPlot, Plus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { faqs } from "@/lib/content";
import type { Product, ProductSlug } from "@/lib/products";
import { whatsappUrl } from "@/lib/site";
import { cn, compactUGX } from "@/lib/utils";
import { ButtonLink } from "./ui";

export const productIcons: Record<ProductSlug, LucideIcon> = {
  logbook: Car,
  business: BriefcaseBusiness,
  "asset-finance": LandPlot,
  "contract-finance": FileText,
};

export function ProductCard({ product, featured }: { product: Product; featured?: boolean }) {
  const Icon = productIcons[product.slug];
  return (
    <Link
      href={`/loans/${product.slug}`}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1 md:p-8",
        featured
          ? "surface-forest border-forest-800 text-white hover:shadow-2xl hover:shadow-forest-950/30"
          : "border-line bg-white hover:border-forest-600/30 hover:shadow-xl hover:shadow-forest-950/5",
      )}
    >
      <div>
        <div
          className={cn(
            "grid size-12 place-items-center rounded-2xl",
            featured ? "bg-lime-500 text-forest-950" : "bg-forest-50 text-forest-600",
          )}
        >
          <Icon className="size-6" strokeWidth={1.6} />
        </div>
        <h3 className={cn("mt-8 font-display text-3xl", featured ? "text-white" : "text-forest-950")}>{product.name}</h3>
        <p className={cn("mt-3 max-w-sm text-pretty", featured ? "text-white/70" : "text-muted")}>{product.short}</p>
        {featured && (
          <ul className="mt-10 space-y-5">
            {product.highlights.map((h) => (
              <li key={h.title} className="border-l-2 border-lime-500/60 pl-4">
                <p className="font-medium text-white">{h.title}</p>
                <p className="mt-1 text-sm text-white/60">{h.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={cn("mt-10 flex items-end justify-between border-t pt-5", featured ? "border-white/10" : "border-line")}>
        <dl className="flex gap-8 text-sm">
          <div>
            <dt className={featured ? "text-white/50" : "text-muted"}>Amount</dt>
            <dd className="mt-1 font-medium tabular">
              UGX {compactUGX(product.minAmount)}–{compactUGX(product.maxAmount)}
            </dd>
          </div>
          <div>
            <dt className={featured ? "text-white/50" : "text-muted"}>Term</dt>
            <dd className="mt-1 font-medium tabular">
              {product.minMonths}–{product.maxMonths} months
            </dd>
          </div>
        </dl>
        <span
          className={cn(
            "grid size-10 place-items-center rounded-full transition-transform group-hover:translate-x-1",
            featured ? "bg-white text-forest-950" : "bg-forest-600 text-white",
          )}
        >
          <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

export function FaqList({ limit, items = faqs }: { limit?: number; items?: typeof faqs }) {
  const list = limit ? items.slice(0, limit) : items;
  return (
    <div className="divide-y divide-line border-y border-line">
      {list.map((f) => (
        <details key={f.q} className="group py-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-medium text-forest-950">
            {f.q}
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line transition-transform group-open:rotate-45 group-open:bg-forest-600 group-open:text-white">
              <Plus className="size-4" />
            </span>
          </summary>
          <p className="mt-4 max-w-3xl text-muted text-pretty">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand() {
  return (
    <section className="container-page py-24">
      <div className="surface-forest relative overflow-hidden rounded-[2rem] px-8 py-16 text-white md:px-16 md:py-20">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -top-8 -right-8 size-64 rounded-full border border-lime-500/20" />
        <div className="relative grid items-end gap-10 md:grid-cols-[1.5fr_1fr]">
          <div>
            <h2 className="font-display text-4xl leading-[1.05] text-balance md:text-6xl">
              Ready when you are. <em className="text-lime-400">Funded in 24 hours.</em>
            </h2>
            <p className="mt-5 max-w-xl text-lg text-white/70">
              Start online in minutes. We verify your details and get back to you within 24 hours.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <ButtonLink href="/apply" variant="lime" className="h-12 px-6">
              Start application <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href={whatsappUrl("Hello NANAM, I'd like to apply for a loan.")} variant="light" className="h-12 px-6">
              Chat on WhatsApp
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
