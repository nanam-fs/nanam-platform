import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Changed your number?", robots: { index: false } };

export default function RecoverPage() {
  return (
    <main className="min-h-dvh bg-cream px-5 py-10">
      <div className="mx-auto max-w-md">
        <Logo />
        <h1 className="mt-10 font-display text-4xl text-forest-950">Changed your phone number?</h1>
        <p className="mt-2 mb-8 text-muted">
          Tell us your old and new numbers. An officer will call you to confirm it’s really you, then move your account to the new number.
        </p>
        <RecoverForm />
        <Link href="/portal/login" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-forest-700">
          <ArrowLeft className="size-4" /> Back to sign in
        </Link>
      </div>
    </main>
  );
}
