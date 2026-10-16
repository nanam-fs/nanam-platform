"use client";

import { useActionState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Field, Honeypot, Input, Select, Textarea } from "@/components/form";
import { Button } from "@/components/ui";
import type { FormState } from "@/lib/schemas";
import { submitContact } from "../actions";

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitContact, { ok: false });
  const v = state.values ?? {};
  const e = state.errors ?? {};

  if (state.ok) {
    return (
      <div className="rounded-3xl border border-line bg-white p-10 text-center">
        <CheckCircle2 className="mx-auto size-12 text-forest-600" strokeWidth={1.5} />
        <p className="mt-5 font-display text-3xl text-forest-950">Message sent</p>
        <p className="mt-2 text-muted">{state.message}</p>
        <p className="mt-4 font-mono text-sm text-muted">Ref: {state.reference}</p>
      </div>
    );
  }

  return (
    <form action={action} className="relative space-y-5 rounded-3xl border border-line bg-white p-6 md:p-10">
      <Honeypot />
      {state.message && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" name="name" error={e.name}>
          <Input name="name" required minLength={2} autoComplete="name" defaultValue={v.name} error={e.name} />
        </Field>
        <Field label="Phone (optional)" name="phone" error={e.phone}>
          <Input name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} error={e.phone} />
        </Field>
      </div>
      <Field label="Email" name="email" error={e.email}>
        <Input name="email" type="email" required autoComplete="email" defaultValue={v.email} error={e.email} />
      </Field>
      <Field label="How can we help?" name="topic">
        <Select name="topic" defaultValue={v.topic ?? "new-loan"}>
          <option value="new-loan">I’d like a new loan</option>
          <option value="existing-loan">I have an existing loan</option>
          <option value="partnership">Partnership enquiry</option>
          <option value="other">Something else</option>
        </Select>
      </Field>
      <Field label="Message" name="message" error={e.message}>
        <Textarea name="message" required minLength={10} maxLength={2000} defaultValue={v.message} error={e.message} />
      </Field>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto sm:px-8">
        {pending && <Loader2 className="size-4 animate-spin" />} Send message
      </Button>
    </form>
  );
}
