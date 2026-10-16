import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { db, schema } from "@/db";
import { normalisePhone } from "./inbox";
import { sendSms } from "./sms";

/** Confirms an applicant controls the phone number on their application. */
const TTL_MIN = 10;
const sha = (v: string) => createHash("sha256").update(v).digest("hex");

export async function sendApplicationCode(rawPhone: string): Promise<{ ok: true; demoCode?: string } | { ok: false; message: string }> {
  const phone = normalisePhone(rawPhone);
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const since = new Date(Date.now() - 15 * 60_000);
  const [[perPhone], [perIp]] = await Promise.all([
    db.select({ n: count() }).from(schema.otpCodes).where(and(eq(schema.otpCodes.phone, phone), eq(schema.otpCodes.purpose, "application"), gt(schema.otpCodes.createdAt, since))),
    db.select({ n: count() }).from(schema.otpCodes).where(and(eq(schema.otpCodes.ip, ip), eq(schema.otpCodes.purpose, "application"), gt(schema.otpCodes.createdAt, new Date(Date.now() - 3600_000)))),
  ]);
  if (perPhone.n >= 3 || perIp.n >= 10) return { ok: false, message: "Too many codes requested. Please wait 15 minutes and try again." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const [row] = await db
    .insert(schema.otpCodes)
    .values({ phone, purpose: "application", codeHash: "pending", expiresAt: new Date(Date.now() + TTL_MIN * 60_000), ip })
    .returning({ id: schema.otpCodes.id });
  await db.update(schema.otpCodes).set({ codeHash: sha(`${row.id}:${code}`) }).where(eq(schema.otpCodes.id, row.id));
  const sent = await sendSms(phone, `${code} is your NANAM code to confirm your loan application. It expires in ${TTL_MIN} minutes.`);
  // No real SMS was sent (test or demo mode): show the code on screen instead.
  return sent.channel === "dev-outbox" ? { ok: true, demoCode: code } : { ok: true };
}

export async function checkApplicationCode(rawPhone: string, rawCode: string) {
  const phone = normalisePhone(rawPhone);
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6) return false;
  const otp = await db.query.otpCodes.findFirst({
    where: and(eq(schema.otpCodes.phone, phone), eq(schema.otpCodes.purpose, "application"), isNull(schema.otpCodes.consumedAt), gt(schema.otpCodes.expiresAt, new Date())),
    orderBy: desc(schema.otpCodes.createdAt),
  });
  if (!otp || otp.attempts >= 5) return false;
  const a = Buffer.from(otp.codeHash, "hex");
  const b = Buffer.from(sha(`${otp.id}:${code}`), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db.update(schema.otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(schema.otpCodes.id, otp.id));
    return false;
  }
  const [consumed] = await db
    .update(schema.otpCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(schema.otpCodes.id, otp.id), isNull(schema.otpCodes.consumedAt)))
    .returning({ id: schema.otpCodes.id });
  return !!consumed;
}
