import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../auth-shell";
import { ForgotForm } from "../recovery-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter your work email and we’ll send you a link to set a new one.">
      <ForgotForm />
      <p className="mt-6 text-sm text-muted">
        No access to your email? Ask an administrator to issue a reset link from <span className="text-ink">Team</span>.
      </p>
      <Link href="/console/login" className="mt-4 inline-block text-sm font-medium text-forest-700 hover:underline">← Back to sign in</Link>
    </AuthShell>
  );
}
