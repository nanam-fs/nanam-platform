import { Card, DefList, PageHeader, fmtDateTime } from "@/components/console/ui";
import { requireStaff } from "@/lib/auth";
import { roleLabels } from "@/lib/permissions";
import { PasswordForm } from "./password-form";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await requireStaff();
  return (
    <>
      <PageHeader title="My account" />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Card title="Profile">
          <DefList items={[["Name", me.name], ["Email", me.email], ["Role", roleLabels[me.role]], ["Last sign-in", fmtDateTime(me.lastLoginAt)]]} />
        </Card>
        <Card title="Change password">
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}
