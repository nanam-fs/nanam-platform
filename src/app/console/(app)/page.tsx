import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { AlertTriangle } from "lucide-react";
import { AgingBars, MonthlyBars } from "@/components/console/charts";
import { Badge, Card, Empty, PageHeader, Stat, StatusBadge, Table, fmtDate } from "@/components/console/ui";
import { db, schema } from "@/db";
import type { ApplicationStatus, Role } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { getProduct } from "@/lib/products";
import { arrearsAging, collectionsWorklist, monthTotals, monthlySeries, pipelineCounts, portfolioSummary } from "@/lib/queries";
import { formatUGX } from "@/lib/utils";

export const metadata = { title: "Overview" };

const queueFor: Record<Role, { statuses: ApplicationStatus[]; title: string; empty: string }> = {
  officer: { statuses: ["new", "reviewing"], title: "Applications to review", empty: "No applications waiting for review." },
  manager: { statuses: ["recommended"], title: "Awaiting your approval", empty: "Nothing awaiting approval." },
  finance: { statuses: ["approved"], title: "Approved, ready to disburse", empty: "No approved loans waiting for disbursement." },
  admin: { statuses: ["new", "reviewing", "recommended", "approved"], title: "Open applications", empty: "No open applications." },
};

export default async function Overview({ searchParams }: PageProps<"/console">) {
  const staff = await requireStaff();
  const denied = (await searchParams).denied;
  const queue = queueFor[staff.role];

  const [portfolio, month, series, aging, pipeline, worklist, apps] = await Promise.all([
    portfolioSummary(),
    monthTotals(),
    monthlySeries(),
    arrearsAging(),
    pipelineCounts(),
    collectionsWorklist(),
    db.query.applications.findMany({
      where: inArray(schema.applications.status, queue.statuses),
      orderBy: desc(schema.applications.createdAt),
      limit: 8,
    }),
  ]);

  const hour = Number(new Date().toLocaleString("en-UG", { hour: "numeric", hour12: false, timeZone: "Africa/Kampala" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      {denied && (
        <p role="alert" className="mb-6 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="size-4" /> Your role doesn’t have access to that page.
        </p>
      )}
      <PageHeader title={`${greeting}, ${staff.name.split(" ")[0]}`} description="Portfolio health and today’s work at a glance." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Outstanding portfolio" value={formatUGX(portfolio.outstanding)} hint={`${portfolio.activeLoans} active loans · principal`} />
        <Stat
          label="Portfolio at risk (PAR 30)"
          value={`${(portfolio.par30Ratio * 100).toFixed(1)}%`}
          hint={formatUGX(portfolio.par30)}
          tone={portfolio.par30Ratio > 0.05 ? "bad" : undefined}
        />
        <Stat label="In arrears" value={formatUGX(portfolio.arrears)} hint={`${portfolio.loansInArrears} loans with a missed instalment`} tone={portfolio.arrears > 0 ? "bad" : undefined} />
        <Stat label="Due in next 7 days" value={formatUGX(portfolio.due7)} hint="Expected collections" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Disbursed this month" value={formatUGX(month.disbursed)} hint={`${month.disbursedCount} loans`} />
        <Stat label="Collected this month" value={formatUGX(month.collected)} />
        <Stat label="Fee income this month" value={formatUGX(month.fees)} hint="2% processing fees" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Disbursements, last 6 months">
          <MonthlyBars data={series.map((s) => ({ month: s.month, value: s.disbursed }))} label="Principal disbursed per month" />
        </Card>
        <Card title="Portfolio aging">
          <AgingBars data={aging} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={queue.title} padded={false} actions={<Link href="/console/applications" className="text-sm text-forest-700 hover:underline">View all</Link>}>
          {apps.length === 0 ? (
            <Empty>{queue.empty}</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-cream/60">
                    <td>
                      <Link href={`/console/applications/${a.id}`} className="font-medium text-forest-950 hover:underline">
                        {a.fullName}
                      </Link>
                      <p className="text-xs text-muted">
                        {getProduct(a.product)?.name} · {fmtDate(a.createdAt)}
                      </p>
                    </td>
                    <td className="text-right tabular">{formatUGX(a.approvedAmount ?? a.amount)}</td>
                    <td>
                      <StatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Collections: overdue & due this week" padded={false} actions={<Link href="/console/loans?filter=arrears" className="text-sm text-forest-700 hover:underline">Arrears</Link>}>
          {worklist.length === 0 ? (
            <Empty>No instalments due in the next 7 days.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Due</th>
                  <th className="text-right">Owing</th>
                </tr>
              </thead>
              <tbody>
                {worklist.map((w) => (
                  <tr key={w.loan_id} className="hover:bg-cream/60">
                    <td>
                      <Link href={`/console/loans/${w.loan_id}`} className="font-medium text-forest-950 hover:underline">
                        {w.borrower_name}
                      </Link>
                      <p className="text-xs text-muted">
                        <a href={`tel:${w.borrower_phone}`} className="hover:underline">{w.borrower_phone}</a> · {w.reference}
                      </p>
                    </td>
                    <td>
                      {Number(w.dpd) > 0 ? (
                        <>
                          <Badge tone="bad">{w.dpd} days late</Badge>
                          {Number(w.missed) > 1 && <p className="mt-1 text-xs text-muted">{w.missed} instalments missed</p>}
                        </>
                      ) : (
                        <span className="text-sm">{fmtDate(w.due_date)}</span>
                      )}
                    </td>
                    <td className="text-right tabular">{formatUGX(Number(w.owing))}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card title="Pipeline" className="mt-6">
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(["new", "reviewing", "recommended", "approved", "disbursed", "declined"] as const).map((s) => (
            <li key={s}>
              <Link href={`/console/applications?status=${s}`} className="block rounded-lg border border-line p-3 hover:border-forest-600/40">
                <StatusBadge status={s} />
                <p className="mt-2 text-2xl font-semibold tabular text-forest-950">{pipeline[s] ?? 0}</p>
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
