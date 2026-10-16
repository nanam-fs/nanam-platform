import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { getCustomer } from "@/lib/customer-auth";
import { site, tel } from "@/lib/site";
import { PortalLoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function PortalLogin() {
  if (await getCustomer()) redirect("/portal");
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="surface-forest hidden flex-col justify-between p-12 text-white lg:flex">
        <Logo inverse />
        <div>
          <p className="font-display text-6xl leading-[1.02]">
            Your loan, <em className="text-lime-400">in your pocket.</em>
          </p>
          <ul className="mt-8 space-y-3 text-white/75">
            <li>See your balance and next instalment</li>
            <li>Pay with MTN MoMo or Airtel Money</li>
            <li>Download your loan statement any time</li>
          </ul>
        </div>
        <p className="flex items-center gap-2 text-xs text-white/45">
          <ShieldCheck className="size-4" /> Licensed by {site.regulator.short}
        </p>
      </section>
      <section className="flex flex-col justify-center px-5 py-10 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="mt-10 font-display text-4xl text-forest-950">Sign in to your account</h1>
          <p className="mt-2 mb-8 text-muted">We’ll text a one-time code to your phone. No password needed.</p>
          <PortalLoginForm />
          <p className="mt-10 text-sm text-muted">
            No longer have this number?{" "}
            <Link href="/portal/recover" className="font-medium text-forest-700 underline">Move your account to a new number</Link>
          </p>
          <p className="mt-3 text-sm text-muted">
            Trouble signing in? Call <a className="text-forest-700 underline" href={tel(site.phones[0])}>{site.phones[0]}</a>.
          </p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-forest-700">
            <ArrowLeft className="size-4" /> Back to nanam.ug
          </Link>
        </div>
      </section>
    </main>
  );
}
