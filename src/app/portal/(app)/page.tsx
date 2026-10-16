import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, FileText, Wallet } from "lucide-react";
import { requireCustomer } from "@/lib/customer-auth";
import { missingDocuments } from "@/lib/documents-config";
import { getProduct } from "@/lib/products";
import { customerApplications, customerLoans } from "@/lib/portal-data";
import { cn, formatUGX } from "@/lib/utils";

export const metadata = { title: "My account" };

const fmt = (d: string | Date) => new Date(d).toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Kampala" });

const steps = ["Received", "Under review", "Approved", "Funds sent"] as const;
const stepIndex: Record<string, number> = { new: 0, reviewing: 1, recommended: 1, approved: 2, disbursed: 3 };

export default async function PortalHome() {
  const { phone } = await requireCustomer();
  const [loans, apps] = await Promise.all([customerLoans(phone), customerApplications(phone)]);
  const active = loans.filter((l) => l.loan.status === "active");
  const closed = loans.filter((l) => l.loan.status !== "active");
  const openApps = apps.filter((a) => ["new", "reviewing", "recommended", "approved"].includes(a.status));
  const endedApps = apps.filter((a) => ["declined", "withdrawn"].includes(a.status)).slice(0, 2);

  return (
    <div className="space-y-6">
      {active.length === 0 && openApps.length === 0 && (
        <div className="rounded-3xl border border-line bg-white p-8 text-center">
          <Wallet className="mx-auto size-10 text-forest-600" strokeWidth={1.5} />
          <p className="mt-4 font-display text-3xl text-forest-950">No active loans</p>
          <p className="mt-2 text-muted">When you have a NANAM loan, your balance and payments will show here.</p>
          <Link href="/apply" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-forest-600 px-6 text-sm font-medium text-white hover:bg-forest-700">
            Apply for a loan <ArrowRight className="size-4" />
          </Link>
        </div>
      )}

      {active.map(({ loan, outstanding, paid, total, arrears, daysLate, next, settlement }) => {
        const pct = total ? Math.round((paid / total) * 100) : 0;
        return (
          <section key={loan.id} className="overflow-hidden rounded-3xl border border-line bg-white shadow-xl shadow-forest-950/5">
            {arrears > 0 && (
              <div className="flex items-start gap-3 bg-red-50 px-6 py-4 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  <strong>{formatUGX(arrears)} is overdue</strong> ({daysLate} day{daysLate === 1 ? "" : "s"}). Please pay now to keep your account in good standing.
                </p>
              </div>
            )}
            <div className="p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted">
                    {getProduct(loan.product)?.name} · <span className="font-mono">{loan.reference}</span>
                  </p>
                  <p className="mt-3 text-sm text-muted">Balance remaining</p>
                  <p className="font-display text-5xl text-forest-950 tabular">{formatUGX(outstanding)}</p>
                </div>
                {next && (
                  <div className={cn("rounded-2xl px-5 py-4", arrears > 0 ? "bg-red-50" : "bg-forest-50")}>
                    <p className="text-xs uppercase tracking-wider text-muted">{arrears > 0 ? "Pay now" : "Next payment"}</p>
                    <p className="mt-1 text-2xl font-semibold tabular text-forest-950">{formatUGX(arrears > 0 ? arrears : next.amount)}</p>
                    <p className="text-sm text-muted">{arrears > 0 ? "overdue" : `due ${fmt(next.dueDate)}`}</p>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <div className="h-2.5 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Repaid">
                  <div className="h-full rounded-full bg-lime-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 flex justify-between text-sm text-muted tabular">
                  <span>{formatUGX(paid)} repaid</span>
                  <span>{pct}%</span>
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link href={`/portal/loans/${loan.id}/pay`} className="flex h-12 items-center justify-center gap-2 rounded-full bg-forest-600 font-medium text-white hover:bg-forest-700">
                  <Wallet className="size-4" /> Pay with Mobile Money
                </Link>
                <Link href={`/portal/loans/${loan.id}`} className="flex h-12 items-center justify-center gap-2 rounded-full border border-line font-medium text-forest-800 hover:bg-cream">
                  Schedule & statement
                </Link>
              </div>
              {settlement && settlement.waived > 0 && (
                <p className="mt-4 text-center text-sm text-muted">
                  Pay off early today for <strong className="text-ink">{formatUGX(settlement.amount)}</strong> and save {formatUGX(settlement.waived)} in interest.
                </p>
              )}
            </div>
          </section>
        );
      })}

      {openApps.map((a) => {
        const at = stepIndex[a.status] ?? 0;
        return (
          <section key={a.id} className="rounded-3xl border border-line bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-muted">
                  Application <span className="font-mono">{a.reference}</span>
                </p>
                <p className="mt-1 text-xl font-medium text-forest-950">
                  {getProduct(a.product)?.name} · {formatUGX(a.approvedAmount ?? a.amount)}
                </p>
              </div>
              <Clock3 className="size-6 text-forest-600" />
            </div>
            <ol className="mt-6 grid grid-cols-4 gap-2">
              {steps.map((s, i) => (
                <li key={s}>
                  <span className={cn("block h-1.5 rounded-full", i <= at ? "bg-forest-600" : "bg-line")} />
                  <span className={cn("mt-2 block text-xs", i === at ? "font-medium text-forest-950" : "text-muted")}>{s}</span>
                </li>
              ))}
            </ol>
            {(() => {
              const missing = missingDocuments(a.product, a.documents, a.kycStatus === "verified");
              const rejected = a.documents.some((d) => d.status === "rejected");
              const needsId = a.kycStatus !== "verified" && a.kycStatus !== "review" && a.kycStatus !== "processing";
              return (
                <Link
                  href={`/portal/applications/${a.id}`}
                  className={cn(
                    "mt-5 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm",
                    needsId || missing.length || rejected ? "bg-amber-50 text-amber-900" : "bg-forest-50 text-forest-800",
                  )}
                >
                  <span>
                    {needsId
                      ? "Verify your identity (1 minute)"
                      : rejected
                      ? "A document needs replacing"
                      : missing.length
                        ? `${missing.length} document${missing.length === 1 ? "" : "s"} still needed`
                        : "All required documents uploaded"}
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    {needsId ? "Start" : missing.length || rejected ? "Upload" : "View"} <ArrowRight className="size-4" />
                  </span>
                </Link>
              );
            })()}
            <p className="mt-5 text-sm text-muted">
              {a.status === "approved"
                ? "Approved. We’re preparing your funds. Bring your original collateral documents if you haven’t already."
                : a.status === "new"
                  ? "We’ve received your application. A loan officer will call you within 24 hours."
                  : "A loan officer is reviewing your documents and collateral."}
            </p>
          </section>
        );
      })}

      {endedApps.map((a) => (
        <section key={a.id} className="rounded-3xl border border-line bg-white p-6 text-sm text-muted">
          Application <span className="font-mono">{a.reference}</span> was {a.status === "declined" ? "not approved" : "withdrawn"}. Questions? Call us and we’ll explain your options.
        </section>
      ))}

      {closed.length > 0 && (
        <section className="rounded-3xl border border-line bg-white p-6 md:p-8">
          <h2 className="font-medium text-forest-950">Completed loans</h2>
          <ul className="mt-4 divide-y divide-line">
            {closed.map(({ loan, paid }) => (
              <li key={loan.id} className="flex items-center justify-between gap-4 py-3">
                <span className="flex items-center gap-3">
                  <CheckCircle2 className="size-5 text-forest-600" />
                  <span>
                    <span className="block text-sm font-medium">{getProduct(loan.product)?.name} · {formatUGX(loan.principal)}</span>
                    <span className="block text-xs text-muted">Repaid {loan.closedAt ? fmt(loan.closedAt) : ""} · {formatUGX(paid)} total</span>
                  </span>
                </span>
                <Link href={`/portal/loans/${loan.id}/statement`} className="flex items-center gap-1.5 text-sm text-forest-700 hover:underline">
                  <FileText className="size-4" /> Statement
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
