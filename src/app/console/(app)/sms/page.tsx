import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Badge, Card, Empty, PageHeader, Stat, Table, fmtDateTime } from "@/components/console/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { previewReminders } from "@/lib/notifications";
import { can } from "@/lib/permissions";
import { smsConfigured } from "@/lib/sms";
import { SendNow } from "./send-now";

export const metadata = { title: "SMS & reminders" };

const kindLabel: Record<string, string> = {
  due_soon: "Due in 3 days",
  due_today: "Due today",
  overdue_1: "Overdue",
  overdue_7: "Overdue 7+ days",
  overdue_30: "Overdue 30+ days",
  receipt: "Payment receipt",
  disbursed: "Loan disbursed",
};

export default async function SmsPage() {
  const staff = await requireStaff();
  const [preview, log, [month]] = await Promise.all([
    previewReminders(),
    db.query.smsMessages.findMany({ orderBy: desc(schema.smsMessages.createdAt), limit: 150, with: { loan: { columns: { id: true, reference: true, borrowerName: true } } } }),
    db
      .select({
        sent: sql<number>`count(*) filter (where ${schema.smsMessages.status} = 'sent')::int`,
        failed: sql<number>`count(*) filter (where ${schema.smsMessages.status} = 'failed')::int`,
      })
      .from(schema.smsMessages)
      .where(sql`${schema.smsMessages.createdAt} > now() - interval '30 days'`),
  ]);
  const toSend = preview.filter((p) => !p.alreadySent);

  return (
    <>
      <PageHeader
        title="SMS & reminders"
        description="Automatic reminders go out every day at 09:00 Kampala time. Receipts and disbursement notices send instantly."
        actions={can(staff.role, "reminders.run") ? <SendNow pending={toSend.length} /> : undefined}
      />
      {!smsConfigured() && (
        <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          SMS provider not configured. In test mode, messages are written to the local outbox instead of being sent. Set <code>AT_USERNAME</code> and <code>AT_API_KEY</code> to go live.
        </p>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Reminders due today" value={toSend.length} hint={`${preview.length - toSend.length} already sent`} />
        <Stat label="Sent in last 30 days" value={month?.sent ?? 0} />
        <Stat label="Failed in last 30 days" value={month?.failed ?? 0} tone={month?.failed ? "bad" : undefined} hint="Retried automatically up to 3 times" />
      </div>

      <Card title="Today’s reminders" padded={false} className="mb-6">
        {preview.length === 0 ? (
          <Empty>No loans need a reminder today.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>Borrower</th>
                <th>Type</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((p) => (
                <tr key={p.dedupeKey} className="align-top">
                  <td className="whitespace-nowrap">
                    <Link href={`/console/loans/${p.loanId}`} className="font-medium hover:underline">{p.borrower}</Link>
                    <p className="text-xs text-muted">{p.phone}</p>
                  </td>
                  <td className="whitespace-nowrap"><Badge tone={p.kind.startsWith("overdue") ? "bad" : "info"}>{kindLabel[p.kind]}</Badge></td>
                  <td className="max-w-lg text-ink/80">{p.body}</td>
                  <td>{p.alreadySent ? <Badge tone="good">Sent</Badge> : <Badge tone="progress">Waiting</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title="Message log" padded={false}>
        {log.length === 0 ? (
          <Empty>No messages sent yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>When</th>
                <th>To</th>
                <th>Type</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {log.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="whitespace-nowrap text-muted">{fmtDateTime(m.createdAt)}</td>
                  <td className="whitespace-nowrap">
                    {m.loan ? <Link href={`/console/loans/${m.loan.id}`} className="hover:underline">{m.loan.borrowerName}</Link> : m.phone}
                  </td>
                  <td className="whitespace-nowrap text-xs">{kindLabel[m.kind]}</td>
                  <td className="max-w-lg text-ink/80">{m.body}</td>
                  <td>
                    <Badge tone={m.status === "sent" ? "good" : m.status === "failed" ? "bad" : "progress"}>{m.status}</Badge>
                    {m.error && <p className="mt-1 max-w-48 text-xs text-red-700">{m.error}</p>}
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
