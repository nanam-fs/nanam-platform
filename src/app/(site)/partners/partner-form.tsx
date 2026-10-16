"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Choice, Field, Honeypot, Input } from "@/components/form";
import { Button } from "@/components/ui";
import type { FormState } from "@/lib/schemas";
import { submitPartner } from "../actions";

export function PartnerForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitPartner, { ok: false });
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const [type, setType] = useState(v.type ?? "p2p");

  if (state.ok) {
    return (
      <div className="rounded-3xl border border-line bg-white p-10 text-center">
        <CheckCircle2 className="mx-auto size-12 text-forest-600" strokeWidth={1.5} />
        <p className="mt-5 font-display text-3xl text-forest-950">Application received</p>
        <p className="mx-auto mt-2 max-w-md text-muted">{state.message}</p>
        <p className="mt-4 font-mono text-sm text-muted">Ref: {state.reference}</p>
      </div>
    );
  }

  return (
    <form action={action} className="relative space-y-6 rounded-3xl border border-line bg-white p-6 md:p-10">
      <Honeypot />
      {state.message && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
      <div>
        <p className="mb-3 text-sm font-medium text-forest-950">I am applying as</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice
            name="type"
            value="p2p"
            title="Individual agent (P2P)"
            body="Freelance marketer, MoMo vendor, retailer, salesperson or community referrer."
            defaultChecked={type === "p2p"}
            onChange={setType}
          />
          <Choice
            name="type"
            value="b2b"
            title="Business partner (B2B)"
            body="Agent banking outlet, forex bureau, SACCO, MoMo super-agent or employer."
            defaultChecked={type === "b2b"}
            onChange={setType}
          />
        </div>
      </div>
      <Field label="Full name (as on National ID)" name="fullName" error={e.fullName}>
        <Input name="fullName" required autoComplete="name" defaultValue={v.fullName} error={e.fullName} />
      </Field>
      {type === "b2b" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Organisation name" name="organisation" error={e.organisation}>
            <Input name="organisation" required defaultValue={v.organisation} error={e.organisation} />
          </Field>
          <Field label="Registration / trading licence no." name="registrationNumber">
            <Input name="registrationNumber" defaultValue={v.registrationNumber} />
          </Field>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" error={e.email}>
          <Input name="email" type="email" required autoComplete="email" defaultValue={v.email} error={e.email} />
        </Field>
        <Field label="Phone" name="phone" error={e.phone}>
          <Input name="phone" type="tel" required autoComplete="tel" defaultValue={v.phone} error={e.phone} />
        </Field>
        <Field label="WhatsApp number" name="whatsapp" error={e.whatsapp}>
          <Input name="whatsapp" type="tel" required defaultValue={v.whatsapp} error={e.whatsapp} />
        </Field>
        <Field label="District" name="district" error={e.district}>
          <Input name="district" required defaultValue={v.district} error={e.district} />
        </Field>
        <Field label="Sub-county" name="subCounty" error={e.subCounty}>
          <Input name="subCounty" required defaultValue={v.subCounty} error={e.subCounty} />
        </Field>
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-forest-950">How would you like to receive your commission?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Choice name="payout" value="mobile-money" title="Mobile Money" body="Commission sent to your MoMo number." defaultChecked={(v.payout ?? "mobile-money") === "mobile-money"} />
          <Choice name="payout" value="bank" title="Bank account" body="Commission paid to your bank account." defaultChecked={v.payout === "bank"} />
        </div>
      </div>
      <label className="flex gap-3 rounded-2xl bg-cream p-5 text-sm text-ink/80">
        <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-forest-600" />
        <span>
          I confirm these details are accurate. My information will be reviewed by the NANAM team before activation, and I may be
          contacted by email and WhatsApp.
        </span>
      </label>
      {e.consent && <p className="text-sm text-red-600">{e.consent[0]}</p>}
      <Button type="submit" disabled={pending} className="px-8">
        {pending && <Loader2 className="size-4 animate-spin" />} Submit application
      </Button>
    </form>
  );
}
