import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import { products, type ProductSlug } from "@/lib/products";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "Apply for a loan",
  description: "Apply for a NANAM loan online in about five minutes. Most decisions within 24 hours.",
};

function clamp(n: number, min: number, max: number, fallback: number) {
  return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(min, n)) : fallback;
}

export default async function ApplyPage({ searchParams }: PageProps<"/apply">) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const slug = one("product");
  const product = (products.some((p) => p.slug === slug) ? slug : "logbook") as ProductSlug;

  return (
    <>
      <PageHero
        eyebrow="Apply online"
        title={
          <>
            Five minutes now. <em className="text-lime-400">A decision in 24 hours.</em>
          </>
        }
        body="Complete the form to begin. We will verify your details and get back to you within 24 hours."
      />
      <section className="container-page -mt-10 pb-24 md:-mt-14">
        <ApplyForm
          initial={{
            product,
            amount: clamp(Number(one("amount")), 2_000_000, 100_000_000, 10_000_000),
            months: clamp(Number(one("months")), 1, 6, 3),
            referral: one("ref") || undefined,
          }}
        />
      </section>
    </>
  );
}
