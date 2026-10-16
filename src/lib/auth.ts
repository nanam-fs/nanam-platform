import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/db";
import type { Staff } from "@/db/schema";
import { can, type Permission } from "./permissions";

export const SESSION_COOKIE = "nanam_session";
const SESSION_HOURS = 12;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(staffId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await db.insert(schema.sessions).values({
    id: hashToken(token),
    staffId,
    expiresAt,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function currentSessionId() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

/** The signed-in, active staff member for this request, or null. Deduplicated per request. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ staff: schema.staff })
    .from(schema.sessions)
    .innerJoin(schema.staff, eq(schema.sessions.staffId, schema.staff.id))
    .where(
      and(eq(schema.sessions.id, hashToken(token)), gt(schema.sessions.expiresAt, new Date()), eq(schema.staff.active, true)),
    )
    .limit(1);
  return row?.staff ?? null;
});

/** For pages: redirect to sign-in when there is no session, or to the dashboard when the role lacks access. */
export async function requireStaff(permission?: Permission) {
  const staff = await getStaff();
  if (!staff) redirect("/console/login");
  if (permission && !can(staff.role, permission)) redirect("/console?denied=1");
  return staff;
}

export class PermissionError extends Error {}

/** For server actions: throws instead of redirecting, so the caller can report the problem. */
export async function authorize(permission: Permission) {
  const staff = await getStaff();
  if (!staff) throw new PermissionError("Your session has expired. Please sign in again.");
  if (!can(staff.role, permission)) throw new PermissionError("You don’t have permission to do that.");
  return staff;
}

/* Basic brute-force protection: 5 failed attempts per email+IP per 15 minutes (per server instance). */
const attempts = new Map<string, { count: number; until: number }>();

export function loginThrottle(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (entry && entry.until < now) attempts.delete(key);
  return {
    blocked: (attempts.get(key)?.count ?? 0) >= 5,
    fail() {
      const e = attempts.get(key) ?? { count: 0, until: now + 15 * 60_000 };
      e.count += 1;
      attempts.set(key, e);
    },
    reset() {
      attempts.delete(key);
    },
  };
}
