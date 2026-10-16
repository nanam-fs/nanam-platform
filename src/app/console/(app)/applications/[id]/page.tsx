import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge, Card, DefList, PageHeader, StatusBadge, fmtDate, fmtDateTime } from "@/components/console/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { creditPolicy } from "@/lib/lending";
import { quote } from "@/lib/loan-math";
import { can } from "@/lib/permissions";
import { getProduct } from "@/lib/products";
import { formatUGX } from "@/lib/utils";
import {
  AddCollateralForm,
  CollateralActions,
  DecideForm,
  DisburseForm,
  NoteForm,
  RecommendForm,
  StartReviewButton,
  WithdrawForm,
} from "./panels";

export const metadata = { title: "Application" };

const securityLabels: Record<string, string> = {
  logbook: "Motor vehicle logbook",
  "land-title": "Land title",
  contract: "Contract / LPO + logbook or land title",
  other: "Other (to discuss)",
};

export default async function ApplicationDetail({ params }: PageProps<"/console/applications/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const app = await db.query.applications.findFirst({
    where: eq(schema.applications.id, id),
    with: {
      assignee: { columns: { name: true } },
      agent: { columns: { fullName: true, referralCode: true } },
      notes: { orderBy: desc(schema.notes.createdAt), with: { author: { columns: { name: true } } } },
      collateral: { orderBy: asc(schema.collateral.createdAt) },
      loan: { columns: { id: true, reference: true } },
    },
  });
  if (!app) notFound();

  const [recommender, decider] = await Promise.all([
    app.recommendedBy ? db.query.staff.findFirst({ where: eq(schema.staff.id, app.recommendedBy), columns: { name: true } }) : null,
    app.decidedBy ? db.query.staff.findFirst({ where: eq(schema.staff.id, app.decidedBy), columns: { name: true } }) : null,
  ]);

  const amount = app.approvedAmount ?? app.amount;
  const months = app.approvedMonths ?? app.months;
  const q = quote(amount, months);
  const dti = app.monthlyIncome > 0 ? q.monthlyInstalment / app.monthlyIncome : 1;
  const heldValue = app.collateral.filter((c) => c.status !== "released").reduce((s, c) => s + (c.valuation ?? 0), 0);
  const coverage = heldValue / amount;
  const hasHeld = app.collateral.some((c) => c.status === "held");
  const open = ["new", "reviewing", "recommended", "approved"].includes(app.status);

  return (
    <>
      <PageHeader
        back={{ href: "/console/applications", label: "Applications" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {app.fullName} <StatusBadge status={app.status} />
          </span>
        }
        description={
          <>
            <span className="font-mono">{app.reference}</span> · received {fmtDateTime(app.createdAt)} · {app.assignee ? `officer: ${app.assignee.name}` : "unassigned"}
          </>
        }
        actions={
          app.loan && (
            <Link href={`/console/loans/${app.loan.id}`} className="inline-flex h-9 items-center rounded-lg bg-forest-600 px-4 text-sm font-medium text-white hover:bg-forest-700">
              Open loan {app.loan.reference}
            </Link>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Loan request">
            <DefList
              items={[
                ["Product", getProduct(app.product)?.name ?? app.product],
                ["Requested", `${formatUGX(app.amount)} over ${app.months} months`],
                ["Recommended", app.approvedAmount ? `${formatUGX(app.approvedAmount)} over ${app.approvedMonths} months` : null],
                ["Purpose", app.purpose],
                ["Referred by", app.agent ? `${app.agent.fullName} (${app.agent.referralCode})` : app.referralCode ? `Unknown code ${app.referralCode}` : "Direct"],
                ["Security offered", `${securityLabels[app.security] ?? app.security}${app.securityDetails ? ` — ${app.securityDetails}` : ""}`],
              ]}
            />
          </Card>

          <Card title="Applicant">
            <DefList
              items={[
                ["Full name", app.fullName],
                ["NIN", <span key="nin" className="font-mono">{app.nin}</span>],
                ["Phone", <a key="tel" href={`tel:${app.phone}`} className="text-forest-700 hover:underline">{app.phone}</a>],
                ["Email", app.email],
                ["District", app.district],
                ["Income source", app.incomeSource === "both" ? "Salary and business" : app.incomeSource === "salary" ? "Salary" : "Business"],
                ["Declared monthly income", formatUGX(app.monthlyIncome)],
              ]}
            />
          </Card>

          <Card
            title="Collateral"
            actions={!hasHeld && open ? <Badge tone="progress">Original not yet received</Badge> : hasHeld ? <Badge tone="good">Held</Badge> : null}
            padded={false}
          >
            {app.collateral.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No collateral recorded yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {app.collateral.map((c) => (
                  <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-forest-950">
                        {c.description} <span className="font-mono text-xs text-muted">{c.identifier}</span>
                      </p>
                      <p className="text-xs text-muted">
                        {securityLabels[c.type]} · {c.valuation ? `valued ${formatUGX(c.valuation)}` : "not valued"}
                        {c.receivedAt && ` · received ${fmtDate(c.receivedAt)}`}
                        {c.releasedAt && ` · released ${fmtDate(c.releasedAt)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={c.status === "held" ? "good" : c.status === "released" ? "neutral" : "progress"}>{c.status}</Badge>
                      <CollateralActions id={c.id} status={c.status} canManage={can(staff.role, "collateral.manage")} canRelease={can(staff.role, "collateral.release")} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {open && can(staff.role, "collateral.manage") && (
              <div className="border-t border-line p-5">
                <AddCollateralForm applicationId={app.id} defaultType={app.security === "other" ? "logbook" : (app.security as "logbook" | "land-title" | "contract")} />
              </div>
            )}
          </Card>

          <Card title="Notes & history">
            {open && can(staff.role, "application.review") && <NoteForm applicationId={app.id} />}
            <ol className="mt-5 space-y-4">
              {app.notes.map((n) => (
                <li key={n.id} className="border-l-2 border-line pl-4">
                  <p className="whitespace-pre-wrap text-sm text-ink">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {n.author.name} · {fmtDateTime(n.createdAt)}
                  </p>
                </li>
              ))}
              <li className="border-l-2 border-line pl-4">
                <p className="text-sm text-ink">Application submitted online.</p>
                <p className="mt-1 text-xs text-muted">{fmtDateTime(app.createdAt)}</p>
              </li>
            </ol>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <Card title="Credit assessment">
            <dl className="space-y-2.5 text-sm tabular">
              <Row k="Monthly instalment" v={formatUGX(q.monthlyInstalment)} strong />
              <Row k="Processing fee (deducted)" v={formatUGX(q.processingFee)} />
              <Row k="Net disbursement" v={formatUGX(q.netDisbursed)} />
              <Row k="Total interest" v={formatUGX(q.totalInterest)} />
              <Row k="Total repayable" v={formatUGX(q.totalRepayable)} />
            </dl>
            <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
              <Check
                ok={dti <= creditPolicy.maxDebtToIncome}
                label={`Instalment is ${(dti * 100).toFixed(0)}% of declared income`}
                hint={
                  dti <= creditPolicy.maxDebtToIncome
                    ? `Within the ${creditPolicy.maxDebtToIncome * 100}% affordability guide`
                    : `Above the ${creditPolicy.maxDebtToIncome * 100}% affordability guide — verify income or reduce amount`
                }
              />
              <Check
                ok={coverage >= creditPolicy.minCollateralCover}
                label={heldValue ? `Collateral cover ${coverage.toFixed(2)}×` : "Collateral not valued yet"}
                hint={
                  coverage >= creditPolicy.minCollateralCover
                    ? `Meets ${creditPolicy.minCollateralCover}× cover guide`
                    : `Guide: valuation at least ${creditPolicy.minCollateralCover}× the loan amount`
                }
              />
              {app.product === "asset-finance" && <Check ok={false} warnOnly label="Confirm 50% down payment receipt" hint="Asset finance requires evidence of the client’s 50% contribution" />}
            </div>
          </Card>

          {app.status === "new" && can(staff.role, "application.review") && (
            <Card title="Next step">
              <p className="mb-4 text-sm text-muted">Take ownership to start verifying documents and collateral.</p>
              <StartReviewButton id={app.id} />
            </Card>
          )}

          {app.status === "reviewing" && can(staff.role, "application.recommend") && (
            <Card title="Recommend for approval">
              <RecommendForm id={app.id} amount={app.amount} months={app.months} />
            </Card>
          )}

          {app.status === "recommended" && (
            <Card title="Credit decision">
              <p className="mb-4 text-sm text-muted">
                Recommended by <strong className="text-ink">{recommender?.name}</strong>: {formatUGX(app.approvedAmount ?? 0)} over {app.approvedMonths} months.
              </p>
              {can(staff.role, "application.decide") ? (
                app.recommendedBy === staff.id ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">You recommended this loan. A different manager must make the decision.</p>
                ) : (
                  <DecideForm id={app.id} />
                )
              ) : (
                <p className="text-sm text-muted">Waiting for a credit manager.</p>
              )}
            </Card>
          )}

          {app.status === "approved" && (
            <Card title="Disbursement">
              <p className="mb-4 text-sm text-muted">
                Approved by <strong className="text-ink">{decider?.name}</strong> on {fmtDate(app.decidedAt)}. Pay out{" "}
                <strong className="text-ink">{formatUGX(q.netDisbursed)}</strong> ({formatUGX(amount)} less the 2% fee).
              </p>
              {!hasHeld ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Record the original collateral as held before disbursing.</p>
              ) : can(staff.role, "loan.disburse") ? (
                <DisburseForm id={app.id} />
              ) : (
                <p className="text-sm text-muted">Waiting for finance to disburse.</p>
              )}
            </Card>
          )}

          {app.decisionNote && (
            <Card title="Officer’s assessment">
              <p className="whitespace-pre-wrap text-sm">{app.decisionNote}</p>
            </Card>
          )}

          {["new", "reviewing", "approved"].includes(app.status) && can(staff.role, "application.withdraw") && (
            <Card title="Withdraw">
              <WithdrawForm id={app.id} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className={strong ? "font-semibold text-forest-950" : ""}>{v}</dd>
    </div>
  );
}

function Check({ ok, label, hint, warnOnly }: { ok: boolean; label: string; hint: string; warnOnly?: boolean }) {
  return (
    <div className="flex gap-2.5">
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest-600" aria-label="Pass" />
      ) : (
        <AlertTriangle className={`mt-0.5 size-4 shrink-0 ${warnOnly ? "text-amber-600" : "text-red-600"}`} aria-label="Check" />
      )}
      <div>
        <p className="font-medium text-ink">{label}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </div>
  );
}
