import "server-only";
import { and, asc, eq, lt, sql } from "drizzle-orm";
import { schema, type Tx } from "@/db";
import { audit } from "./audit";
import { allocate, settlementQuote } from "./lending";

export class RepaymentError extends Error {}

type Input = {
  loanId: string;
  amount: number;
  method: "mobile_money" | "bank" | "cash";
  reference: string;
  /** YYYY-MM-DD in Kampala time. */
  receivedOn: string;
  recordedBy: string | null;
  source: "staff" | "portal";
  /** Apply the early-settlement waiver before allocating. */
  settle?: boolean;
  /**
   * "reject": staff entry — refuse anything above what is owed.
   * "keep": money already received (Mobile Money) — post what is owed and report the excess for refund.
   */
  onExcess: "reject" | "keep";
};

/**
 * The single path for money coming into a loan. Must run inside a transaction.
 * Locks the loan row, rejects duplicate references, applies settlement if requested,
 * allocates oldest-instalment-first, and closes the loan when nothing is left.
 */
export async function postRepayment(tx: Tx, input: Input) {
  const [loan] = await tx.select().from(schema.loans).where(eq(schema.loans.id, input.loanId)).for("update");
  if (!loan || loan.status !== "active") throw new RepaymentError("Repayments can only be recorded on an active loan.");

  const dup = await tx.query.repayments.findFirst({
    where: and(eq(schema.repayments.method, input.method), eq(schema.repayments.reference, input.reference)),
    columns: { id: true },
  });
  if (dup) throw new RepaymentError("A repayment with this reference has already been recorded.");

  let settled = false;
  if (input.settle) {
    const lines = await tx.select().from(schema.installments).where(eq(schema.installments.loanId, input.loanId));
    const s = settlementQuote(lines, input.receivedOn);
    if (input.amount >= s.amount) {
      for (const a of s.adjustments) {
        await tx.update(schema.installments).set({ interestDue: a.interestDue, amountDue: a.amountDue }).where(eq(schema.installments.id, a.id));
      }
      settled = true;
      await audit(tx, { actorId: input.recordedBy, action: "loan.early_settlement", entity: "loan", entityId: input.loanId, detail: { amount: s.amount, interestWaived: s.waived, source: input.source } });
    } else if (input.onExcess === "reject") {
      throw new RepaymentError(`The settlement figure on ${input.receivedOn} is UGX ${s.amount.toLocaleString("en-UG")}. Record exactly that amount to settle.`);
    }
    // Mobile Money that fell short of the settlement figure (e.g. paid a day late) is posted as an ordinary repayment.
  }

  const open = await tx
    .select()
    .from(schema.installments)
    .where(and(eq(schema.installments.loanId, input.loanId), lt(schema.installments.amountPaid, schema.installments.amountDue)))
    .orderBy(asc(schema.installments.seq));
  const outstanding = open.reduce((s, i) => s + i.amountDue - i.amountPaid, 0);
  const { updates, excess } = allocate(input.amount, open);
  if (excess > 0 && input.onExcess === "reject") {
    throw new RepaymentError(`This is more than the UGX ${outstanding.toLocaleString("en-UG")} outstanding. Record the exact amount and refund the difference.`);
  }
  const applied = input.amount - excess;

  const receivedAt = new Date(`${input.receivedOn}T12:00:00Z`);
  const [rep] = await tx
    .insert(schema.repayments)
    .values({
      loanId: input.loanId,
      amount: applied,
      method: input.method,
      reference: input.reference,
      receivedAt,
      recordedBy: input.recordedBy,
      source: input.source,
    })
    .returning({ id: schema.repayments.id });

  for (const u of updates) {
    await tx
      .update(schema.installments)
      .set({ amountPaid: sql`${schema.installments.amountPaid} + ${u.add}`, paidAt: u.settles ? receivedAt : null })
      .where(eq(schema.installments.id, u.id));
  }
  const closes = outstanding - applied === 0;
  if (closes) await tx.update(schema.loans).set({ status: "closed", closedAt: receivedAt }).where(eq(schema.loans.id, input.loanId));

  await audit(tx, {
    actorId: input.recordedBy,
    action: "loan.repayment",
    entity: "loan",
    entityId: input.loanId,
    detail: { amount: applied, method: input.method, reference: input.reference, source: input.source, closes, settled, ...(excess ? { excessToRefund: excess } : {}) },
  });
  return { repaymentId: rep.id, applied, excess, closes };
}
