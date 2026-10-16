import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Logo } from "@/components/logo";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

// Placeholder until the customer portal ships in phase 2 (loan balances, schedules, statements, documents).
export default function PortalPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="surface-forest hidden flex-col justify-between p-12 text-white lg:flex">
        <Logo inverse />
        <div>
          <p className="font-display text-5xl leading-tight">Your loan, at a glance.</p>
          <p className="mt-4 max-w-md text-white/65">
            Balances, upcoming instalments, statements and documents, all in one secure place.
          </p>
        </div>
        <p className="text-xs text-white/40">Licensed by {site.regulator.short}</p>
      </section>
      <section className="flex flex-col justify-center p-8 md:p-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          <span className="mt-10 grid size-12 place-items-center rounded-2xl bg-forest-50 text-forest-600">
            <LockKeyhole className="size-5" />
          </span>
          <h1 className="mt-6 font-display text-4xl text-forest-950">Customer portal</h1>
          <p className="mt-3 text-muted">
            Online account access is launching soon. For your balance or a settlement figure, contact your loan officer or
            email <a className="text-forest-700 underline" href={`mailto:${site.email}`}>{site.email}</a>.
          </p>
          <Link href="/" className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-forest-700">
            <ArrowLeft className="size-4" /> Back to nanam.ug
          </Link>
        </div>
      </section>
    </main>
  );
}
