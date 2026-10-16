"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Lock } from "lucide-react";
import { DocumentUploader } from "@/components/document-uploader";
import { Choice, Field, Honeypot, Input, Select, Textarea } from "@/components/form";
import { coveredByIdentityCheck, documentSlots, requiredDocuments } from "@/lib/documents-config";
import { IdentityCheck } from "@/components/identity-check";
import { Button } from "@/components/ui";
import { quote } from "@/lib/loan-math";
import { products, type ProductSlug } from "@/lib/products";
import type { FormState } from "@/lib/schemas";
import { site } from "@/lib/site";
import { cn, formatUGX } from "@/lib/utils";
import { submitApplication } from "../actions";
import { DemoCode } from "@/components/demo-code";

const STEPS = [
  { title: "Your loan", fields: ["product", "amount", "months", "purpose"] },
  { title: "About you", fields: ["fullName", "phone", "email", "nin", "district"] },
  { title: "Income & security", fields: ["incomeSource", "monthlyIncome", "security", "securityDetails"] },
  { title: "Review", fields: ["consent"] },
] as const;

const securityFor: Record<ProductSlug, string> = {
  logbook: "logbook",
  business: "land-title",
  "asset-finance": "land-title",
  "contract-finance": "contract",
};

export function ApplyForm({
  initial,
}: {
  initial: { product: ProductSlug; amount: number; months: number; referral?: string };
}) {
  const [step, setStep] = useState(0);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await submitApplication(prev, formData);
    // When the server rejects a field, jump back to the step that owns it.
    const first = STEPS.findIndex((s) => s.fields.some((f) => result.errors?.[f]?.length));
    if (first >= 0) setStep(first);
    return result;
  }, { ok: false });
  const [product, setProduct] = useState<ProductSlug>(initial.product);
  const [amount, setAmount] = useState(initial.amount);
  const [months, setMonths] = useState(initial.months);
  const formRef = useRef<HTMLFormElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const v = state.values ?? {};
  const e = state.errors ?? {};

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step, state.ok]);

  function next() {
    const fieldset = formRef.current?.querySelector<HTMLFieldSetElement>(`fieldset[data-step="${step}"]`);
    const controls = fieldset ? Array.from(fieldset.querySelectorAll<HTMLInputElement>("input, select, textarea")) : [];
    for (const c of controls) {
      if (!c.checkValidity()) {
        c.reportValidity();
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  if (state.ok) {
    return (
      <div ref={topRef} className="scroll-mt-28 rounded-3xl border border-line bg-white p-10 text-center md:p-14">
        <CheckCircle2 className="mx-auto size-14 text-forest-600" strokeWidth={1.5} />
        <h2 className="mt-6 font-display text-4xl text-forest-950">Application received</h2>
        <p className="mx-auto mt-3 max-w-md text-muted">{state.message}</p>
        <p className="mx-auto mt-8 inline-flex flex-col rounded-2xl bg-cream px-8 py-4">
          <span className="text-xs uppercase tracking-[0.16em] text-muted">Your reference</span>
          <span className="mt-1 font-mono text-xl font-medium text-forest-950">{state.reference}</span>
        </p>
        {state.upload && (
          <div className="mx-auto mt-10 max-w-xl">
            <IdentityCheck applicationId={state.upload.applicationId} uploadToken={state.upload.token} />
          </div>
        )}
        {state.upload ? (
          <div className="mx-auto mt-10 max-w-xl text-left">
            <p className="font-display text-2xl text-forest-950">Then, your documents</p>
            <p className="mt-1 mb-5 text-sm text-muted">
              Photos from your phone are fine. You can also add them later by signing in at nanam.ug/portal.
            </p>
            <DocumentUploader
              applicationId={state.upload.applicationId}
              token={state.upload.token}
              slots={documentSlots(state.upload.product).filter((k) => !coveredByIdentityCheck.includes(k))}
              required={requiredDocuments[state.upload.product as ProductSlug]}
            />
          </div>
        ) : (
          <div className="mx-auto mt-10 max-w-md text-left">
            <p className="font-medium text-forest-950">While you wait, get these ready:</p>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              {products.find((p) => p.slug === product)?.requirements.map((r) => (
                <li key={r} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-lime-600" /> {r}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link href="/" className="mt-10 inline-block text-sm font-medium text-forest-700 underline-offset-4 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const q = quote(amount, months);

  return (
    <div ref={topRef} className="scroll-mt-28 grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form ref={formRef} action={action} noValidate={false} className="relative rounded-3xl border border-line bg-white p-6 md:p-10">
        <Honeypot />
        {initial.referral && <input type="hidden" name="referral" value={initial.referral} />}

        <ol className="mb-10 grid grid-cols-4 gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-forest-600" : "bg-line")} />
              <span className={cn("mt-2 hidden text-xs sm:block", i === step ? "font-medium text-forest-950" : "text-muted")}>
                {i + 1}. {s.title}
              </span>
            </li>
          ))}
        </ol>

        {state.message && !state.ok && (
          <p role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message}
          </p>
        )}

        {/* Step 1 */}
        <fieldset data-step={0} hidden={step !== 0} className="space-y-7">
          <legend className="mb-6 font-display text-3xl text-forest-950">What do you need?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <Choice
                key={p.slug}
                name="product"
                value={p.slug}
                title={p.name}
                body={p.security}
                defaultChecked={product === p.slug}
                onChange={(val) => setProduct(val as ProductSlug)}
              />
            ))}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Amount (UGX)" name="amount" error={e.amount} hint="Between 2,000,000 and 100,000,000">
              <Input
                name="amount"
                type="number"
                inputMode="numeric"
                min={2_000_000}
                max={100_000_000}
                step={100_000}
                required
                value={amount}
                onChange={(ev) => setAmount(Number(ev.target.value))}
                error={e.amount}
              />
            </Field>
            <Field label="Repayment period" name="months" error={e.months}>
              <Select name="months" value={months} onChange={(ev) => setMonths(Number(ev.target.value))} error={e.months}>
                {[1, 2, 3, 4, 5, 6].map((m) => (
                  <option key={m} value={m}>
                    {m} month{m > 1 ? "s" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="What is the loan for?" name="purpose" error={e.purpose}>
            <Textarea
              name="purpose"
              required
              minLength={3}
              maxLength={300}
              placeholder="e.g. Restock my shop ahead of the festive season"
              defaultValue={v.purpose}
              error={e.purpose}
              className="min-h-24"
            />
          </Field>
        </fieldset>

        {/* Step 2 */}
        <fieldset data-step={1} hidden={step !== 1} className="space-y-5">
          <legend className="mb-6 font-display text-3xl text-forest-950">Tell us about you</legend>
          <Field label="Full name (as on National ID)" name="fullName" error={e.fullName}>
            <Input name="fullName" required minLength={2} autoComplete="name" defaultValue={v.fullName} error={e.fullName} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Phone number" name="phone" error={e.phone}>
              <Input name="phone" type="tel" required autoComplete="tel" placeholder="0772 123 456" defaultValue={v.phone} error={e.phone} />
            </Field>
            <Field label="Email (optional)" name="email" error={e.email}>
              <Input name="email" type="email" autoComplete="email" defaultValue={v.email} error={e.email} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="National ID number (NIN)" name="nin" error={e.nin} hint="14 characters, starts with CM or CF">
              <Input
                name="nin"
                required
                minLength={14}
                maxLength={14}
                autoCapitalize="characters"
                className="uppercase"
                placeholder="CM12345678ABCD"
                defaultValue={v.nin}
                error={e.nin}
              />
            </Field>
            <Field label="District" name="district" error={e.district}>
              <Input name="district" required placeholder="e.g. Wakiso" defaultValue={v.district} error={e.district} />
            </Field>
          </div>
        </fieldset>

        {/* Step 3 */}
        <fieldset data-step={2} hidden={step !== 2} className="space-y-7">
          <legend className="mb-6 font-display text-3xl text-forest-950">Income &amp; security</legend>
          <div>
            <p className="mb-3 text-sm font-medium text-forest-950">Main source of income</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Choice name="incomeSource" value="salary" title="Salary" defaultChecked={(v.incomeSource ?? "salary") === "salary"} />
              <Choice name="incomeSource" value="business" title="Business" defaultChecked={v.incomeSource === "business"} />
              <Choice name="incomeSource" value="both" title="Both" defaultChecked={v.incomeSource === "both"} />
            </div>
            {e.incomeSource && <p className="mt-1.5 text-sm text-red-600">{e.incomeSource[0]}</p>}
          </div>
          <Field label="Average monthly income (UGX)" name="monthlyIncome" error={e.monthlyIncome} hint="As shown on your bank or Mobile Money statement">
            <Input name="monthlyIncome" type="number" inputMode="numeric" min={1} required defaultValue={v.monthlyIncome} error={e.monthlyIncome} />
          </Field>
          <Field label="Security you will offer" name="security" error={e.security}>
            <Select key={product} name="security" defaultValue={v.security ?? securityFor[product]} error={e.security}>
              <option value="logbook">Motor vehicle logbook</option>
              <option value="land-title">Land title</option>
              <option value="contract">Contract / LPO plus logbook or land title</option>
              <option value="other">Other — I’ll discuss with a loan officer</option>
            </Select>
          </Field>
          <Field label="Security details (optional)" name="securityDetails" hint="e.g. Toyota Premio 2012, or plot location">
            <Input name="securityDetails" maxLength={300} defaultValue={v.securityDetails} />
          </Field>
        </fieldset>

        {/* Step 4 */}
        <fieldset data-step={3} hidden={step !== 3} className="space-y-6">
          <legend className="mb-6 font-display text-3xl text-forest-950">Review &amp; submit</legend>
          <dl className="divide-y divide-line rounded-2xl border border-line">
            {[
              ["Loan", products.find((p) => p.slug === product)?.name],
              ["Amount", formatUGX(amount)],
              ["Period", `${months} month${months > 1 ? "s" : ""}`],
              ["Estimated instalment", formatUGX(q.monthlyInstalment)],
              ["Processing fee (deducted)", formatUGX(q.processingFee)],
              ["You receive", formatUGX(q.netDisbursed)],
            ].map(([k, val]) => (
              <div key={k} className="flex justify-between gap-4 px-5 py-3.5 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium tabular">{val}</dd>
              </div>
            ))}
          </dl>
          <label className="flex gap-3 rounded-2xl bg-cream p-5 text-sm text-ink/80">
            <input type="checkbox" name="consent" required defaultChecked={v.consent === "on"} className="mt-0.5 size-4 shrink-0 accent-forest-600" />
            <span>
              I confirm the information is accurate and I consent to {site.name} contacting me, verifying my identity, income and
              security, and processing my personal data for this application in line with the Data Protection and Privacy Act,
              2019.
            </span>
          </label>
          {e.consent && <p className="text-sm text-red-600">{e.consent[0]}</p>}

          {state.verify && (
            <div className="rounded-2xl border border-forest-600/30 bg-forest-50 p-5">
              <p className="font-medium text-forest-950">Confirm your phone number</p>
              <p className="mt-1 text-sm text-forest-900/75">
                We’ve texted a 6-digit code to <strong>{state.verify.phone}</strong>. Enter it to submit your application.
              </p>
              {state.verify.demoCode && (
                <div className="mt-3">
                  <DemoCode code={state.verify.demoCode} />
                </div>
              )}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <label htmlFor="code" className="sr-only">6-digit code</label>
                  <Input
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    autoFocus
                    placeholder="123456"
                    className="text-center font-mono tracking-[0.4em]"
                    error={e.code}
                  />
                </div>
                <button type="submit" name="resend" value="1" formNoValidate className="h-12 rounded-xl px-4 text-sm font-medium text-forest-700 hover:bg-white">
                  Resend code
                </button>
              </div>
              <p className="mt-3 text-xs text-forest-900/60">
                Wrong number?{" "}
                <button type="button" className="underline" onClick={() => setStep(1)}>
                  Edit it
                </button>
              </p>
            </div>
          )}
        </fieldset>

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" /> Back
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={next} className="px-7">
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={pending} className="px-7">
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              {state.verify ? "Confirm & submit" : "Verify phone & submit"}
            </Button>
          )}
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-3xl bg-forest-950 p-6 text-white">
          <p className="text-sm text-white/60">Estimated monthly instalment</p>
          <p className="mt-2 font-display text-4xl text-lime-400 tabular">{formatUGX(q.monthlyInstalment)}</p>
          <p className="mt-1 text-sm text-white/60">
            for {formatUGX(amount)} over {months} month{months > 1 ? "s" : ""}
          </p>
          <dl className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm tabular">
            <div className="flex justify-between">
              <dt className="text-white/60">Total interest</dt>
              <dd>{formatUGX(q.totalInterest)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/60">You receive</dt>
              <dd>{formatUGX(q.netDisbursed)}</dd>
            </div>
          </dl>
        </div>
        <p className="flex gap-2 px-2 text-xs text-muted">
          <Lock className="mt-0.5 size-3.5 shrink-0" /> Your details are encrypted in transit and only used to assess your
          application.
        </p>
      </aside>
    </div>
  );
}
