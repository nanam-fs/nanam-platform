import "server-only";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { PaymentRequest } from "@/db/schema";
import { audit } from "./audit";
import { settlementQuote } from "./lending";
import { detectNetwork, providerByName, providerFor, type Network } from "./momo";
import { today } from "./queries";
import { postRepayment, RepaymentError } from "./repayments";

export class PaymentError extends Error {}

const MIN_PAYMENT = 1_000;
const EXPIRE_AFTER_MIN = 30;

export type Purpose = "instalment" | "arrears" | "settlement" | "custom";

/** What the customer could pay right now on a loan they own. */
export async function paymentOptions(loanId: string, phone: string) {
  const loan = await db.query.loans.findFirst({
    where: and(eq(schema.loans.id, loanId), eq(schema.loans.borrowerPhone, phone)),
    with: { installments: true },
  });
  if (!loan) return null;
  const t = today();
  const open = loan.installments.filter((i) => i.amountPaid < i.amountDue).sort((a, b) => a.seq - b.seq);
  const outstanding = open.reduce((s, i) => s + i.amountDue - i.amountPaid, 0);
  const arrears = open.filter((i) => i.dueDate < t).reduce((s, i) => s + i.amountDue - i.amountPaid, 0);
  const next = open[0];
  const settlement = settlementQuote(loan.installments, t);
  return {
    loan,
    outstanding,
    arrears,
    next: next ? { amount: next.amountDue - next.amountPaid, dueDate: next.dueDate } : null,
    settlement: settlement.amount,
    settlementSaves: settlement.waived,
  };
}

export async function initiatePayment(input: {
  loanId: string;
  customerPhone: string;
  payerMsisdn: string;
  network: Network;
  purpose: Purpose;
  amount?: number;
}) {
  const opts = await paymentOptions(input.loanId, input.customerPhone);
  if (!opts || opts.loan.status !== "active") throw new PaymentError("This loan isn’t open for payments.");

  const amount =
    input.purpose === "settlement"
      ? opts.settlement
      : input.purpose === "arrears"
        ? opts.arrears
        : input.purpose === "instalment"
          ? (opts.arrears > 0 ? opts.arrears : opts.next?.amount ?? 0)
          : Math.round(input.amount ?? 0);
  if (!Number.isInteger(amount) || amount < MIN_PAYMENT) throw new PaymentError(`The minimum payment is UGX ${MIN_PAYMENT.toLocaleString("en-UG")}.`);
  if (amount > opts.outstanding) throw new PaymentError(`That’s more than the UGX ${opts.outstanding.toLocaleString("en-UG")} you owe.`);

  const digits = input.payerMsisdn.replace(/\D/g, "");
  if (!/^(256|0)?7\d{8}$/.test(digits)) throw new PaymentError("Enter a valid Mobile Money number.");
  const msisdn = `+256${digits.slice(-9)}`;
  const detected = detectNetwork(msisdn);
  if (detected && detected !== input.network) {
    throw new PaymentError(`${msisdn} looks like an ${detected === "mtn" ? "MTN" : "Airtel"} number. Choose ${detected === "mtn" ? "MTN MoMo" : "Airtel Money"}.`);
  }

  // Don't send a second phone prompt while one is still waiting.
  const inFlight = await db.query.paymentRequests.findFirst({
    where: and(
      eq(schema.paymentRequests.loanId, input.loanId),
      eq(schema.paymentRequests.status, "pending"),
      gt(schema.paymentRequests.createdAt, new Date(Date.now() - 3 * 60_000)),
    ),
    columns: { id: true },
  });
  if (inFlight) return inFlight.id;

  const provider = providerFor(input.network);
  if (!provider) throw new PaymentError("Mobile Money payments aren’t available right now. Please pay at our office or contact us.");

  const [row] = await db
    .insert(schema.paymentRequests)
    .values({
      loanId: input.loanId,
      customerPhone: input.customerPhone,
      payerMsisdn: msisdn,
      network: input.network,
      amount,
      purpose: input.purpose,
      provider: provider.name,
      // Placeholder until the provider assigns one; unique per row.
      providerRef: `init-${crypto.randomUUID()}`,
    })
    .returning();

  try {
    const { providerRef } = await provider.requestPayment({
      amount,
      msisdn,
      externalId: row.id,
      note: `NANAM loan ${opts.loan.reference}`,
    });
    await db.update(schema.paymentRequests).set({ providerRef }).where(eq(schema.paymentRequests.id, row.id));
  } catch (err) {
    await db
      .update(schema.paymentRequests)
      .set({ status: "failed", failureReason: err instanceof Error ? err.message : "Request failed", completedAt: new Date() })
      .where(eq(schema.paymentRequests.id, row.id));
    throw new PaymentError("We couldn’t reach Mobile Money. Please try again in a moment.");
  }
  await audit(db, { actorId: null, action: "payment.requested", entity: "loan", entityId: input.loanId, detail: { amount, network: input.network, purpose: input.purpose, request: row.id } });
  return row.id;
}

/**
 * Brings a payment request up to date with the provider and posts it to the loan once confirmed.
 * Safe to call any number of times, from polling, callbacks or a sweep: only one caller can
 * move a request to "successful", and that same transaction posts the repayment.
 */
export async function syncPayment(id: string): Promise<PaymentRequest | undefined> {
  const req = await db.query.paymentRequests.findFirst({ where: eq(schema.paymentRequests.id, id) });
  if (!req || req.status === "successful" || req.status === "failed" || req.providerRef.startsWith("init-")) return req;

  const provider = providerByName(req.provider);
  if (!provider) return req;
  const status = await provider.getStatus({ providerRef: req.providerRef, createdAt: req.createdAt, payerMsisdn: req.payerMsisdn });

  if (status.status === "pending") {
    if (req.status === "pending" && Date.now() - req.createdAt.getTime() > EXPIRE_AFTER_MIN * 60_000) {
      await db.update(schema.paymentRequests).set({ status: "expired" }).where(and(eq(schema.paymentRequests.id, id), eq(schema.paymentRequests.status, "pending")));
    }
    return db.query.paymentRequests.findFirst({ where: eq(schema.paymentRequests.id, id) });
  }

  if (status.status === "failed") {
    await db
      .update(schema.paymentRequests)
      .set({ status: "failed", failureReason: status.reason ?? "Declined or timed out", completedAt: new Date() })
      .where(and(eq(schema.paymentRequests.id, id), inArray(schema.paymentRequests.status, ["pending", "expired"])));
    return db.query.paymentRequests.findFirst({ where: eq(schema.paymentRequests.id, id) });
  }

  // Confirmed by the provider: claim it and post in one transaction.
  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(schema.paymentRequests)
      .set({ status: "successful", providerTxnId: status.transactionId ?? null, completedAt: new Date() })
      .where(and(eq(schema.paymentRequests.id, id), inArray(schema.paymentRequests.status, ["pending", "expired"])))
      .returning();
    if (!claimed) return;

    try {
      const result = await postRepayment(tx, {
        loanId: claimed.loanId,
        amount: claimed.amount,
        method: "mobile_money",
        reference: status.transactionId ?? claimed.providerRef,
        receivedOn: today(),
        recordedBy: null,
        source: "portal",
        settle: claimed.purpose === "settlement",
        onExcess: "keep",
      });
      await tx.update(schema.paymentRequests).set({ repaymentId: result.repaymentId, excess: result.excess }).where(eq(schema.paymentRequests.id, id));
    } catch (err) {
      if (!(err instanceof RepaymentError)) throw err;
      // Money arrived but can't be applied (e.g. the loan was already settled): hold it for refund.
      await tx.update(schema.paymentRequests).set({ excess: claimed.amount, failureReason: err.message }).where(eq(schema.paymentRequests.id, id));
      await audit(tx, { actorId: null, action: "payment.refund_due", entity: "loan", entityId: claimed.loanId, detail: { request: id, amount: claimed.amount, reason: err.message } });
    }
  });
  return db.query.paymentRequests.findFirst({ where: eq(schema.paymentRequests.id, id) });
}

/** Re-checks every unresolved request (run on a schedule as a safety net for missed callbacks). */
export async function sweepPendingPayments() {
  const pending = await db.query.paymentRequests.findMany({
    where: and(inArray(schema.paymentRequests.status, ["pending", "expired"]), gt(schema.paymentRequests.createdAt, new Date(Date.now() - 48 * 3600_000))),
    columns: { id: true },
    orderBy: desc(schema.paymentRequests.createdAt),
    limit: 200,
  });
  for (const p of pending) await syncPayment(p.id).catch((e) => console.error("[payments] sync failed", p.id, e));
  return pending.length;
}

export async function findByProviderRef(ref: string) {
  return db.query.paymentRequests.findFirst({ where: eq(schema.paymentRequests.providerRef, ref), columns: { id: true } });
}

