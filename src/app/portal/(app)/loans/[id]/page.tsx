import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Wallet } from "lucide-react";
import { requireCustomer } from "@/lib/customer-auth";
import { getProduct } from "@/lib/products";
import { customerLoan } from "@/lib/portal-data";
import { today } from "@/lib/queries";
import { cn, formatUGX } from "@/lib/utils";

export const metadata = { title: "Loan details" };

const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Kampala" });
const method = { mobile_money: "Mobile Money", bank: "Bank", cash: "Cash" } as const;

export default async function PortalLoan({ params }: PageProps<"/portal/loans/[id]">) {
  const { phone } = await requireCustomer();
  const loan = await customerLoan(phone, (await params).id);
  if (!loan) notFound();
  const t = today();
  const outstanding = loan.installments.reduce((s, i) => s + i.amountDue - i.amountPaid, 0);
  const pendingPayment = loan.paymentRequests.find((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-xl shadow-forest-950/5 md:p-8">
        <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-forest-700">
          <ArrowLeft className="size-4" /> My account
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              {getProduct(loan.product)?.name} · <span className="font-mono">{loan.reference}</span>
            </p>
            <p className="mt-1 font-display text-4xl text-forest-950 tabular">{loan.status === "active" ? formatUGX(outstanding) : "Fully repaid"}</p>
            {loan.status === "active" && <p className="text-sm text-muted">remaining</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {loan.status === "active" && (
              <Link href={`/portal/loans/${loan.id}/pay`} className="flex h-11 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-medium text-white hover:bg-forest-700">
                <Wallet className="size-4" /> Pay now
              </Link>
            )}
            <Link href={`/portal/loans/${loan.id}/statement`} className="flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-medium text-forest-800 hover:bg-cream">
              <FileText className="size-4" /> Statement
            </Link>
          </div>
        </div>
        {pendingPayment && (
          <p className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            A payment of {formatUGX(pendingPayment.amount)} is waiting for approval on {pendingPayment.payerMsisdn}.{" "}
            <Link href={`/portal/loans/${loan.id}/pay?request=${pendingPayment.id}`} className="font-medium underline">Check status</Link>
          </p>
        )}
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6 text-sm sm:grid-cols-4">
          {[
            ["Loan amount", formatUGX(loan.principal)],
            ["You received", formatUGX(loan.netDisbursed)],
            ["Rate", `${loan.monthlyRate}% / month`],
            ["Started", fmt(loan.disbursedAt)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium tabular">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 md:p-8">
        <h2 className="font-medium text-forest-950">Repayment schedule</h2>
        <ol className="mt-4 divide-y divide-line">
          {loan.installments.map((i) => {
            const paid = i.amountPaid >= i.amountDue;
            const late = !paid && i.dueDate < t;
            return (
              <li key={i.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className={cn("grid size-8 place-items-center rounded-full text-xs font-medium", paid ? "bg-forest-600 text-white" : late ? "bg-red-100 text-red-700" : "bg-sand text-ink/70")}>{i.seq}</span>
                  <div>
                    <p className="text-sm font-medium">{fmt(i.dueDate)}</p>
                    <p className={cn("text-xs", late ? "text-red-700" : "text-muted")}>
                      {paid ? `Paid ${i.paidAt ? fmt(i.paidAt) : ""}` : late ? "Overdue" : i.amountPaid > 0 ? `${formatUGX(i.amountPaid)} paid` : "Upcoming"}
                    </p>
                  </div>
                </div>
                <p className={cn("tabular", paid && "text-muted line-through decoration-forest-600/40")}>{formatUGX(i.amountDue)}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 md:p-8">
        <h2 className="font-medium text-forest-950">Payments</h2>
        {loan.repayments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No payments yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {[...loan.repayments].reverse().map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">{fmt(r.receivedAt)}</p>
                  <p className="text-xs text-muted">
                    {method[r.method]} · <span className="font-mono">{r.reference}</span>
                  </p>
                </div>
                <p className="font-medium tabular text-forest-700">+ {formatUGX(r.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
