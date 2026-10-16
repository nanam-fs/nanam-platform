import type { Metadata } from "next";
import { count, eq, inArray } from "drizzle-orm";
import { CommandPalette } from "@/components/console/command-palette";
import { Sidebar, type NavItem } from "@/components/console/sidebar";
import { db, schema } from "@/db";
import { requireStaff } from "@/lib/auth";
import { can, roleLabels } from "@/lib/permissions";

export const metadata: Metadata = { title: { default: "Console", template: "%s · NANAM Console" }, robots: { index: false } };

export default async function ConsoleLayout({ children }: LayoutProps<"/console">) {
  const staff = await requireStaff();
  const refundWork: ("pending_approval" | "approved")[] = [
    ...(can(staff.role, "refund.approve") ? (["pending_approval"] as const) : []),
    ...(can(staff.role, "refund.pay") ? (["approved"] as const) : []),
  ];
  const [[newApps], [openMsgs], [pendingAgents], [refundsToAct]] = await Promise.all([
    db.select({ n: count() }).from(schema.applications).where(eq(schema.applications.status, "new")),
    db.select({ n: count() }).from(schema.messages).where(eq(schema.messages.status, "open")),
    db.select({ n: count() }).from(schema.agents).where(eq(schema.agents.status, "pending")),
    refundWork.length
      ? db.select({ n: count() }).from(schema.refunds).where(inArray(schema.refunds.status, refundWork))
      : Promise.resolve([{ n: 0 }]),
  ]);

  const items: NavItem[] = [
    { href: "/console", label: "Overview", icon: "LayoutDashboard", group: "_", key: "o" },
    { href: "/console/applications", label: "Applications", icon: "FileStack", badge: newApps.n, group: "Lending", key: "a" },
    { href: "/console/loans", label: "Loan book", icon: "Banknote", group: "Lending", key: "l" },
    { href: "/console/collateral", label: "Collateral", icon: "ShieldCheck", group: "Lending", key: "c" },
    { href: "/console/refunds", label: "Refunds", icon: "Undo2", badge: refundsToAct.n, group: "Lending", key: "r" },
    { href: "/console/agents", label: "Agents", icon: "Handshake", badge: pendingAgents.n, group: "Clients", key: "p" },
    { href: "/console/messages", label: "Messages", icon: "Inbox", badge: openMsgs.n, group: "Clients", key: "m" },
    { href: "/console/sms", label: "SMS & reminders", icon: "MessageSquareText", group: "Clients", key: "s" },
    ...(can(staff.role, "payments.lab") ? [{ href: "/console/payments-lab", label: "Payments lab", icon: "FlaskConical", group: "Admin" } as NavItem] : []),
    ...(can(staff.role, "staff.manage") ? [{ href: "/console/team", label: "Team", icon: "Users", group: "Admin", key: "t" } as NavItem] : []),
    ...(can(staff.role, "audit.view") ? [{ href: "/console/audit", label: "Audit log", icon: "History", group: "Admin" } as NavItem] : []),
  ];


  return (
    <div className="flex min-h-dvh flex-col bg-cream lg:flex-row">
      <Sidebar items={items} user={{ name: staff.name, role: roleLabels[staff.role] }} />
      <CommandPalette
        nav={items.map(({ href, label, key }) => ({ href, label, key }))}
        actions={[
          { href: "/console/loans?filter=arrears", label: "Loans in arrears" },
          { href: "/console/applications?status=recommended", label: "Applications awaiting approval" },
          { href: "/console/sms", label: "Send today’s SMS reminders" },
          { href: "/console/account", label: "Change my password" },
          ...(can(staff.role, "payments.lab") ? [{ href: "/console/payments-lab", label: "Test a Mobile Money payment" }] : []),
          ...(can(staff.role, "staff.manage") ? [{ href: "/console/team", label: "Add a team member" }] : []),
        ]}
      />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8 [&_.grid>*]:min-w-0">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
