import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getStaff } from "./auth";
import { getCustomer } from "./customer-auth";
import { can } from "./permissions";
import { verifyUploadToken } from "./upload-token";

export type Actor = { kind: "staff"; staffId: string; canReview: boolean } | { kind: "applicant" };

/** Who (if anyone) may act on this application's documents for the current request. */
export async function documentActor(applicationId: string, token?: string | null): Promise<{ actor: Actor; app: { id: string; status: string; product: string; phone: string } } | null> {
  if (!/^[0-9a-f-]{36}$/.test(applicationId)) return null;
  const app = await db.query.applications.findFirst({
    where: eq(schema.applications.id, applicationId),
    columns: { id: true, status: true, product: true, phone: true },
  });
  if (!app) return null;

  const staff = await getStaff();
  if (staff) return { app, actor: { kind: "staff", staffId: staff.id, canReview: can(staff.role, "application.review") } };

  const customer = await getCustomer();
  if (customer?.phone === app.phone) return { app, actor: { kind: "applicant" } };

  if (token && verifyUploadToken(token, app.id)) return { app, actor: { kind: "applicant" } };
  return null;
}

export const applicantCanUpload = (status: string) => ["new", "reviewing", "recommended", "approved"].includes(status);
