import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Card, Empty, FilterTabs, PageHeader, StatusBadge, Table, fmtDate } from "@/components/console/ui";
import { db, schema } from "@/db";
import type { ApplicationStatus } from "@/db/schema";
import { requireStaff } from "@/lib/auth";
import { statusLabels } from "@/lib/lending";
import { getProduct } from "@/lib/products";
import { pipelineCounts } from "@/lib/queries";
import { formatUGX } from "@/lib/utils";

export const metadata = { title: "Applications" };

const tabs: (ApplicationStatus | "all")[] = ["all", "new", "reviewing", "recommended", "approved", "disbursed", "declined", "withdrawn"];

export default async function ApplicationsPage({ searchParams }: PageProps<"/console/applications">) {
  await requireStaff();
  const sp = await searchParams;
  const status = (tabs.includes(sp.status as ApplicationStatus) ? sp.status : "all") as ApplicationStatus | "all";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const where: SQL[] = [];
  if (status !== "all") where.push(eq(schema.applications.status, status));
  if (q) {
    const like = `%${q}%`;
    where.push(
      or(
        ilike(schema.applications.fullName, like),
        ilike(schema.applications.reference, like),
        ilike(schema.applications.phone, like),
        ilike(schema.applications.nin, like),
      )!,
    );
  }

  const [rows, counts] = await Promise.all([
    db.query.applications.findMany({
      where: where.length ? and(...where) : undefined,
      orderBy: desc(schema.applications.createdAt),
      limit: 200,
      with: { assignee: { columns: { name: true } }, agent: { columns: { fullName: true } } },
    }),
    pipelineCounts(),
  ]);
  const total = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
  const qs = (s: string) => `/console/applications?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader title="Applications" description="Every loan request from the website, branch and agents." />
      <form className="mb-4 flex gap-2" role="search">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, reference, phone or NIN"
          aria-label="Search applications"
          className="h-9 w-full max-w-md rounded-lg border border-line bg-white px-3 text-sm focus:border-forest-600 focus:outline-none"
        />
        <button className="h-9 rounded-lg border border-line bg-white px-4 text-sm hover:bg-cream">Search</button>
      </form>
      <FilterTabs
        active={status}
        tabs={tabs.map((t) => ({ key: t, href: qs(t), label: t === "all" ? "All" : statusLabels[t], count: t === "all" ? total : counts[t] ?? 0 }))}
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <Empty>No applications match.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Applicant</th>
                <th>Product</th>
                <th className="text-right">Amount</th>
                <th>Term</th>
                <th>Status</th>
                <th>Officer</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-cream/60">
                  <td className="font-mono text-xs">
                    <Link href={`/console/applications/${a.id}`} className="text-forest-700 hover:underline">
                      {a.reference}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/console/applications/${a.id}`} className="font-medium text-forest-950 hover:underline">
                      {a.fullName}
                    </Link>
                    <p className="text-xs text-muted">
                      {a.district}
                      {a.agent && ` · via ${a.agent.fullName}`}
                    </p>
                  </td>
                  <td className="whitespace-nowrap">{getProduct(a.product)?.name ?? a.product}</td>
                  <td className="text-right tabular whitespace-nowrap">{formatUGX(a.approvedAmount ?? a.amount)}</td>
                  <td className="tabular">{a.approvedMonths ?? a.months} mo</td>
                  <td>
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="whitespace-nowrap text-muted">{a.assignee?.name ?? "Unassigned"}</td>
                  <td className="whitespace-nowrap text-muted">{fmtDate(a.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
