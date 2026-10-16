import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { site } from "@/lib/site";
import { demoMode } from "@/lib/test-mode";
import { DemoLogins } from "./demo-logins";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/console/login">) {
  if (await getStaff()) redirect("/console");
  const sp = await searchParams;
  const next = sp.next;
  return (
    <main className="surface-forest grid min-h-[calc(100dvh-var(--demo-h,0px))] place-items-center p-6">
      <div className="w-full max-w-sm">
        <Image src="/brand/logo-inverse.svg" alt={site.name} width={613} height={136} className="mx-auto h-9 w-auto" priority />
        <div className="mt-10 rounded-2xl bg-white p-8 shadow-2xl shadow-black/30">
          <h1 className="text-xl font-semibold text-forest-950">Staff console</h1>
          <p className="mt-1 mb-6 text-sm text-muted">Sign in with your NANAM staff account.</p>
          {sp.reset === "1" && <p role="status" className="mb-4 rounded-lg bg-forest-50 px-3 py-2 text-sm text-forest-800">Password updated. Sign in with your new password.</p>}
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
        {demoMode() && <DemoLogins />}
        <p className="mt-6 text-center text-xs text-white/45">Authorised NANAM staff only. All activity is logged.</p>
      </div>
    </main>
  );
}
