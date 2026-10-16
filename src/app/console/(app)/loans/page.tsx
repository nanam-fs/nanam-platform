import Link from "next/link";
import { Badge, Card, Empty, FilterTabs, PageHeader, Table, fmtDate } from "@/components/console/ui";
import { requireStaff } from "@/lib/auth";
import { getProduct } from "@/lib/products";
import { loanBook } from "@/lib/queries";
import { formatUGX } from "@/lib/utils";

export const metadata = { title: "Loan book" };

const filters = ["active", "arrears", "closed", "all"] as const;
type Filter = (typeof filters)[number];

export default async function LoansPage({ searchParams }: PageProps<"/console/loans">) {
  await requireStaff();
  const sp = await searchParams;
  const filter: Filter = filters.includes(sp.filter as Filter) ? (sp.filter as Filter) : "active";
  const all = await loanBook("all");
  const rows = all.filter((r) =>
    filter === "all" ? true : filter === "closed" ? r.status !== "active" : filter === "arrears" ? r.status === "active" && r.dpd > 0 : r.status === "active",
  );
  const count = (f: Filter) =>
    all.filter((r) => (f === "all" ? true : f === "closed" ? r.status !== "active" : f === "arrears" ? r.status === "active" && r.dpd > 0 : r.status === "active")).length;
  const totalOutstanding = rows.reduce((s, r) => s + (r.status === "active" ? r.outstanding : 0), 0);

  return (
    <>
      <PageHeader title="Loan book" description={`${rows.length} loans · ${formatUGX(totalOutstanding)} outstanding (principal + interest)`} />
      <FilterTabs
        active={filter}
        tabs={filters.map((f) => ({ key: f, href: `/console/loans?filter=${f}`, label: { active: "Active", arrears: "In arrears", closed: "Closed", all: "All" }[f], count: count(f) }))}
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <Empty>No loans in this view.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Loan</th>
                <th>Borrower</th>
                <th className="text-right">Principal</th>
                <th className="text-right">Outstanding</th>
                <th>Next due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-cream/60">
                  <td>
                    <Link href={`/console/loans/${l.id}`} className="font-mono text-xs text-forest-700 hover:underline">
                      {l.reference}
                    </Link>
                    <p className="text-xs text-muted">
                      {getProduct(l.product)?.name} · {fmtDate(l.disbursed_at)}
                    </p>
                  </td>
                  <td>
                    <Link href={`/console/loans/${l.id}`} className="font-medium text-forest-950 hover:underline">
                      {l.borrower_name}
                    </Link>
                    <p className="text-xs text-muted">{l.borrower_phone}</p>
                  </td>
                  <td className="text-right tabular">{formatUGX(l.principal)}</td>
                  <td className="text-right tabular">{formatUGX(l.outstanding)}</td>
                  <td className="whitespace-nowrap">
                    {l.next_due ? (
                      <>
                        {fmtDate(l.next_due)}
                        <p className="text-xs text-muted tabular">{formatUGX(l.next_amount ?? 0)}</p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {l.status === "closed" ? (
                      <Badge tone="neutral">Repaid</Badge>
                    ) : l.status === "written_off" ? (
                      <Badge tone="bad">Written off</Badge>
                    ) : l.dpd > 30 ? (
                      <Badge tone="bad">{l.dpd} days late</Badge>
                    ) : l.dpd > 0 ? (
                      <Badge tone="progress">{l.dpd} days late</Badge>
                    ) : (
                      <Badge tone="good">Current</Badge>
                    )}
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
