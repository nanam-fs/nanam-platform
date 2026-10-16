import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { z } from "zod";
import type { applicationSchema, contactSchema, partnerSchema } from "./schemas";
import { audit } from "./audit";

const prefixes = { application: "NFL", contact: "MSG", partner: "AGT" } as const;

export function makeReference(kind: keyof typeof prefixes) {
  const day = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  return `${prefixes[kind]}-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Normalise Ugandan numbers to +2567XXXXXXXX. */
export function normalisePhone(v: string) {
  const digits = v.replace(/\D/g, "");
  return `+256${digits.slice(-9)}`;
}

export async function saveApplication(data: z.infer<typeof applicationSchema>, phoneVerifiedAt: Date | null = null) {
  const reference = makeReference("application");
  const agent = data.referral
    ? await db.query.agents.findFirst({
        where: and(eq(schema.agents.referralCode, data.referral.toUpperCase()), eq(schema.agents.status, "active")),
        columns: { id: true },
      })
    : undefined;
  const [row] = await db
    .insert(schema.applications)
    .values({
      reference,
      product: data.product,
      amount: data.amount,
      months: data.months,
      purpose: data.purpose,
      fullName: data.fullName,
      phone: normalisePhone(data.phone),
      phoneVerifiedAt,
      email: data.email || null,
      nin: data.nin,
      district: data.district,
      incomeSource: data.incomeSource,
      monthlyIncome: data.monthlyIncome,
      security: data.security,
      securityDetails: data.securityDetails || null,
      referralCode: data.referral?.toUpperCase() || null,
      agentId: agent?.id ?? null,
    })
    .returning({ id: schema.applications.id });
  await audit(db, { actorId: null, action: "application.submitted", entity: "application", entityId: row.id, detail: { reference } });
  return { reference, id: row.id };
}

export async function saveMessage(data: Omit<z.infer<typeof contactSchema>, "email" | "topic"> & { email?: string; topic: string }) {
  const reference = makeReference("contact");
  await db.insert(schema.messages).values({
    reference,
    name: data.name,
    email: data.email || null,
    phone: data.phone ? normalisePhone(data.phone) : null,
    topic: data.topic,
    body: data.message,
  });
  return reference;
}

export async function saveAgent(data: z.infer<typeof partnerSchema>) {
  const reference = makeReference("partner");
  await db.insert(schema.agents).values({
    reference,
    type: data.type,
    fullName: data.fullName,
    organisation: data.organisation || null,
    registrationNumber: data.registrationNumber || null,
    email: data.email,
    phone: normalisePhone(data.phone),
    whatsapp: normalisePhone(data.whatsapp),
    district: data.district,
    subCounty: data.subCounty,
    payout: data.payout,
  });
  return reference;
}
