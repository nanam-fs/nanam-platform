import Link from "next/link";
import { desc } from "drizzle-orm";
import { Badge, Card, Empty, FilterTabs, PageHeader, Stat, Table, fmtDate } from "@/components/console/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { formatUGX } from "@/lib/utils";

export const metadata = { title: "Collateral register" };

const typeLabel = { logbook: "Logbook", "land-title": "Land title", contract: "Contract / LPO" } as const;
const filters = ["held", "pending", "released"] as const;

export default async function CollateralPage({ searchParams }: PageProps<"/console/collateral">) {
  await requireStaff();
  const sp = await searchParams;
  const status = filters.includes(sp.status as (typeof filters)[number]) ? (sp.status as (typeof filters)[number]) : "held";
  const all = await db.query.collateral.findMany({
    orderBy: desc(schema.collateral.createdAt),
    with: { application: { columns: { id: true, fullName: true, reference: true, status: true }, with: { loan: { columns: { status: true, reference: true } } } } },
  });
  const rows = all.filter((c) => c.status === status);
  const held = all.filter((c) => c.status === "held");
  const awaitingRelease = held.filter((c) => c.application.loan?.status === "closed" || ["declined", "withdrawn"].includes(c.application.status));

  return (
    <>
      <PageHeader title="Collateral register" description="Original logbooks, land titles and contracts in NANAM’s safe custody." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Items in custody" value={held.length} />
        <Stat label="Value in custody" value={formatUGX(held.reduce((s, c) => s + (c.valuation ?? 0), 0))} hint="Where valued" />
        <Stat label="Due for release" value={awaitingRelease.length} hint="Loan repaid or application closed" tone={awaitingRelease.length ? "bad" : undefined} />
      </div>
      <FilterTabs
        active={status}
        tabs={filters.map((f) => ({ key: f, href: `/console/collateral?status=${f}`, label: { held: "In custody", pending: "Awaiting original", released: "Released" }[f], count: all.filter((c) => c.status === f).length }))}
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <Empty>Nothing here.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Identifier</th>
                <th>Client</th>
                <th className="text-right">Valuation</th>
                <th>Loan</th>
                <th>{status === "released" ? "Released" : "Received"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const due = c.status === "held" && (c.application.loan?.status === "closed" || ["declined", "withdrawn"].includes(c.application.status));
                return (
                  <tr key={c.id} className="hover:bg-cream/60">
                    <td>
                      <p className="font-medium text-forest-950">{c.description}</p>
                      <p className="text-xs text-muted">{typeLabel[c.type]}</p>
                    </td>
                    <td className="font-mono text-xs">{c.identifier}</td>
                    <td>
                      <Link href={`/console/applications/${c.application.id}`} className="hover:underline">
                        {c.application.fullName}
                      </Link>
                    </td>
                    <td className="text-right tabular">{c.valuation ? formatUGX(c.valuation) : "—"}</td>
                    <td>
                      {c.application.loan ? (
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs">{c.application.loan.reference}</span>
                          {due ? <Badge tone="progress">Release due</Badge> : <Badge tone={c.application.loan.status === "closed" ? "neutral" : "good"}>{c.application.loan.status}</Badge>}
                        </span>
                      ) : (
                        <span className="text-muted">Not disbursed</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-muted">{fmtDate(status === "released" ? c.releasedAt : c.receivedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
