import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { Badge, Card, DefList, PageHeader, Stat, Table, fmtDate } from "@/components/console/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { daysPastDue, settlementQuote } from "@/lib/lending";
import { can } from "@/lib/permissions";
import { getProduct } from "@/lib/products";
import { today } from "@/lib/queries";
import { formatUGX } from "@/lib/utils";
import { RepaymentForm } from "./repayment-form";

export const metadata = { title: "Loan" };

const methodLabel = { mobile_money: "Mobile Money", bank: "Bank", cash: "Cash" } as const;

export default async function LoanDetail({ params }: PageProps<"/console/loans/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const loan = await db.query.loans.findFirst({
    where: eq(schema.loans.id, id),
    with: {
      installments: { orderBy: asc(schema.installments.seq) },
      repayments: { orderBy: desc(schema.repayments.receivedAt), with: { recorder: { columns: { name: true } } } },
      application: { columns: { id: true, reference: true, nin: true }, with: { collateral: true } },
      commission: { with: { agent: { columns: { fullName: true } } } },
      paymentRequests: { orderBy: desc(schema.paymentRequests.createdAt), limit: 20 },
    },
  });
  if (!loan) notFound();
  const disburser = await db.query.staff.findFirst({ where: eq(schema.staff.id, loan.disbursedBy), columns: { name: true } });

  const t = today();
  const outstanding = loan.installments.reduce((s, i) => s + i.amountDue - i.amountPaid, 0);
  const paid = loan.repayments.reduce((s, r) => s + r.amount, 0);
  const arrears = loan.installments.filter((i) => i.dueDate < t).reduce((s, i) => s + i.amountDue - i.amountPaid, 0);
  const next = loan.installments.find((i) => i.amountPaid < i.amountDue);
  const settlement = settlementQuote(loan.installments, t);
  const refundDue = loan.paymentRequests.filter((p) => p.excess > 0);

  return (
    <>
      <PageHeader
        back={{ href: "/console/loans", label: "Loan book" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {loan.borrowerName}
            {loan.status === "closed" ? <Badge tone="neutral">Repaid</Badge> : arrears > 0 ? <Badge tone="bad">In arrears</Badge> : <Badge tone="good">Current</Badge>}
          </span>
        }
        description={
          <>
            <span className="font-mono">{loan.reference}</span> · {getProduct(loan.product)?.name} · disbursed {fmtDate(loan.disbursedAt)} ·{" "}
            <Link href={`/console/applications/${loan.application.id}`} className="text-forest-700 hover:underline">
              application {loan.application.reference}
            </Link>
          </>
        }
      />

      {refundDue.length > 0 && (
        <p role="alert" className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Refund due:</strong> {refundDue.map((p) => `${formatUGX(p.excess)} from ${p.payerMsisdn} (${p.providerTxnId ?? p.providerRef})`).join("; ")}.
          The client paid more than was owed via Mobile Money.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Outstanding" value={formatUGX(outstanding)} hint="Remaining scheduled instalments" />
        <Stat label="In arrears" value={formatUGX(arrears)} tone={arrears > 0 ? "bad" : undefined} hint={arrears > 0 && next ? `${daysPastDue(next.dueDate, t)} days past due` : "Nothing overdue"} />
        <Stat label="Repaid to date" value={formatUGX(paid)} hint={`${loan.repayments.length} payments`} />
        <Stat
          label="Early settlement today"
          value={loan.status === "active" ? formatUGX(settlement.amount) : "—"}
          hint={settlement.waived ? `Saves the client ${formatUGX(settlement.waived)} in future interest` : "Overdue + current period"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card title="Repayment schedule" padded={false}>
            <Table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due</th>
                  <th className="text-right">Principal</th>
                  <th className="text-right">Interest</th>
                  <th className="text-right">Instalment</th>
                  <th className="text-right">Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {loan.installments.map((i) => {
                  const settled = i.amountPaid >= i.amountDue;
                  const late = !settled && i.dueDate < t;
                  return (
                    <tr key={i.id}>
                      <td>{i.seq}</td>
                      <td className="whitespace-nowrap">{fmtDate(i.dueDate)}</td>
                      <td className="text-right">{formatUGX(i.principalDue)}</td>
                      <td className="text-right text-muted">{formatUGX(i.interestDue)}</td>
                      <td className="text-right font-medium">{formatUGX(i.amountDue)}</td>
                      <td className="text-right">{formatUGX(i.amountPaid)}</td>
                      <td>
                        {settled ? (
                          <Badge tone="good">Paid {fmtDate(i.paidAt)}</Badge>
                        ) : late ? (
                          <Badge tone="bad">{daysPastDue(i.dueDate, t)} days late</Badge>
                        ) : i.amountPaid > 0 ? (
                          <Badge tone="progress">Part paid</Badge>
                        ) : (
                          <Badge>Upcoming</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>

          {loan.paymentRequests.length > 0 && (
            <Card title="Mobile Money requests from the portal" padded={false}>
              <Table>
                <thead>
                  <tr>
                    <th>Requested</th>
                    <th>Payer</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.paymentRequests.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                      <td className="text-xs">
                        {p.network === "mtn" ? "MTN" : "Airtel"} {p.payerMsisdn}
                        <p className="font-mono text-muted">{p.providerTxnId ?? p.provider}</p>
                      </td>
                      <td className="text-right tabular">{formatUGX(p.amount)}</td>
                      <td>
                        <Badge tone={p.status === "successful" ? "good" : p.status === "failed" ? "bad" : "progress"}>{p.status}</Badge>
                        {p.failureReason && <p className="mt-1 text-xs text-muted">{p.failureReason}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}

          <Card title="Payments received" padded={false}>
            {loan.repayments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No payments yet.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th className="text-right">Amount</th>
                    <th>Recorded by</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.repayments.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">{fmtDate(r.receivedAt)}</td>
                      <td>{methodLabel[r.method]}</td>
                      <td className="font-mono text-xs">{r.reference}</td>
                      <td className="text-right tabular">{formatUGX(r.amount)}</td>
                      <td className="text-muted">{r.recorder?.name ?? "Customer (Mobile Money)"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {loan.status === "active" && can(staff.role, "loan.repayment") && (
            <Card title="Record a repayment">
              <RepaymentForm loanId={loan.id} suggested={next ? next.amountDue - next.amountPaid : 0} max={outstanding} settlement={settlement.amount} />
            </Card>
          )}
          <Card title="Loan terms">
            <DefList
              items={[
                ["Principal", formatUGX(loan.principal)],
                ["Rate", `${loan.monthlyRate}% per month, reducing balance`],
                ["Term", `${loan.months} months`],
                ["Processing fee", `${formatUGX(loan.processingFee)} (deducted)`],
                ["Paid out", `${formatUGX(loan.netDisbursed)} via ${methodLabel[loan.disbursementMethod]}`],
                ["Payout reference", <span key="r" className="font-mono text-xs">{loan.disbursementRef}</span>],
                ["Disbursed by", disburser?.name],
                ["Phone", <a key="p" href={`tel:${loan.borrowerPhone}`} className="text-forest-700 hover:underline">{loan.borrowerPhone}</a>],
              ]}
            />
          </Card>
          <Card title="Collateral">
            <ul className="space-y-2 text-sm">
              {loan.application.collateral.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <span>
                    {c.description} <span className="font-mono text-xs text-muted">{c.identifier}</span>
                  </span>
                  <Badge tone={c.status === "held" ? "good" : "neutral"}>{c.status}</Badge>
                </li>
              ))}
            </ul>
            {loan.status === "closed" && loan.application.collateral.some((c) => c.status === "held") && (
              <p className="mt-4 rounded-lg bg-forest-50 px-3 py-2 text-sm text-forest-800">
                Loan repaid. Release collateral from the{" "}
                <Link href={`/console/applications/${loan.application.id}`} className="underline">
                  application
                </Link>
                .
              </p>
            )}
          </Card>
          {loan.commission && (
            <Card title="Agent commission">
              <p className="text-sm">
                {loan.commission.agent.fullName}: <strong>{formatUGX(loan.commission.amount)}</strong> · {loan.commission.status}
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
