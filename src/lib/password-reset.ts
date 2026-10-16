import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/db";
import { audit } from "./audit";
import { sendEmail } from "./email";
import { hashPassword, PASSWORD_MIN } from "./password";

const SELF_TTL_MIN = 30;
const ADMIN_TTL_MIN = 24 * 60;
const sha = (v: string) => createHash("sha256").update(v).digest("hex");

async function baseUrl() {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")}://${host}`;
}

async function issue(staffId: string, by: "self" | "admin") {
  const token = randomBytes(32).toString("base64url");
  const ttl = by === "self" ? SELF_TTL_MIN : ADMIN_TTL_MIN;
  const h = await headers();
  await db.insert(schema.passwordResets).values({
    id: sha(token),
    staffId,
    expiresAt: new Date(Date.now() + ttl * 60_000),
    issuedBy: by,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  });
  return { link: `${await baseUrl()}/console/reset?token=${token}`, ttl };
}

/** Always resolves the same way, so the form can't be used to discover staff emails. */
export async function requestPasswordReset(email: string) {
  const user = await db.query.staff.findFirst({ where: eq(schema.staff.email, email.trim().toLowerCase()) });
  if (!user || !user.active) return;
  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.passwordResets)
    .where(and(eq(schema.passwordResets.staffId, user.id), gt(schema.passwordResets.createdAt, new Date(Date.now() - 3600_000))));
  if (n >= 3) return;
  const { link, ttl } = await issue(user.id, "self");
  await sendEmail(
    user.email,
    "Reset your NANAM console password",
    `Hello ${user.name.split(" ")[0]},\n\nSomeone (hopefully you) asked to reset your NANAM staff console password.\n\nSet a new password here (valid for ${ttl} minutes, one use only):\n${link}\n\nIf you didn't ask for this, ignore this email; your password stays the same.\n\nNANAM Financial Services`,
  );
  await audit(db, { actorId: user.id, action: "auth.reset_requested", entity: "staff", entityId: user.id });
}

/** For an administrator helping a colleague who can't get email. The link is shown once. */
export async function adminIssueReset(staffId: string, adminId: string) {
  const user = await db.query.staff.findFirst({ where: eq(schema.staff.id, staffId) });
  if (!user) throw new Error("Team member not found.");
  const r = await issue(user.id, "admin");
  await audit(db, { actorId: adminId, action: "auth.reset_issued", entity: "staff", entityId: user.id });
  return r;
}

export async function resetTokenValid(token: string) {
  const row = await db.query.passwordResets.findFirst({
    where: and(eq(schema.passwordResets.id, sha(token)), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())),
    with: { staff: { columns: { name: true, active: true } } },
  });
  return row && row.staff.active ? { name: row.staff.name } : null;
}

export async function completePasswordReset(token: string, password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (password.length < PASSWORD_MIN) return { ok: false, message: `Use at least ${PASSWORD_MIN} characters.` };
  const id = sha(token);
  const result = await db.transaction(async (tx) => {
    const [used] = await tx
      .update(schema.passwordResets)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResets.id, id), isNull(schema.passwordResets.usedAt), gt(schema.passwordResets.expiresAt, new Date())))
      .returning({ staffId: schema.passwordResets.staffId });
    if (!used) return null;
    await tx.update(schema.staff).set({ passwordHash: await hashPassword(password) }).where(eq(schema.staff.id, used.staffId));
    // Sign out everywhere, and burn any other outstanding links.
    await tx.delete(schema.sessions).where(eq(schema.sessions.staffId, used.staffId));
    await tx.update(schema.passwordResets).set({ usedAt: new Date() }).where(and(eq(schema.passwordResets.staffId, used.staffId), isNull(schema.passwordResets.usedAt)));
    await audit(tx, { actorId: used.staffId, action: "auth.password_reset", entity: "staff", entityId: used.staffId });
    return used.staffId;
  });
  return result ? { ok: true } : { ok: false, message: "This link has expired or was already used. Request a new one." };
}
