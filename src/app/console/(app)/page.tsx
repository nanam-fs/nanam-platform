import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { PortfolioChart, Sparkline } from "@/components/console/area-chart";
import { AgingBars } from "@/components/console/charts";
import { Badge, Card, Empty, StatusBadge, Table, fmtDate } from "@/components/console/ui";
import { db, schema } from "@/db";
import type { ApplicationStatus, Role } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getProduct } from "@/lib/products";
import { arrearsAging, collectionsWorklist, monthOverMonth, pipelineCounts, portfolioSummary, weeklySeries, workCounts } from "@/lib/queries";
import { cn, formatUGX } from "@/lib/utils";

export const metadata = { title: "Overview" };

const queueFor: Record<Role, { statuses: ApplicationStatus[]; title: string; empty: string }> = {
  officer: { statuses: ["new", "reviewing"], title: "Applications to review", empty: "No applications waiting for review." },
  manager: { statuses: ["recommended"], title: "Awaiting your approval", empty: "Nothing awaiting approval." },
  finance: { statuses: ["approved"], title: "Approved, ready to disburse", empty: "No approved loans waiting for disbursement." },
  admin: { statuses: ["new", "reviewing", "recommended", "approved"], title: "Open applications", empty: "No open applications." },
};

function Delta({ now, prev, invert }: { now: number; prev: number; invert?: boolean }) {
  if (!prev) return <span className="text-xs text-muted">no prior month</span>;
  const pct = ((now - prev) / prev) * 100;
  const good = invert ? pct <= 0 : pct >= 0;
  const Icon = pct >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular", good ? "text-forest-700" : "text-red-700")}>
      <Icon className="size-3.5" />
      {Math.abs(pct).toFixed(0)}% vs last month
    </span>
  );
}

export default async function Overview({ searchParams }: PageProps<"/console">) {
  const staff = await requireStaff();
  const denied = (await searchParams).denied;
  const queue = queueFor[staff.role];

  const [portfolio, weeks, mom, aging, pipeline, worklist, work, apps] = await Promise.all([
    portfolioSummary(),
    weeklySeries(26),
    monthOverMonth(),
    arrearsAging(),
    pipelineCounts(),
    collectionsWorklist(),
    workCounts(),
    db.query.applications.findMany({ where: inArray(schema.applications.status, queue.statuses), orderBy: desc(schema.applications.createdAt), limit: 6 }),
  ]);

  const now = new Date();
  const hour = Number(now.toLocaleString("en-UG", { hour: "numeric", hour12: false, timeZone: "Africa/Kampala" }));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Kampala" });

  // What's waiting, shown only for queues this person can act on.
  const tasks = [
    { n: work.new + work.reviewing, label: "to review", href: "/console/applications?status=new", show: can(staff.role, "application.review") },
    { n: work.recommended, label: "to approve", href: "/console/applications?status=recommended", show: can(staff.role, "application.decide") },
    { n: work.approved, label: "to disburse", href: "/console/applications?status=approved", show: can(staff.role, "loan.disburse") },
    { n: work.kyc_review, label: "identity checks to review", href: "/console/applications", show: can(staff.role, "kyc.decide") },
    { n: work.docs_pending, label: "documents to verify", href: "/console/applications", show: can(staff.role, "application.review") },
    { n: work.refunds_approve, label: "refunds to approve", href: "/console/refunds?status=pending_approval", show: can(staff.role, "refund.approve") },
    { n: work.refunds_pay, label: "refunds to pay", href: "/console/refunds?status=approved", show: can(staff.role, "refund.pay") },
    { n: portfolio.loansInArrears, label: "loans in arrears", href: "/console/loans?filter=arrears", show: true },
  ].filter((t) => t.show && t.n > 0);

  const last8 = weeks.slice(-8);
  const kpis = [
    { label: "Collected this month", value: formatUGX(mom.collected.now), delta: <Delta now={mom.collected.now} prev={mom.collected.prev} />, spark: last8.map((w) => w.collected) },
    { label: "Disbursed this month", value: formatUGX(mom.disbursed.now), delta: <Delta now={mom.disbursed.now} prev={mom.disbursed.prev} />, spark: last8.map((w) => w.disbursed) },
    { label: "Applications this month", value: String(mom.applications.now), delta: <Delta now={mom.applications.now} prev={mom.applications.prev} />, spark: last8.map((w) => w.loans) },
    {
      label: "Portfolio at risk (PAR 30)",
      value: `${(portfolio.par30Ratio * 100).toFixed(1)}%`,
      delta: <span className="text-xs text-muted tabular">{formatUGX(portfolio.par30)} over 30 days late</span>,
      bad: portfolio.par30Ratio > 0.05,
    },
  ];

  return (
    <>
      {denied && (
        <p role="alert" className="mb-6 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="size-4" /> Your role doesn’t have access to that page.
        </p>
      )}

      <header className="mb-8">
        <p className="text-sm text-muted">{today}</p>
        <h1 className="mt-1 font-display text-4xl tracking-tight text-forest-950">
          {greeting}, {staff.name.split(" ")[0]}
        </h1>
        {tasks.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {tasks.map((t) => (
              <li key={t.label}>
                <Link href={t.href} className="group inline-flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pr-3 pl-1.5 text-sm transition-colors hover:border-forest-600/40">
                  <span className="grid h-6 min-w-6 place-items-center rounded-full bg-forest-950 px-1.5 text-xs font-semibold text-lime-400 tabular">{t.n}</span>
                  {t.label}
                  <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">You’re all caught up. Nothing is waiting on you.</p>
        )}
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
        <section className="rounded-2xl border border-line bg-white p-6">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-5">
            <div>
              <p className="text-sm text-muted">Outstanding portfolio · principal</p>
              <p className="font-display text-5xl tracking-tight text-forest-950 tabular">{formatUGX(portfolio.outstanding)}</p>
            </div>
            <p className="text-sm text-muted">
              {portfolio.activeLoans} active loans · {formatUGX(portfolio.due7)} due in 7 days
            </p>
          </div>
          <PortfolioChart data={weeks} />
        </section>
        <Card title="Portfolio aging">
          <AgingBars data={aging} />
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-5 text-sm">
            <div>
              <p className="text-muted">In arrears</p>
              <p className={cn("mt-0.5 font-semibold tabular", portfolio.arrears ? "text-red-700" : "text-ink")}>{formatUGX(portfolio.arrears)}</p>
            </div>
            <div>
              <p className="text-muted">Loans late</p>
              <p className="mt-0.5 font-semibold tabular">{portfolio.loansInArrears}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-line bg-white p-5">
            <p className="text-sm text-muted">{k.label}</p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className={cn("whitespace-nowrap text-[1.35rem] font-semibold tracking-tight tabular", k.bad ? "text-red-700" : "text-forest-950")}>{k.value}</p>
              {k.spark && <Sparkline values={k.spark} className="text-forest-500" />}
            </div>
            <div className="mt-1.5">{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={queue.title} padded={false} actions={<Link href="/console/applications" className="text-sm text-forest-700 hover:underline">View all</Link>}>
          {apps.length === 0 ? (
            <Empty>{queue.empty}</Empty>
          ) : (
            <Table>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} className="group hover:bg-cream/60">
                    <td>
                      <Link href={`/console/applications/${a.id}`} className="font-medium text-forest-950 group-hover:underline">
                        {a.fullName}
                      </Link>
                      <p className="text-xs text-muted">
                        {getProduct(a.product)?.name} · {fmtDate(a.createdAt)}
                      </p>
                    </td>
                    <td className="text-right tabular">{formatUGX(a.approvedAmount ?? a.amount)}</td>
                    <td className="text-right">
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
              <tbody>
                {worklist.map((w) => (
                  <tr key={w.loan_id} className="group hover:bg-cream/60">
                    <td>
                      <Link href={`/console/loans/${w.loan_id}`} className="font-medium text-forest-950 group-hover:underline">
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

      <Card title="Pipeline" className="mt-4">
        <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {(["new", "reviewing", "recommended", "approved", "disbursed", "declined"] as const).map((s) => (
            <li key={s} className="bg-white">
              <Link href={`/console/applications?status=${s}`} className="block p-4 transition-colors hover:bg-cream">
                <StatusBadge status={s} />
                <p className="mt-3 font-display text-3xl tracking-tight text-forest-950 tabular">{pipeline[s] ?? 0}</p>
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
