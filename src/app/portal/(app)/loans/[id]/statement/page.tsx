import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireCustomer } from "@/lib/customer-auth";
import { buildSchedule } from "@/lib/lending";
import { getProduct } from "@/lib/products";
import { customerLoan } from "@/lib/portal-data";
import { site } from "@/lib/site";
import { formatUGX } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata = { title: "Loan statement" };

const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-UG", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Kampala" });
const method = { mobile_money: "Mobile Money", bank: "Bank transfer", cash: "Cash" } as const;

export default async function Statement({ params }: PageProps<"/portal/loans/[id]/statement">) {
  const { phone } = await requireCustomer();
  const loan = await customerLoan(phone, (await params).id);
  if (!loan) notFound();

  const originalInterest = buildSchedule(loan.principal, loan.months, loan.monthlyRate, new Date(loan.disbursedAt)).reduce((s, r) => s + r.interestDue, 0);
  const currentInterest = loan.installments.reduce((s, i) => s + i.interestDue, 0);
  const waived = Math.max(0, originalInterest - currentInterest);
  const charged = loan.principal + originalInterest;

  type Line = { date: Date; text: string; debit?: number; credit?: number };
  const lines: Line[] = [
    { date: new Date(loan.disbursedAt), text: `Loan disbursed (${formatUGX(loan.netDisbursed)} paid out after ${formatUGX(loan.processingFee)} processing fee)`, debit: loan.principal },
    { date: new Date(loan.disbursedAt), text: `Interest at ${loan.monthlyRate}% per month over ${loan.months} months`, debit: originalInterest },
    ...loan.repayments.map((r) => ({ date: new Date(r.receivedAt), text: `Repayment · ${method[r.method]} · ${r.reference}`, credit: r.amount })),
    ...(waived > 0 ? [{ date: new Date(loan.closedAt ?? new Date()), text: "Interest waived on early settlement", credit: waived }] : []),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const rows = lines.reduce<(Line & { balance: number })[]>((acc, l) => {
    const prev = acc.at(-1)?.balance ?? 0;
    return [...acc, { ...l, balance: prev + (l.debit ?? 0) - (l.credit ?? 0) }];
  }, []);
  const balance = rows.at(-1)?.balance ?? 0;
  const paid = loan.repayments.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href={`/portal/loans/${loan.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-sm text-muted hover:text-forest-700">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <PrintButton />
      </div>
      <article className="rounded-3xl border border-line bg-white p-6 text-sm md:p-10 print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-col justify-between gap-6 border-b border-line pb-6 sm:flex-row">
          <div>
            <Image src="/brand/logo.svg" alt={site.name} width={613} height={136} className="h-9 w-auto" />
            <p className="mt-3 text-xs leading-relaxed text-muted">
              {site.address.lines.join(", ")}
              <br />
              {site.phones.join(" · ")} · {site.email}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-3xl text-forest-950">Loan statement</p>
            <p className="mt-1 text-xs text-muted">Generated {fmt(new Date())}</p>
          </div>
        </header>

        <dl className="grid grid-cols-2 gap-4 border-b border-line py-6 sm:grid-cols-4">
          {[
            ["Borrower", loan.borrowerName],
            ["Phone", loan.borrowerPhone],
            ["Loan", `${loan.reference} · ${getProduct(loan.product)?.name}`],
            ["Status", loan.status === "active" ? "Active" : "Fully repaid"],
            ["Principal", formatUGX(loan.principal)],
            ["Rate", `${loan.monthlyRate}% per month (reducing)`],
            ["Term", `${loan.months} months from ${fmt(loan.disbursedAt)}`],
            ["Balance", formatUGX(Math.max(0, balance))],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="overflow-x-auto">
          <table className="mt-6 w-full min-w-[40rem] text-left tabular">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 text-right font-medium">Charged</th>
                <th className="py-2 text-right font-medium">Paid</th>
                <th className="py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-line/60 align-top">
                  <td className="py-2.5 pr-4 whitespace-nowrap">{fmt(r.date)}</td>
                  <td className="py-2.5 pr-4">{r.text}</td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap">{r.debit ? formatUGX(r.debit) : ""}</td>
                  <td className="py-2.5 pl-3 text-right whitespace-nowrap text-forest-700">{r.credit ? formatUGX(r.credit) : ""}</td>
                  <td className="py-2.5 pl-3 text-right font-medium whitespace-nowrap">{formatUGX(Math.max(0, r.balance))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold whitespace-nowrap">
                <td className="pt-4" colSpan={2}>Totals</td>
                <td className="pt-4 text-right">{formatUGX(charged)}</td>
                <td className="pt-4 text-right">{formatUGX(paid + waived)}</td>
                <td className="pt-4 text-right">{formatUGX(Math.max(0, balance))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <footer className="mt-10 border-t border-line pt-4 text-xs leading-relaxed text-muted">
          {site.name} is licensed and regulated by the {site.regulator.name} under the {site.regulator.act}. If anything on this statement looks wrong, contact us
          within 30 days at {site.email} or {site.phones[0]}, quoting {loan.reference}.
        </footer>
      </article>
    </div>
  );
}
