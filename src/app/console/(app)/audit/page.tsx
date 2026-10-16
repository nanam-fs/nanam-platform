import { desc } from "drizzle-orm";
import { Card, PageHeader, Table, fmtDateTime } from "@/components/console/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireStaff("audit.view");
  const rows = await db.query.auditLog.findMany({
    orderBy: desc(schema.auditLog.createdAt),
    limit: 300,
    with: { actor: { columns: { name: true } } },
  });
  return (
    <>
      <PageHeader title="Audit log" description="Every sign-in, decision, disbursement and repayment. Entries cannot be edited." />
      <Card padded={false}>
        <Table>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap text-muted">{fmtDateTime(r.createdAt)}</td>
                <td className="whitespace-nowrap">{r.actor?.name ?? <span className="text-muted">Website / system</span>}</td>
                <td className="font-mono text-xs">{r.action}</td>
                <td className="max-w-md truncate font-mono text-xs text-muted" title={JSON.stringify(r.detail)}>
                  {Object.entries(r.detail).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
