"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Smartphone, XCircle } from "lucide-react";
import { cn, formatUGX } from "@/lib/utils";
import { checkPayment, startPayment, type PayState } from "../../../../actions";

type Options = { arrears: number; next: number; nextDue: string | null; settlement: number; settlementSaves: number; outstanding: number };
type Status = Awaited<ReturnType<typeof checkPayment>>;

export function PayForm({
  loanId,
  initialRequestId,
  defaultPayer,
  defaultNetwork,
  available,
  options,
}: {
  loanId: string;
  initialRequestId?: string;
  defaultPayer: string;
  defaultNetwork: "mtn" | "airtel";
  available: { mtn: boolean; airtel: boolean };
  options: Options;
}) {
  const [state, action, pending] = useActionState<PayState, FormData>(startPayment.bind(null, loanId), { requestId: initialRequestId });
  const requestId = state.requestId;
  const [status, setStatus] = useState<Status | null>(null);
  const [retry, setRetry] = useState(0);

  // Poll the provider (via the server) until the payment resolves.
  useEffect(() => {
    if (!requestId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const s = await checkPayment(requestId);
      if (stop) return;
      setStatus(s);
      if (s.status === "pending" || s.status === "expired") timer = setTimeout(tick, 3000);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [requestId, retry]);

  const choices = [
    options.arrears > 0
      ? { value: "arrears", title: "Overdue amount", amount: options.arrears, hint: "Brings your loan up to date" }
      : options.next > 0
        ? { value: "instalment", title: "Next instalment", amount: options.next, hint: options.nextDue ? `Due ${new Date(options.nextDue).toLocaleDateString("en-UG", { day: "numeric", month: "long" })}` : "" }
        : null,
    options.settlement > 0 && options.settlement < options.outstanding
      ? { value: "settlement", title: "Pay off the whole loan", amount: options.settlement, hint: `Saves you ${formatUGX(options.settlementSaves)} in interest` }
      : options.settlement > 0
        ? { value: "settlement", title: "Pay the full balance", amount: options.settlement, hint: "Closes your loan" }
        : null,
    { value: "custom", title: "Another amount", amount: 0, hint: "Any amount from UGX 1,000" },
  ].filter(Boolean) as { value: string; title: string; amount: number; hint: string }[];

  const [purpose, setPurpose] = useState(choices[0]?.value ?? "custom");
  const [network, setNetwork] = useState<"mtn" | "airtel">(available[defaultNetwork] ? defaultNetwork : available.mtn ? "mtn" : "airtel");

  if (requestId && status && status.status !== "unauthorised") {
    if (status.status === "successful") {
      return (
        <div className="mt-8 rounded-3xl bg-forest-50 p-8 text-center">
          <CheckCircle2 className="mx-auto size-14 text-forest-600" strokeWidth={1.5} />
          <p className="mt-4 font-display text-3xl text-forest-950">Payment received</p>
          <p className="mt-2 text-forest-800">{formatUGX(status.amount)} has been applied to your loan. Thank you.</p>
          <p className="mt-3 font-mono text-sm text-muted">Ref {status.reference}</p>
          {status.excess > 0 && (
            <p className="mx-auto mt-4 max-w-sm rounded-xl bg-white px-4 py-3 text-sm text-amber-800">
              {formatUGX(status.excess)} was more than you owed. Our team will refund it to you.
            </p>
          )}
          <Link href={`/portal/loans/${loanId}`} className="mt-6 inline-flex h-11 items-center rounded-full bg-forest-600 px-6 text-sm font-medium text-white hover:bg-forest-700">
            View updated balance
          </Link>
        </div>
      );
    }
    if (status.status === "failed") {
      return (
        <div className="mt-8 rounded-3xl bg-red-50 p-8 text-center">
          <XCircle className="mx-auto size-14 text-red-600" strokeWidth={1.5} />
          <p className="mt-4 font-display text-3xl text-forest-950">Payment not completed</p>
          <p className="mt-2 text-red-800">{status.reason ?? "The payment was declined or timed out."} No money was taken.</p>
          <a href={`/portal/loans/${loanId}/pay`} className="mt-6 inline-flex h-11 items-center rounded-full bg-forest-600 px-6 text-sm font-medium text-white hover:bg-forest-700">
            Try again
          </a>
        </div>
      );
    }
    return (
      <div className="mt-8 rounded-3xl bg-cream p-8 text-center" aria-live="polite">
        <span className="relative mx-auto grid size-16 place-items-center rounded-full bg-white">
          <Smartphone className="size-7 text-forest-600" />
          <span className="absolute inset-0 animate-ping rounded-full border-2 border-lime-500/60" />
        </span>
        <p className="mt-5 font-display text-3xl text-forest-950">Check your phone</p>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          Approve the {formatUGX(status.amount ?? 0)} prompt with your Mobile Money PIN. This page updates automatically.
        </p>
        {status.status === "expired" && (
          <button onClick={() => setRetry((n) => n + 1)} className="mt-5 text-sm font-medium text-forest-700 underline">
            Still waiting? Check again
          </button>
        )}
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" /> Waiting for confirmation
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 space-y-6">
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-forest-950">How much?</legend>
        <div className="space-y-2">
          {choices.map((c) => (
            <label key={c.value} className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line p-4 has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50">
              <span className="flex items-center gap-3">
                <input type="radio" name="purpose" value={c.value} checked={purpose === c.value} onChange={() => setPurpose(c.value)} className="size-4 accent-forest-600" />
                <span>
                  <span className="block font-medium">{c.title}</span>
                  <span className="block text-xs text-muted">{c.hint}</span>
                </span>
              </span>
              {c.amount > 0 && <span className="font-semibold tabular">{formatUGX(c.amount)}</span>}
            </label>
          ))}
        </div>
        {purpose === "custom" && (
          <input
            name="amount"
            type="number"
            inputMode="numeric"
            min={1000}
            max={options.outstanding}
            required
            placeholder="Amount in UGX"
            aria-label="Amount in UGX"
            className="mt-3 h-12 w-full rounded-2xl border border-line px-4 focus:border-forest-600 focus:outline-none"
          />
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-forest-950">Pay from</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["mtn", "airtel"] as const).map((n) => (
            <label
              key={n}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line p-4 font-medium has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50",
                !available[n] && "cursor-not-allowed opacity-40",
              )}
            >
              <input type="radio" name="network" value={n} disabled={!available[n]} checked={network === n} onChange={() => setNetwork(n)} className="sr-only" />
              <span className={cn("size-3 rounded-full", n === "mtn" ? "bg-yellow-400" : "bg-red-600")} aria-hidden />
              {n === "mtn" ? "MTN MoMo" : "Airtel Money"}
            </label>
          ))}
        </div>
        <label htmlFor="payer" className="mt-4 mb-2 block text-sm text-muted">Mobile Money number</label>
        <input id="payer" name="payer" type="tel" inputMode="tel" defaultValue={defaultPayer} required className="h-12 w-full rounded-2xl border border-line px-4 focus:border-forest-600 focus:outline-none" />
      </fieldset>

      {state.error && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-forest-600 text-base font-medium text-white hover:bg-forest-700 disabled:opacity-60">
        {pending && <Loader2 className="size-5 animate-spin" />} Send payment prompt
      </button>
      <p className="text-center text-xs text-muted">NANAM will never ask for your Mobile Money PIN. Only enter it on your phone’s prompt.</p>
    </form>
  );
}
