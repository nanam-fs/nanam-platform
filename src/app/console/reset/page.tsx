import type { Metadata } from "next";
import Link from "next/link";
import { resetTokenValid } from "@/lib/password-reset";
import { AuthShell } from "../auth-shell";
import { ResetForm } from "../recovery-forms";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false }, referrer: "no-referrer" };

export default async function ResetPage({ searchParams }: PageProps<"/console/reset">) {
  const token = (await searchParams).token;
  const valid = typeof token === "string" && token.length > 20 ? await resetTokenValid(token) : null;
  if (!valid || typeof token !== "string") {
    return (
      <AuthShell title="Link expired" subtitle="This reset link has expired or was already used.">
        <Link href="/console/forgot" className="flex h-11 w-full items-center justify-center rounded-lg bg-forest-600 text-sm font-medium text-white hover:bg-forest-700">Request a new link</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={`Set a new password`} subtitle={`For ${valid.name}. You’ll be signed out of all other devices.`}>
      <ResetForm token={token} />
    </AuthShell>
  );
}
