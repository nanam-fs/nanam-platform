"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitPhoneChange } from "@/app/(site)/actions";
import type { FormState } from "@/lib/schemas";

const field = "h-12 w-full rounded-2xl border border-line bg-white px-4 text-base focus:border-forest-600 focus:outline-none focus:ring-4 focus:ring-forest-600/10";

export function RecoverForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitPhoneChange, { ok: false });
  const v = state.values ?? {};
  const e = state.errors ?? {};
  if (state.ok) {
    return (
      <div className="rounded-2xl bg-forest-50 p-6 text-forest-900">
        <CheckCircle2 className="size-8 text-forest-600" />
        <p className="mt-3 font-medium">{state.message}</p>
        <p className="mt-2 text-sm text-forest-800/80">Reference {state.reference}. For your security we never change a number without speaking to you.</p>
      </div>
    );
  }
  const row = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium text-forest-950">{label}</label>
      <input id={name} name={name} defaultValue={v[name]} className={field} aria-invalid={e[name] ? true : undefined} {...props} />
      {e[name] && <p className="mt-1 text-sm text-red-600">{e[name]![0]}</p>}
    </div>
  );
  return (
    <form action={action} className="space-y-4">
      {row("fullName", "Full name (as on your National ID)", { required: true, autoComplete: "name" })}
      {row("nin", "National ID number (NIN)", { required: true, maxLength: 14, className: `${field} uppercase` })}
      {row("oldPhone", "Old number (the one on your loan)", { required: true, type: "tel" })}
      {row("newPhone", "New number", { required: true, type: "tel" })}
      {row("reference", "Loan or application reference (optional)", { placeholder: "e.g. LN-2610-AB12" })}
      {state.message && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.message}</p>}
      <button disabled={pending} className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-forest-600 py-3.5 font-medium text-white hover:bg-forest-700 disabled:opacity-60">
        {pending && <Loader2 className="size-5 animate-spin" />} Send request
      </button>
    </form>
  );
}
