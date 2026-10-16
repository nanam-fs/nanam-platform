import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { CarIcon, ClockIcon, ContractIcon, IconStage, IdScanIcon, LandIcon, PhoneMoneyIcon, ShieldIcon, ShopIcon } from "@/components/animated-icons";
import { CtaBand, FaqList } from "@/components/blocks";
import { HeroCards } from "@/components/home/hero-cards";
import { PhoneShowcase } from "@/components/home/phone-showcase";
import { Testimonials } from "@/components/home/testimonials";
import { LoanCalculator } from "@/components/loan-calculator";
import { Counter, Marquee, ParallaxImage, Reveal, RevealGroup, RevealItem, ScrollLine } from "@/components/motion-kit";
import { ButtonLink, Eyebrow, SectionHeading } from "@/components/ui";
import { steps, testimonials } from "@/lib/content";
import { quote } from "@/lib/loan-math";
import { photos } from "@/lib/photos";
import { products, type ProductSlug } from "@/lib/products";
import { site } from "@/lib/site";
import { compactUGX, formatUGX } from "@/lib/utils";

const example = quote(10_000_000, 3);

const productVisual: Record<ProductSlug, { Icon: typeof CarIcon; photo: (typeof photos)[keyof typeof photos] }> = {
  logbook: { Icon: CarIcon, photo: photos.logbook },
  business: { Icon: ShopIcon, photo: photos.business },
  "asset-finance": { Icon: LandIcon, photo: photos.land },
  "contract-finance": { Icon: ContractIcon, photo: photos.contract },
};

const journey = [
  { Icon: ContractIcon, ...steps[0] },
  { Icon: IdScanIcon, title: "Confirm it’s you", body: "Verify your phone by SMS, then your National ID and a selfie. Most identity checks finish in seconds." },
  { Icon: ClockIcon, title: steps[1].title, body: steps[1].body },
  { Icon: PhoneMoneyIcon, title: "Funds, then easy repayments", body: "Sign your agreement and receive your money. Repay from your phone with MTN MoMo or Airtel Money." },
];

export default function Home() {
  const years = new Date().getFullYear() - site.founded;
  return (
    <>
      {/* ───────── Hero: a real place, the real product ───────── */}
      <section className="relative isolate overflow-hidden bg-forest-950 text-white">
        {/* On tall phone screens, crop to the left of the street so third-party billboards stay out of frame. */}
        <Image src={photos.hero.src} alt={photos.hero.alt} fill priority sizes="100vw" className="-z-20 object-cover opacity-50 max-sm:object-[0%_100%]! max-sm:opacity-35" style={{ objectPosition: photos.hero.position }} />
        <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-forest-950 via-forest-950/90 to-forest-950/40" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-t from-forest-950 to-transparent" />
        <div className="container-page grid items-center gap-14 pt-32 pb-20 md:pt-40 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-28">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-forest-950/50 py-1.5 pr-4 pl-1.5 text-sm text-white/85 backdrop-blur">
                <span className="grid size-6 place-items-center rounded-full bg-lime-500 text-forest-950">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                Licensed by {site.regulator.short} · lending since {site.founded}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-7 font-display text-[3.2rem] leading-[0.92] text-balance sm:text-7xl xl:text-[5.6rem]">
                Unlock the value of what you <span className="text-lime-400">already own.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-7 max-w-xl text-lg text-white/75 text-pretty md:text-xl">
                Borrow UGX 2M to 100M against your logbook, land title or confirmed contract. Clear pricing, no hidden fees, and a decision within 24 hours.
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-wrap gap-3">
                <ButtonLink href="/apply" variant="lime" className="h-12 px-6">
                  Apply in minutes <ArrowRight className="size-4" />
                </ButtonLink>
                <ButtonLink href="/loans" variant="light" className="h-12 px-6">
                  Explore loans
                </ButtonLink>
              </div>
            </Reveal>
            <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
              <div>
                <dd className="font-display text-4xl tabular">
                  <Counter value={24} />h
                </dd>
                <dt className="mt-1 text-sm text-white/55">Typical decision</dt>
              </div>
              <div>
                <dd className="font-display text-4xl tabular">
                  <Counter value={site.pricing.monthlyRate} decimals={1} />%
                </dd>
                <dt className="mt-1 text-sm text-white/55">Monthly rate</dt>
              </div>
              <div>
                <dd className="font-display text-4xl tabular">
                  <Counter value={years} />+
                </dd>
                <dt className="mt-1 text-sm text-white/55">Years in Uganda</dt>
              </div>
            </dl>
          </div>
          <Reveal delay={0.2} className="relative">
            <LoanCalculator variant="glass" />
            <HeroCards />
          </Reveal>
        </div>
      </section>

      {/* ───────── Trust marquee ───────── */}
      <section aria-label="Why NANAM" className="border-b border-line bg-white py-5">
        <Marquee
          className="text-[0.95rem] text-ink/80"
          items={[
            <span key="1">Licensed by the Uganda Microfinance Regulatory Authority</span>,
            <span key="2">2.8% a month: the legal maximum, never more</span>,
            <span key="3">Logbook &amp; land title accepted</span>,
            <span key="4">Mobile Money statements accepted</span>,
            <span key="5">Repay with MTN MoMo or Airtel Money</span>,
            <span key="6">Early repayment welcome</span>,
            <span key="7">NANAM House, Namugongo</span>,
          ]}
        />
      </section>

      {/* ───────── Products: cards that stack as you scroll ───────── */}
      <section className="container-page pt-24 md:pt-32">
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
        <div className="mt-14 space-y-6 pb-24 md:pb-32">
          {products.map((p, i) => {
            const { Icon, photo } = productVisual[p.slug];
            return (
              <div key={p.slug} className="md:sticky" style={{ top: `calc(6.5rem + ${i * 1.25}rem)` }}>
                <IconStage as="article" className="group grid overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_-16px_40px_-24px_rgb(3_26_15/0.35)] md:grid-cols-[1.1fr_1fr]">
                  <div className="flex flex-col p-8 md:p-12">
                    <div className="flex items-center gap-4">
                      <span className="grid size-14 place-items-center rounded-2xl bg-forest-950 text-white transition-colors duration-300 group-hover:bg-forest-600">
                        <Icon className="size-8" />
                      </span>
                      <span className="text-sm font-medium text-muted tabular">
                        0{i + 1} / 0{products.length}
                      </span>
                    </div>
                    <h3 className="mt-8 font-display text-4xl text-forest-950 md:text-5xl">{p.name}</h3>
                    <p className="mt-3 max-w-md text-lg text-muted">{p.headline}</p>
                    <dl className="mt-8 grid grid-cols-3 gap-4 border-y border-line py-5 text-sm">
                      <div>
                        <dt className="text-muted">Amount</dt>
                        <dd className="mt-1 font-semibold tabular">
                          UGX {compactUGX(p.minAmount)}–{compactUGX(p.maxAmount)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">Term</dt>
                        <dd className="mt-1 font-semibold tabular">
                          {p.minMonths}–{p.maxMonths} months
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted">Rate</dt>
                        <dd className="mt-1 font-semibold tabular">{site.pricing.monthlyRate}% / mo</dd>
                      </div>
                    </dl>
                    <ul className="mt-6 space-y-2 text-sm text-ink/80">
                      {p.requirements.slice(0, 3).map((r) => (
                        <li key={r} className="flex gap-2.5">
                          <Check className="mt-0.5 size-4 shrink-0 text-lime-600" /> {r}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-auto flex flex-wrap gap-3 pt-8">
                      <ButtonLink href={`/apply?product=${p.slug}`}>Apply now</ButtonLink>
                      <ButtonLink href={`/loans/${p.slug}`} variant="outline">
                        Details <ArrowUpRight className="size-4" />
                      </ButtonLink>
                    </div>
                  </div>
                  <div className="relative min-h-64 md:min-h-full">
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="(min-width: 768px) 45vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      style={{ objectPosition: photo.position }}
                    />
                    <div aria-hidden className="absolute inset-0 bg-linear-to-t from-forest-950/55 via-transparent to-transparent" />
                    <p className="absolute bottom-4 left-5 text-xs text-white/85">{photo.alt}</p>
                  </div>
                </IconStage>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────── The full cost, upfront ───────── */}
      <section className="overflow-x-clip bg-sand/60">
        <div className="container-page grid items-center gap-16 py-24 md:py-32 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Radical transparency"
              title={
                <>
                  The full cost, <em>before</em> you commit.
                </>
              }
              body={`We charge ${site.pricing.monthlyRate}% a month, the maximum rate permitted for licensed lenders in Uganda, plus a one-off ${site.pricing.processingFee}% processing fee. That’s it.`}
            />
            <RevealGroup className="mt-10 space-y-6">
              {[
                { Icon: ContractIcon, t: "Itemised offer", b: "Interest, fees and every instalment are listed before you sign." },
                { Icon: ClockIcon, t: "Repay early, any time", b: "Settle ahead of schedule and future interest is not charged." },
                { Icon: ShieldIcon, t: "Regulated & accountable", b: `Licensed and supervised by ${site.regulator.short} under Ugandan law.` },
              ].map(({ Icon, t, b }) => (
                <RevealItem key={t}>
                  <IconStage className="flex gap-5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-forest-700 shadow-sm">
                      <Icon className="size-7" />
                    </span>
                    <div>
                      <p className="font-semibold text-forest-950">{t}</p>
                      <p className="mt-1 text-muted">{b}</p>
                    </div>
                  </IconStage>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
          <Reveal>
            <figure className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-6 -rotate-3 rounded-[2rem] bg-forest-600/10" aria-hidden />
              <div className="relative rounded-[1.75rem] border border-line bg-white p-8 shadow-2xl shadow-forest-950/10">
                <div className="flex items-center justify-between">
                  <Image src="/brand/logo.svg" alt="" width={613} height={136} className="h-7 w-auto" />
                  <span className="rounded-full bg-forest-50 px-3 py-1 text-xs font-medium text-forest-700">Sample offer</span>
                </div>
                <p className="mt-8 text-sm text-muted">Logbook Loan · 3 months · loan amount</p>
                <p className="mt-1 font-display text-5xl text-forest-950 tabular">
                  UGX <Counter value={example.principal} />
                </p>
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
                    <dt className="text-muted">Hidden charges</dt>
                    <dd className="font-semibold text-forest-600">UGX 0</dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-4 text-base font-semibold text-forest-950">
                    <dt>Total repayable</dt>
                    <dd>{formatUGX(example.totalRepayable)}</dd>
                  </div>
                </dl>
                <figcaption className="mt-6 text-xs text-muted">Illustrative example. Your offer depends on verification.</figcaption>
              </div>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ───────── How it works: scroll-linked timeline ───────── */}
      <section className="container-page grid gap-14 py-24 md:py-32 lg:grid-cols-[1fr_1.3fr]">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            eyebrow="How it works"
            title={
              <>
                From application to funds <em>in four steps.</em>
              </>
            }
            body="No queues and no paperwork marathons. Most clients go from first click to a decision within a day."
          />
          <ButtonLink href="/apply" className="mt-8 h-12 px-6">
            Start your application <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
        <ol className="relative space-y-6 pl-10 md:pl-14">
          <ScrollLine className="left-[1.2rem] md:left-[1.7rem]" />
          {journey.map(({ Icon, title, body }, i) => (
            <IconStage as="li" key={title} className="relative rounded-3xl border border-line bg-white p-7 md:p-8">
              <span className="absolute top-8 -left-10 grid size-10 -translate-x-1/2 place-items-center rounded-full border-4 border-cream bg-forest-950 text-xs font-semibold text-lime-400 md:-left-14 md:size-11">
                {i + 1}
              </span>
              <Icon className="size-9 text-forest-700" />
              <h3 className="mt-5 font-display text-2xl text-forest-950">{title}</h3>
              <p className="mt-2 text-muted">{body}</p>
            </IconStage>
          ))}
        </ol>
      </section>

      {/* ───────── Product showcase ───────── */}
      <section className="surface-forest overflow-hidden text-white">
        <div className="container-page grid items-center gap-16 py-24 md:py-32 lg:grid-cols-2">
          <div>
            <SectionHeading
              dark
              eyebrow="Customer portal"
              title={
                <>
                  Your loan, <span className="text-lime-400">in your pocket.</span>
                </>
              }
              body="Sign in with a code sent to your phone. No passwords, and no branch visits for routine things."
            />
            <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {[
                { Icon: PhoneMoneyIcon, t: "Pay with Mobile Money", b: "Approve with your PIN on your phone; receipts by SMS." },
                { Icon: ContractIcon, t: "Statements on demand", b: "Download a full loan statement any time." },
                { Icon: ClockIcon, t: "Reminders before due dates", b: "Polite SMS reminders so you never miss a payment." },
                { Icon: IdScanIcon, t: "Upload documents", b: "Add or replace documents straight from your phone." },
              ].map(({ Icon, t, b }) => (
                <IconStage as="li" key={t} className="flex gap-4">
                  <Icon className="size-8 shrink-0 text-lime-400" />
                  <div>
                    <p className="font-semibold">{t}</p>
                    <p className="mt-1 text-sm text-white/60">{b}</p>
                  </div>
                </IconStage>
              ))}
            </ul>
            <ButtonLink href="/portal" variant="lime" className="mt-10 h-12 px-6">
              Sign in to your account <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
          <Reveal y={30}>
            <PhoneShowcase />
          </Reveal>
        </div>
      </section>

      {/* ───────── Client stories ───────── */}
      <section className="bg-forest-950 text-white">
        <div className="container-page grid gap-12 py-24 md:py-32 lg:grid-cols-[0.6fr_1.4fr]">
          <Eyebrow className="text-lime-400 [&>span]:bg-lime-400">Client stories</Eyebrow>
          <Testimonials items={testimonials} />
        </div>
      </section>

      {/* ───────── Partners ───────── */}
      <section className="container-page py-24 md:py-32">
        <div className="grid overflow-hidden rounded-[2rem] bg-peach-200 lg:grid-cols-[1.2fr_1fr]">
          <div className="p-8 md:p-14">
            <Eyebrow className="text-forest-800">NANAM Partner Network</Eyebrow>
            <h2 className="mt-4 font-display text-4xl leading-[1] text-forest-950 text-balance md:text-[3.4rem]">
              Refer clients. <em>Earn commission.</em>
            </h2>
            <p className="mt-4 max-w-lg text-lg text-forest-950/70">
              Agent banking outlets, SACCOs, MoMo agents, forex bureaus, employers and individual referrers earn on every funded referral, paid to bank or Mobile Money.
            </p>
            <ButtonLink href="/partners" className="mt-8 h-12 bg-forest-950 px-6 hover:bg-forest-900">
              Become a partner <ArrowRight className="size-4" />
            </ButtonLink>
          </div>
          <ParallaxImage src={photos.business.src} alt={photos.business.alt} position={photos.business.position} className="min-h-72" sizes="(min-width: 1024px) 40vw, 100vw" />
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="container-page grid gap-12 pb-8 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <SectionHeading eyebrow="Questions" title={<>Straight answers, <em>no jargon.</em></>} />
          <ButtonLink href="/faq" variant="outline" className="mt-8">
            All FAQs <ArrowRight className="size-4" />
          </ButtonLink>
          <p className="mt-6 text-sm text-muted">
            Or ask our assistant in the corner of the screen. Prefer a person?{" "}
            <Link href="/contact" className="text-forest-700 underline">
              Contact us
            </Link>
            .
          </p>
        </div>
        <FaqList limit={5} />
      </section>

      <CtaBand />
    </>
  );
}
