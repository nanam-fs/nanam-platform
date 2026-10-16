import { desc } from "drizzle-orm";
import { ActionButton } from "@/components/console/action-form";
import { Badge, Card, Empty, FilterTabs, PageHeader, fmtDateTime } from "@/components/console/ui";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { setMessageStatus } from "../../actions";

export const metadata = { title: "Messages" };

const topicLabel: Record<string, string> = { "new-loan": "New loan", "existing-loan": "Existing loan", partnership: "Partnership", other: "Other" };

export default async function MessagesPage({ searchParams }: PageProps<"/console/messages">) {
  const staff = await requireStaff();
  const status = (await searchParams).status === "closed" ? "closed" : "open";
  const all = await db.query.messages.findMany({ orderBy: desc(schema.messages.createdAt), limit: 300 });
  const rows = all.filter((m) => m.status === status);
  const manage = can(staff.role, "message.manage");

  return (
    <>
      <PageHeader title="Messages" description="Enquiries from the website contact form." />
      <FilterTabs
        active={status}
        tabs={[
          { key: "open", href: "/console/messages", label: "Open", count: all.filter((m) => m.status === "open").length },
          { key: "closed", href: "/console/messages?status=closed", label: "Closed", count: all.filter((m) => m.status === "closed").length },
        ]}
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <Empty>Inbox zero.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((m) => (
              <li key={m.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-forest-950">
                    {m.name} <Badge>{topicLabel[m.topic] ?? m.topic}</Badge>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: your message to NANAM (${m.reference})`)}`} className="hover:underline">{m.email}</a>
                    {m.phone && (
                      <>
                        {" · "}
                        <a href={`tel:${m.phone}`} className="hover:underline">{m.phone}</a>
                      </>
                    )}
                    {" · "}
                    {fmtDateTime(m.createdAt)} · <span className="font-mono">{m.reference}</span>
                  </p>
                  <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm text-ink">{m.body}</p>
                </div>
                {manage && (
                  <ActionButton variant="secondary" action={setMessageStatus.bind(null, m.id, m.status === "open" ? "closed" : "open")}>
                    {m.status === "open" ? "Mark handled" : "Reopen"}
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
