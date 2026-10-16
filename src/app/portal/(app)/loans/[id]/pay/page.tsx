import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireCustomer } from "@/lib/customer-auth";
import { detectNetwork, isTestMode, providerFor } from "@/lib/momo";
import { paymentOptions } from "@/lib/payments";
import { PayForm } from "./pay-form";

export const metadata = { title: "Pay with Mobile Money" };

export default async function PayPage({ params, searchParams }: PageProps<"/portal/loans/[id]/pay">) {
  const { phone } = await requireCustomer();
  const { id } = await params;
  const opts = await paymentOptions(id, phone);
  if (!opts) notFound();
  const request = (await searchParams).request;

  const available = { mtn: !!providerFor("mtn"), airtel: !!providerFor("airtel") };
  const testMode = isTestMode("mtn") || isTestMode("airtel");

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-xl shadow-forest-950/5 md:p-8">
      <Link href={`/portal/loans/${id}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest-700">
        <ArrowLeft className="size-4" /> Loan {opts.loan.reference}
      </Link>
      <h1 className="mt-4 font-display text-4xl text-forest-950">Pay with Mobile Money</h1>
      <p className="mt-1 text-muted">You’ll get a prompt on your phone to approve the payment with your PIN.</p>
      {testMode && (
        <p className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Test mode:</strong> no real money moves. Payments approve automatically after a few seconds; numbers ending in 000 are declined.
        </p>
      )}
      {opts.loan.status !== "active" ? (
        <p className="mt-6 rounded-2xl bg-forest-50 p-5 text-forest-800">This loan is fully repaid. Nothing more to pay.</p>
      ) : !available.mtn && !available.airtel ? (
        <p className="mt-6 rounded-2xl bg-sand p-5 text-sm">Mobile Money payments are temporarily unavailable. Please pay at our office or call us.</p>
      ) : (
        <PayForm
          loanId={id}
          initialRequestId={typeof request === "string" ? request : undefined}
          defaultPayer={phone}
          defaultNetwork={detectNetwork(phone) ?? "mtn"}
          available={available}
          options={{
            arrears: opts.arrears,
            next: opts.next?.amount ?? 0,
            nextDue: opts.next?.dueDate ?? null,
            settlement: opts.settlement,
            settlementSaves: opts.settlementSaves,
            outstanding: opts.outstanding,
          }}
        />
      )}
    </section>
  );
}
