import { desc, eq, sql } from "drizzle-orm";
import { ActionButton } from "@/components/console/action-form";
import { Badge, Card, Empty, FilterTabs, PageHeader, Table, fmtDate } from "@/components/console/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { site } from "@/lib/site";
import { formatUGX } from "@/lib/utils";
import { markCommissionPaid } from "../../actions";
import { AgentActions } from "./agent-actions";

export const metadata = { title: "Agents" };

const filters = ["pending", "active", "suspended", "rejected"] as const;

export default async function AgentsPage({ searchParams }: PageProps<"/console/agents">) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const status = filters.includes(sp.status as (typeof filters)[number]) ? (sp.status as (typeof filters)[number]) : "active";

  const [agents, stats, pending] = await Promise.all([
    db.query.agents.findMany({ orderBy: desc(schema.agents.createdAt) }),
    db
      .select({
        agentId: schema.applications.agentId,
        referrals: sql<number>`count(*)::int`,
        funded: sql<number>`count(*) filter (where ${schema.applications.status} = 'disbursed')::int`,
      })
      .from(schema.applications)
      .groupBy(schema.applications.agentId),
    db.query.commissions.findMany({
      where: eq(schema.commissions.status, "pending"),
      with: { agent: { columns: { fullName: true, payout: true, phone: true } }, loan: { columns: { reference: true, principal: true } } },
      orderBy: desc(schema.commissions.createdAt),
    }),
  ]);
  const rows = agents.filter((a) => a.status === status);
  const statFor = (id: string) => stats.find((s) => s.agentId === id);
  const manage = can(staff.role, "agent.manage");
  const pay = can(staff.role, "commission.pay");

  return (
    <>
      <PageHeader title="Agents & partners" description="B2B partners and individual agents who refer clients for commission." />

      {pending.length > 0 && (
        <Card title={`Commissions to pay · ${formatUGX(pending.reduce((s, c) => s + c.amount, 0))}`} padded={false} className="mb-6">
          <Table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Loan</th>
                <th className="text-right">Commission</th>
                <th>Payout</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.agent.fullName}</td>
                  <td className="font-mono text-xs">
                    {c.loan.reference} <span className="font-sans text-muted">· {formatUGX(c.loan.principal)}</span>
                  </td>
                  <td className="text-right tabular">{formatUGX(c.amount)}</td>
                  <td className="text-muted">{c.agent.payout === "mobile-money" ? `MoMo ${c.agent.phone}` : "Bank"}</td>
                  <td className="text-right">{pay && <ActionButton variant="secondary" action={markCommissionPaid.bind(null, c.id)}>Mark paid</ActionButton>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <FilterTabs
        active={status}
        tabs={filters.map((f) => ({ key: f, href: `/console/agents?status=${f}`, label: f[0].toUpperCase() + f.slice(1), count: agents.filter((a) => a.status === f).length }))}
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <Empty>No {status} agents.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Type</th>
                <th>Location</th>
                <th>Contact</th>
                <th>Referral link</th>
                <th className="text-right">Referred / funded</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const s = statFor(a.id);
                return (
                  <tr key={a.id} className="align-top">
                    <td>
                      <p className="font-medium text-forest-950">{a.fullName}</p>
                      <p className="text-xs text-muted">
                        {a.organisation ?? "Individual"} · applied {fmtDate(a.createdAt)}
                      </p>
                    </td>
                    <td>
                      <Badge>{a.type === "b2b" ? "B2B" : "P2P"}</Badge>
                    </td>
                    <td className="text-muted">
                      {a.subCounty}, {a.district}
                    </td>
                    <td className="text-xs">
                      <a href={`tel:${a.phone}`} className="block hover:underline">{a.phone}</a>
                      <a href={`mailto:${a.email}`} className="block text-muted hover:underline">{a.email}</a>
                    </td>
                    <td className="font-mono text-xs">{a.referralCode ? `${site.url.replace("https://", "")}/ref/${a.referralCode}` : "—"}</td>
                    <td className="text-right tabular">
                      {s?.referrals ?? 0} / {s?.funded ?? 0}
                    </td>
                    <td className="text-right">{manage && <AgentActions id={a.id} status={a.status} />}</td>
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
