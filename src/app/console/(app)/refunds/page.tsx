import Link from "next/link";
import { desc } from "drizzle-orm";
import { Badge, Card, Empty, FilterTabs, PageHeader, Stat, Table, fmtDateTime, type Tone } from "@/components/console/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatUGX } from "@/lib/utils";
import { DecideRefundForm, PayRefundForm } from "./refund-forms";

export const metadata = { title: "Refunds" };

// Notices arrive via the URL after an action; only echo ones this app produces.
const knownNotices = ["Approved. Finance can now pay it out.", "Refund rejected.", "Refund recorded as paid. The client has been notified by SMS."];

const statuses = ["pending_approval", "approved", "paid", "rejected"] as const;
type Status = (typeof statuses)[number];
const label: Record<Status, string> = { pending_approval: "Awaiting approval", approved: "Ready to pay", paid: "Paid", rejected: "Rejected" };
const tone: Record<Status, Tone> = { pending_approval: "progress", approved: "info", paid: "good", rejected: "neutral" };

export default async function RefundsPage({ searchParams }: PageProps<"/console/refunds">) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const all = await db.query.refunds.findMany({
    orderBy: desc(schema.refunds.createdAt),
    with: {
      loan: { columns: { id: true, reference: true, borrowerName: true } },
      paymentRequest: { columns: { providerTxnId: true, providerRef: true, amount: true, completedAt: true } },
      decider: { columns: { name: true } },
      payer: { columns: { name: true } },
    },
  });
  // Default to the queue this person can act on.
  const fallback: Status = can(staff.role, "refund.approve") ? "pending_approval" : "approved";
  const status = statuses.includes(sp.status as Status) ? (sp.status as Status) : fallback;
  const rows = all.filter((r) => r.status === status);
  const owed = all.filter((r) => r.status === "pending_approval" || r.status === "approved").reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <PageHeader title="Refunds" description="Money clients paid that NANAM must return. A manager approves each refund; a different person in finance pays it out." />
      {typeof sp.notice === "string" && knownNotices.includes(sp.notice) && (
        <p role="status" className="mb-6 rounded-lg bg-forest-50 px-4 py-3 text-sm text-forest-800">
          {sp.notice}
        </p>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Owed to clients" value={formatUGX(owed)} tone={owed > 0 ? "bad" : undefined} hint="Awaiting approval or payout" />
        <Stat label="Awaiting approval" value={all.filter((r) => r.status === "pending_approval").length} />
        <Stat label="Ready to pay" value={all.filter((r) => r.status === "approved").length} />
      </div>
      <FilterTabs
        active={status}
        tabs={statuses.map((s) => ({ key: s, href: `/console/refunds?status=${s}`, label: label[s], count: all.filter((r) => r.status === s).length }))}
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <Empty>Nothing {label[status].toLowerCase()}.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Client</th>
                <th className="text-right">Refund</th>
                <th>Pay to</th>
                <th>Reason</th>
                <th>{status === "paid" ? "Paid" : status === "rejected" ? "Decision" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td>
                    <Link href={`/console/loans/${r.loan.id}`} className="font-medium text-forest-950 hover:underline">{r.loan.borrowerName}</Link>
                    <p className="text-xs text-muted">
                      <span className="font-mono">{r.loan.reference}</span> · opened {fmtDateTime(r.createdAt)}
                    </p>
                    <p className="text-xs text-muted">
                      From payment {formatUGX(r.paymentRequest.amount)} · <span className="font-mono">{r.paymentRequest.providerTxnId ?? r.paymentRequest.providerRef}</span>
                    </p>
                  </td>
                  <td className="text-right font-semibold tabular whitespace-nowrap">{formatUGX(r.amount)}</td>
                  <td className="whitespace-nowrap">
                    {r.network === "mtn" ? "MTN" : "Airtel"} {r.payeeMsisdn}
                  </td>
                  <td className="max-w-56 text-muted">{r.reason}</td>
                  <td className="min-w-64">
                    <Badge tone={tone[r.status]}>{label[r.status]}</Badge>
                    {r.decider && (
                      <p className="mt-1 text-xs text-muted">
                        {r.status === "rejected" ? "Rejected" : "Approved"} by {r.decider.name}: {r.decisionNote}
                      </p>
                    )}
                    {r.status === "paid" && (
                      <p className="mt-1 text-xs text-muted">
                        Paid by {r.payer?.name} {fmtDateTime(r.paidAt)} · <span className="font-mono">{r.payoutRef}</span>
                      </p>
                    )}
                    {r.status === "pending_approval" && can(staff.role, "refund.approve") && <DecideRefundForm id={r.id} />}
                    {r.status === "approved" && can(staff.role, "refund.pay") &&
                      (r.decidedBy === staff.id ? (
                        <p className="mt-2 text-xs text-amber-800">You approved this, so someone else must pay it.</p>
                      ) : (
                        <PayRefundForm id={r.id} />
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
