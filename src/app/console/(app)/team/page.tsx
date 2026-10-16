import { asc } from "drizzle-orm";
import { Badge, Card, PageHeader, Table, fmtDateTime } from "@/components/console/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { roleLabels } from "@/lib/permissions";
import { CreateStaffForm, StaffRowForm } from "./team-forms";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireStaff("staff.manage");
  const team = await db.query.staff.findMany({ orderBy: asc(schema.staff.name), columns: { passwordHash: false } });
  return (
    <>
      <PageHeader title="Team" description="Who can access the console, and what they can do." />
      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <Card padded={false}>
          <Table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role & access</th>
                <th>Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {team.map((s) => (
                <tr key={s.id} className="align-top">
                  <td>
                    <p className="font-medium text-forest-950">
                      {s.name} {s.id === me.id && <Badge tone="info">You</Badge>} {!s.active && <Badge tone="bad">Disabled</Badge>}
                    </p>
                    <p className="text-xs text-muted">{s.email}</p>
                  </td>
                  <td>
                    <StaffRowForm id={s.id} role={s.role} active={s.active} />
                  </td>
                  <td className="whitespace-nowrap text-muted">{fmtDateTime(s.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <div className="space-y-6">
          <Card title="Add a team member">
            <CreateStaffForm />
          </Card>
          <Card title="Roles">
            <dl className="space-y-3 text-sm">
              {[
                ["officer", "Reviews applications, records collateral, recommends loans."],
                ["manager", "Approves or declines recommendations (never their own), manages agents, releases collateral."],
                ["finance", "Disburses approved loans, records repayments, pays commissions."],
                ["admin", "Everything, plus team management and the audit log."],
              ].map(([r, d]) => (
                <div key={r}>
                  <dt className="font-medium">{roleLabels[r as keyof typeof roleLabels]}</dt>
                  <dd className="text-muted">{d}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
