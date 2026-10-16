import "server-only";
import { and, asc, eq, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { planReminders, receiptSms, disbursedSms, refundSms, type PlannedSms } from "./reminder-rules";
import { today } from "./queries";
import { sendSms } from "./sms";

const MAX_ATTEMPTS = 3;

/** Sends a message at most once per dedupe key; failed sends are retried on later runs. */
export async function deliver(msg: PlannedSms): Promise<"sent" | "duplicate" | "failed"> {
  const [created] = await db
    .insert(schema.smsMessages)
    .values({ loanId: msg.loanId, phone: msg.phone, kind: msg.kind, dedupeKey: msg.dedupeKey, body: msg.body })
    .onConflictDoNothing({ target: schema.smsMessages.dedupeKey })
    .returning();
  const row =
    created ??
    (await db.query.smsMessages.findFirst({ where: eq(schema.smsMessages.dedupeKey, msg.dedupeKey) }));
  if (!row) return "failed";
  if (!created && (row.status === "sent" || row.attempts >= MAX_ATTEMPTS)) return "duplicate";

  // Claim the attempt so concurrent runs don't both send.
  const [claimed] = await db
    .update(schema.smsMessages)
    .set({ attempts: row.attempts + 1, status: "queued" })
    .where(and(eq(schema.smsMessages.id, row.id), eq(schema.smsMessages.attempts, row.attempts)))
    .returning({ id: schema.smsMessages.id });
  if (!claimed) return "duplicate";

  try {
    const r = await sendSms(msg.phone, msg.body);
    await db.update(schema.smsMessages).set({ status: "sent", channel: r.channel, sentAt: new Date(), error: null }).where(eq(schema.smsMessages.id, row.id));
    return "sent";
  } catch (err) {
    await db
      .update(schema.smsMessages)
      .set({ status: "failed", error: err instanceof Error ? err.message.slice(0, 300) : "Send failed" })
      .where(eq(schema.smsMessages.id, row.id));
    return "failed";
  }
}

async function activeLoansWithSchedule() {
  return db.query.loans.findMany({
    where: eq(schema.loans.status, "active"),
    columns: { id: true, reference: true, borrowerName: true, borrowerPhone: true },
    with: { installments: { columns: { id: true, seq: true, dueDate: true, amountDue: true, amountPaid: true }, orderBy: asc(schema.installments.seq) } },
  });
}

/** What today's reminder run would send (for the console preview). */
export async function previewReminders(day = today()) {
  const loans = await activeLoansWithSchedule();
  const planned = loans.flatMap((l) => planReminders(l, day));
  if (planned.length === 0) return [];
  const existing = await db.query.smsMessages.findMany({ columns: { dedupeKey: true, status: true } });
  const done = new Set(existing.filter((e) => e.status === "sent").map((e) => e.dedupeKey));
  return planned.map((p) => ({ ...p, alreadySent: done.has(p.dedupeKey), borrower: loans.find((l) => l.id === p.loanId)!.borrowerName }));
}

export async function runReminders(day = today()) {
  const loans = await activeLoansWithSchedule();
  const tally = { planned: 0, sent: 0, duplicate: 0, failed: 0 };
  for (const loan of loans) {
    for (const msg of planReminders(loan, day)) {
      tally.planned++;
      tally[await deliver(msg)]++;
    }
  }
  return tally;
}

export async function notifyRepayment(repaymentId: string) {
  const rep = await db.query.repayments.findFirst({
    where: eq(schema.repayments.id, repaymentId),
    with: { loan: { columns: { id: true, reference: true, borrowerName: true, borrowerPhone: true, status: true } } },
  });
  if (!rep) return;
  const open = await db
    .select({ due: schema.installments.amountDue, paid: schema.installments.amountPaid })
    .from(schema.installments)
    .where(and(eq(schema.installments.loanId, rep.loanId), lt(schema.installments.amountPaid, schema.installments.amountDue)));
  const balance = open.reduce((s, i) => s + i.due - i.paid, 0);
  await deliver({
    loanId: rep.loanId,
    phone: rep.loan.borrowerPhone,
    kind: "receipt",
    dedupeKey: `receipt:${rep.id}`,
    body: receiptSms({ name: rep.loan.borrowerName, reference: rep.loan.reference, amount: rep.amount, balance, closed: rep.loan.status === "closed" }),
  });
}

export async function notifyDisbursement(loanId: string) {
  const loan = await db.query.loans.findFirst({
    where: eq(schema.loans.id, loanId),
    with: { installments: { orderBy: asc(schema.installments.seq), limit: 1 } },
  });
  const first = loan?.installments[0];
  if (!loan || !first) return;
  await deliver({
    loanId,
    phone: loan.borrowerPhone,
    kind: "disbursed",
    dedupeKey: `disbursed:${loanId}`,
    body: disbursedSms({ name: loan.borrowerName, reference: loan.reference, net: loan.netDisbursed, firstAmount: first.amountDue, firstDue: first.dueDate }),
  });
}

export async function notifyRefund(refundId: string) {
  const r = await db.query.refunds.findFirst({
    where: eq(schema.refunds.id, refundId),
    with: { loan: { columns: { reference: true, borrowerName: true, borrowerPhone: true } } },
  });
  if (!r || r.status !== "paid" || !r.payoutRef) return;
  await deliver({
    loanId: r.loanId,
    phone: r.loan.borrowerPhone,
    kind: "refund",
    dedupeKey: `refund:${r.id}`,
    body: refundSms({ name: r.loan.borrowerName, reference: r.loan.reference, amount: r.amount, msisdn: r.payeeMsisdn, payoutRef: r.payoutRef }),
  });
}
