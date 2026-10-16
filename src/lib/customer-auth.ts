import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, schema } from "@/db";
import { audit } from "./audit";
import { normalisePhone } from "./inbox";
import { sendSms } from "./sms";

export const PORTAL_COOKIE = "nanam_portal";
const SESSION_DAYS = 7;
const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MAX_PER_15_MIN = 3;

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const hashCode = (otpId: string, code: string) => sha(`${otpId}:${code}`);

async function ip() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Only numbers NANAM already knows (an application or a loan) can receive a code. */
async function isKnownCustomer(phone: string) {
  const [app] = await db.select({ id: schema.applications.id }).from(schema.applications).where(eq(schema.applications.phone, phone)).limit(1);
  if (app) return true;
  const [loan] = await db.select({ id: schema.loans.id }).from(schema.loans).where(eq(schema.loans.borrowerPhone, phone)).limit(1);
  return !!loan;
}

export type OtpRequestResult = { ok: true; phone: string } | { ok: false; message: string };

/**
 * Sends a sign-in code. The response is the same whether or not the number is a customer,
 * so the form can't be used to discover who borrows from NANAM.
 */
export async function requestOtp(rawPhone: string): Promise<OtpRequestResult> {
  const digits = rawPhone.replace(/\D/g, "");
  if (!/^(256|0)?7\d{8}$/.test(digits)) return { ok: false, message: "Enter a valid Ugandan mobile number, e.g. 0772 123 456." };
  const phone = normalisePhone(rawPhone);

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), eq(schema.otpCodes.purpose, "login"), gt(schema.otpCodes.createdAt, new Date(Date.now() - 15 * 60_000))));
  if (Number(n) >= OTP_MAX_PER_15_MIN) return { ok: false, message: "Too many codes requested. Please wait 15 minutes and try again." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const [row] = await db
    .insert(schema.otpCodes)
    .values({ phone, codeHash: "pending", expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000), ip: await ip() })
    .returning({ id: schema.otpCodes.id });
  await db.update(schema.otpCodes).set({ codeHash: hashCode(row.id, code) }).where(eq(schema.otpCodes.id, row.id));

  if (await isKnownCustomer(phone)) {
    await sendSms(phone, `${code} is your NANAM sign-in code. It expires in ${OTP_MINUTES} minutes. NANAM staff will never ask for this code.`);
  }
  return { ok: true, phone };
}

export async function verifyOtp(rawPhone: string, rawCode: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const phone = normalisePhone(rawPhone);
  const code = rawCode.replace(/\D/g, "");
  const fail = { ok: false as const, message: "That code is incorrect or has expired. Request a new one." };
  if (code.length !== 6) return fail;

  const otp = await db.query.otpCodes.findFirst({
    where: and(eq(schema.otpCodes.phone, phone), eq(schema.otpCodes.purpose, "login"), isNull(schema.otpCodes.consumedAt), gt(schema.otpCodes.expiresAt, new Date())),
    orderBy: desc(schema.otpCodes.createdAt),
  });
  if (!otp || otp.attempts >= OTP_MAX_ATTEMPTS) return fail;

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashCode(otp.id, code), "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await db.update(schema.otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(schema.otpCodes.id, otp.id));
    return fail;
  }
  // Single use: only the request that flips consumedAt gets a session.
  const [consumed] = await db
    .update(schema.otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(schema.otpCodes.id, otp.id), isNull(schema.otpCodes.consumedAt)))
    .returning({ id: schema.otpCodes.id });
  if (!consumed || !(await isKnownCustomer(phone))) return fail;

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(schema.customerSessions).values({
    id: sha(token),
    phone,
    expiresAt,
    userAgent: (await headers()).get("user-agent")?.slice(0, 300) ?? null,
  });
  (await cookies()).set(PORTAL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  await audit(db, { actorId: null, action: "portal.login", entity: "customer", entityId: phone, detail: { ip: await ip() } });
  return { ok: true };
}

/** The signed-in customer's phone number for this request, or null. */
export const getCustomer = cache(async () => {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (!token) return null;
  const s = await db.query.customerSessions.findFirst({
    where: and(eq(schema.customerSessions.id, sha(token)), gt(schema.customerSessions.expiresAt, new Date())),
  });
  return s ? { phone: s.phone } : null;
});

export async function requireCustomer() {
  const c = await getCustomer();
  if (!c) redirect("/portal/login");
  return c;
}

export async function signOutCustomer() {
  const jar = await cookies();
  const token = jar.get(PORTAL_COOKIE)?.value;
  if (token) await db.delete(schema.customerSessions).where(eq(schema.customerSessions.id, sha(token)));
  jar.delete(PORTAL_COOKIE);
}

/** Display name for a phone number, from the most recent application or loan. */
export async function customerName(phone: string) {
  const app = await db.query.applications.findFirst({
    where: eq(schema.applications.phone, phone),
    orderBy: desc(schema.applications.createdAt),
    columns: { fullName: true },
  });
  return app?.fullName ?? null;
}
