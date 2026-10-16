import type { Metadata } from "next";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { CtaBand } from "@/components/blocks";
import { ButtonLink, PageHero, SectionHeading } from "@/components/ui";
import { values } from "@/lib/content";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `${site.name} (${site.abbreviation}) is a licensed Ugandan microfinance lender regulated by UMRA, providing reliable and sustainable financial solutions since ${site.founded}.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow={`About ${site.abbreviation}`}
        title={
          <>
            Rooted in Namugongo. <em className="text-lime-400">Growing with Uganda.</em>
          </>
        }
        body={`A licensed Ugandan microfinance company committed to providing reliable and sustainable financial solutions since ${site.founded}.`}
      />

      <section className="container-page grid gap-16 py-24 md:py-32 lg:grid-cols-2">
        <div className="space-y-6 text-lg text-muted">
          <p className="font-display text-3xl leading-snug text-forest-950">
            {site.name} serves clients across the Republic of Uganda with secured, short-term credit that helps people and
            businesses move forward.
          </p>
          <p>
            Over the years we have built a working system that keeps every day-to-day operation in line with the{" "}
            <span className="text-ink">{site.regulator.act}</span>, and we are licensed and supervised by the{" "}
            {site.regulator.name}.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-3xl bg-forest-950 p-8 text-white sm:col-span-2">
            <p className="text-xs uppercase tracking-[0.16em] text-lime-400">Mission</p>
            <p className="mt-4 font-display text-3xl leading-snug">{site.mission}</p>
          </div>
          <div className="rounded-3xl bg-lime-500 p-8 text-forest-950">
            <p className="text-xs uppercase tracking-[0.16em]">Vision</p>
            <p className="mt-4 font-display text-2xl leading-snug">{site.vision}</p>
          </div>
          <div className="flex flex-col justify-between rounded-3xl border border-line bg-white p-8">
            <Image src="/brand/umra.png" alt="UMRA" width={1024} height={324} className="h-10 w-auto self-start" />
            <p className="mt-6 text-sm text-muted">Licensed by the Uganda Microfinance Regulatory Authority.</p>
          </div>
        </div>
      </section>

      <section className="bg-sand/60">
        <div className="container-page py-24 md:py-32">
          <SectionHeading eyebrow="Our values" title={<>The principles behind <em>every loan.</em></>} />
          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-5">
            {values.map((v, i) => (
              <div key={v.title} className="bg-white p-7">
                <span className="font-display text-xl text-lime-600">0{i + 1}</span>
                <h3 className="mt-6 text-lg font-medium text-forest-950">{v.title}</h3>
                <p className="mt-2 text-sm text-muted">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-24">
        <div className="grid items-center gap-10 rounded-3xl border border-line bg-white p-8 md:grid-cols-[1fr_auto] md:p-12">
          <div className="flex gap-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-forest-50 text-forest-600">
              <MapPin className="size-6" />
            </span>
            <div>
              <h2 className="font-display text-3xl text-forest-950">Visit us</h2>
              <p className="mt-2 text-muted">{site.address.lines.join(", ")}</p>
            </div>
          </div>
          <ButtonLink href={site.address.mapUrl} variant="outline" target="_blank" rel="noopener">
            Get directions
          </ButtonLink>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
