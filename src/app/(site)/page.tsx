import Image from "next/image";
import { ArrowRight, BadgeCheck, Clock3, Quote, ReceiptText, ShieldCheck, Sparkles } from "lucide-react";
import { CtaBand, FaqList, ProductCard } from "@/components/blocks";
import { LoanCalculator } from "@/components/loan-calculator";
import { ButtonLink, Eyebrow, SectionHeading } from "@/components/ui";
import { steps, testimonials } from "@/lib/content";
import { quote } from "@/lib/loan-math";
import { products } from "@/lib/products";
import { site } from "@/lib/site";
import { formatUGX } from "@/lib/utils";

const example = quote(10_000_000, 3);

export default function Home() {
  const years = new Date().getFullYear() - site.founded;
  return (
    <>
      {/* Hero */}
      <section className="surface-forest relative overflow-hidden text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        />
        <div className="container-page relative grid items-center gap-14 pt-32 pb-20 md:pt-40 lg:grid-cols-[1.15fr_1fr] lg:gap-20 lg:pb-28">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80">
              <ShieldCheck className="size-3.5 text-lime-400" /> Licensed by {site.regulator.short} · Lending in Uganda since{" "}
              {site.founded}
            </p>
            <h1 className="mt-7 font-display text-[3.25rem] leading-[0.98] tracking-tight text-balance sm:text-7xl xl:text-[5.5rem]">
              Unlock the value of what you <em className="text-lime-400">already own.</em>
            </h1>
            <p className="mt-7 max-w-xl text-lg text-white/70 text-pretty md:text-xl">
              Borrow UGX 2M to 100M against your logbook, land title or confirmed contract. Clear pricing, no hidden fees and a
              decision within 24 hours.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/apply" variant="lime" className="h-12 px-6">
                Apply in minutes <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink href="/loans" variant="light" className="h-12 px-6">
                Explore loans
              </ButtonLink>
            </div>
            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
              {[
                { k: "24h", v: "Typical decision" },
                { k: `${site.pricing.monthlyRate}%`, v: "Monthly rate" },
                { k: `${years}+ yrs`, v: "Serving Uganda" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="sr-only">{s.v}</dt>
                  <dd className="font-display text-4xl text-white tabular">{s.k}</dd>
                  <dd className="mt-1 text-sm text-white/55">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="animate-fade-up [animation-delay:150ms]">
            <LoanCalculator variant="glass" />
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-line bg-white">
        <div className="container-page flex flex-col items-center justify-between gap-6 py-8 md:flex-row">
          <div className="flex items-center gap-4">
            <Image src="/brand/umra.png" alt="Uganda Microfinance Regulatory Authority" width={1024} height={324} className="h-9 w-auto" />
            <p className="max-w-md text-sm text-muted">
              Regulated under the <span className="text-ink">{site.regulator.act}</span>.
            </p>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-ink/80">
            {["Logbook & land title accepted", "Mobile Money statements accepted", "Early repayment welcome"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-forest-600" /> {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Products */}
      <section className="container-page py-24 md:py-32">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Loan products"
            title={
              <>
                Four ways to fund <em>your next move.</em>
              </>
            }
            body="Every NANAM loan is secured, short-term and priced the same way, so you always know where you stand."
          />
          <ButtonLink href="/loans" variant="outline">
            Compare all loans <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:row-span-2 lg:[&>a]:h-full">
            <ProductCard product={products[0]} featured />
          </div>
          {products.slice(1).map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
          <div className="flex flex-col justify-between rounded-3xl bg-lime-500 p-7 text-forest-950 md:p-8">
            <Sparkles className="size-7" strokeWidth={1.6} />
            <div className="mt-10">
              <p className="font-display text-3xl leading-tight">Not sure which loan fits?</p>
              <p className="mt-2 text-forest-950/75">Tell us what you need it for and we’ll recommend the right product.</p>
              <ButtonLink href="/contact" className="mt-6 bg-forest-950 hover:bg-forest-900">
                Talk to an advisor
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* Transparency */}
      <section className="bg-sand/60">
        <div className="container-page grid items-center gap-16 py-24 md:py-32 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Radical transparency"
              title={
                <>
                  The full cost, <em>before</em> you commit.
                </>
              }
              body={`We charge ${site.pricing.monthlyRate}% a month, the maximum rate permitted for licensed lenders in Uganda, plus a one-off ${site.pricing.processingFee}% processing fee. That’s it. No penalties hidden in the fine print, no surprise deductions.`}
            />
            <ul className="mt-10 space-y-5">
              {[
                { icon: ReceiptText, t: "Itemised offer", b: "Interest, fees and every instalment are listed before you sign." },
                { icon: Clock3, t: "Repay early, any time", b: "Early repayment is welcome. Ask your loan officer for a settlement figure." },
                { icon: ShieldCheck, t: "Regulated & accountable", b: `Licensed and supervised by ${site.regulator.short} under Ugandan law.` },
              ].map(({ icon: Icon, t, b }) => (
                <li key={t} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-forest-600 shadow-sm">
                    <Icon className="size-5" strokeWidth={1.7} />
                  </span>
                  <div>
                    <p className="font-medium text-forest-950">{t}</p>
                    <p className="mt-1 text-muted">{b}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <figure className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-6 -rotate-3 rounded-[2rem] bg-forest-600/10" aria-hidden />
            <div className="relative rounded-[1.75rem] border border-line bg-white p-8 shadow-2xl shadow-forest-950/10">
              <div className="flex items-center justify-between">
                <Image src="/brand/logo.svg" alt="" width={613} height={136} className="h-7 w-auto" />
                <span className="rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-700">Sample offer</span>
              </div>
              <p className="mt-8 text-sm text-muted">Logbook Loan · 3 months · loan amount</p>
              <p className="mt-1 font-display text-5xl text-forest-950 tabular">{formatUGX(example.principal)}</p>
              <dl className="mt-8 space-y-3 text-sm tabular">
                {example.schedule.map((r) => (
                  <div key={r.month} className="flex justify-between">
                    <dt className="text-muted">Instalment {r.month}</dt>
                    <dd>{formatUGX(r.payment)}</dd>
                  </div>
                ))}
                <div className="flex justify-between border-t border-dashed border-line pt-3">
                  <dt className="text-muted">Processing fee ({site.pricing.processingFee}%, deducted)</dt>
                  <dd>− {formatUGX(example.processingFee)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">You receive</dt>
                  <dd>{formatUGX(example.netDisbursed)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Total interest</dt>
                  <dd>{formatUGX(example.totalInterest)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Hidden charges</dt>
                  <dd className="font-medium text-forest-600">UGX 0</dd>
                </div>
                <div className="flex justify-between border-t border-line pt-4 text-base font-semibold text-forest-950">
                  <dt>Total repayable</dt>
                  <dd>{formatUGX(example.totalRepayable)}</dd>
                </div>
              </dl>
              <figcaption className="mt-6 text-xs text-muted">Illustrative example. Your offer depends on verification.</figcaption>
            </div>
          </figure>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-24 md:py-32">
        <SectionHeading
          align="center"
          eyebrow="How it works"
          title={
            <>
              From application to funds <em>in three steps.</em>
            </>
          }
        />
        <ol className="mt-16 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-3xl border border-line bg-white p-8">
              <span className="font-display text-7xl leading-none text-lime-500">0{i + 1}</span>
              <h3 className="mt-8 text-xl font-medium text-forest-950">{s.title}</h3>
              <p className="mt-3 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 text-center">
          <ButtonLink href="/apply" className="h-12 px-6">
            Start your application <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </section>

      {/* Testimonials */}
      <section className="surface-forest text-white">
        <div className="container-page py-24 md:py-32">
          <SectionHeading dark eyebrow="Client stories" title={<>Trusted by clients <em className="text-lime-400">across Uganda.</em></>} />
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-8">
                <Quote className="size-8 text-lime-400" strokeWidth={1.5} />
                <blockquote className="mt-6 font-display text-2xl leading-snug text-white/95">“{t.quote}”</blockquote>
                <figcaption className="mt-10 flex items-center gap-3 border-t border-white/10 pt-6">
                  <span className="grid size-10 place-items-center rounded-full bg-peach-400 font-medium text-forest-950">{t.name[0]}</span>
                  <span>
                    <span className="block font-medium">{t.name}</span>
                    <span className="block text-sm text-white/55">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="container-page py-24 md:py-32">
        <div className="grid items-center gap-12 overflow-hidden rounded-[2rem] bg-peach-200 p-8 md:p-14 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <Eyebrow className="text-forest-800">NANAM Partner Network</Eyebrow>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] text-forest-950 text-balance md:text-5xl">
              Refer clients. <em>Earn commission.</em>
            </h2>
            <p className="mt-4 max-w-lg text-lg text-forest-950/70">
              Agent banking outlets, SACCOs, MoMo agents, forex bureaus, employers and individual referrers can partner with NANAM
              and get paid for every funded referral.
            </p>
            <ButtonLink href="/partners" className="mt-8 h-12 px-6 bg-forest-950 hover:bg-forest-900">
              Become a partner <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
          <ul className="grid gap-3 text-forest-950">
            {[
              { t: "B2B partners", b: "Agent banking, SACCOs, forex bureaus, MoMo super-agents, employers." },
              { t: "Individual agents", b: "Freelance marketers, MoMo vendors, retailers, community referrers." },
              { t: "Paid your way", b: "Commission straight to your bank account or Mobile Money." },
            ].map((i) => (
              <li key={i.t} className="rounded-2xl bg-white/70 p-5 backdrop-blur">
                <p className="font-medium">{i.t}</p>
                <p className="mt-1 text-sm text-forest-950/65">{i.b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page grid gap-12 pb-8 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <SectionHeading eyebrow="Questions" title={<>Straight answers, <em>no jargon.</em></>} />
          <ButtonLink href="/faq" variant="outline" className="mt-8">
            All FAQs <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        <FaqList limit={5} />
      </section>

      <CtaBand />
    </>
  );
}
