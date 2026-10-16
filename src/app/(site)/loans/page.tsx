import type { Metadata } from "next";
import { Check } from "lucide-react";
import { CtaBand, ProductCard } from "@/components/blocks";
import { PageHero, SectionHeading } from "@/components/ui";
import { commonRequirements, products } from "@/lib/products";
import { site } from "@/lib/site";
import { compactUGX } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Loans",
  description:
    "Compare NANAM logbook loans, business loans, asset finance and contract (LPO) finance. UGX 2M–100M over 1–6 months, decided within 24 hours.",
};

export default function LoansPage() {
  return (
    <>
      <PageHero
        eyebrow="Loan products"
        title={
          <>
            Secured loans, <em className="text-lime-400">priced plainly.</em>
          </>
        }
        body={`Every product shares the same simple pricing: ${site.pricing.monthlyRate}% per month and a one-off ${site.pricing.processingFee}% processing fee. Choose the one that matches your security and your goal.`}
      />

      <section className="container-page py-20 md:py-28">
        <div className="grid gap-5 md:grid-cols-2">
          {products.map((p, i) => (
            <ProductCard key={p.slug} product={p} featured={i === 0} />
          ))}
        </div>
      </section>

      <section className="container-page pb-24">
        <SectionHeading eyebrow="Side by side" title={<>Compare <em>at a glance.</em></>} />
        <div className="mt-10 overflow-x-auto rounded-3xl border border-line bg-white">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-cream/60 text-xs uppercase tracking-wider text-muted">
                <th className="p-5 font-medium">Product</th>
                <th className="p-5 font-medium">Security</th>
                <th className="p-5 font-medium">Amount</th>
                <th className="p-5 font-medium">Term</th>
                <th className="p-5 font-medium">Monthly rate</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.slug} className="border-b border-line last:border-0">
                  <td className="p-5 font-medium text-forest-950">{p.name}</td>
                  <td className="p-5 text-muted">{p.security}</td>
                  <td className="p-5 tabular">
                    UGX {compactUGX(p.minAmount)} – {compactUGX(p.maxAmount)}
                  </td>
                  <td className="p-5 tabular">
                    {p.minMonths}–{p.maxMonths} months
                  </td>
                  <td className="p-5 tabular">{site.pricing.monthlyRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 rounded-3xl bg-sand/60 p-8 md:p-10">
          <h3 className="font-display text-3xl text-forest-950">What every application needs</h3>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {commonRequirements.map((r) => (
              <li key={r} className="flex gap-3">
                <Check className="mt-0.5 size-5 shrink-0 text-forest-600" /> {r}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
