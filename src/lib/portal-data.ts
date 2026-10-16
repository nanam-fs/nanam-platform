import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { settlementQuote } from "./lending";
import { today } from "./queries";

export async function customerLoans(phone: string) {
  const loans = await db.query.loans.findMany({
    where: eq(schema.loans.borrowerPhone, phone),
    orderBy: desc(schema.loans.disbursedAt),
    with: { installments: { orderBy: asc(schema.installments.seq) } },
  });
  const t = today();
  return loans.map((loan) => {
    const total = loan.installments.reduce((s, i) => s + i.amountDue, 0);
    const paid = loan.installments.reduce((s, i) => s + i.amountPaid, 0);
    const open = loan.installments.filter((i) => i.amountPaid < i.amountDue);
    const next = open[0];
    const overdue = open.filter((i) => i.dueDate < t);
    return {
      loan,
      total,
      paid,
      outstanding: total - paid,
      arrears: overdue.reduce((s, i) => s + i.amountDue - i.amountPaid, 0),
      daysLate: overdue[0] ? Math.round((Date.parse(t) - Date.parse(overdue[0].dueDate)) / 86_400_000) : 0,
      next: next ? { dueDate: next.dueDate, amount: next.amountDue - next.amountPaid } : null,
      settlement: loan.status === "active" ? settlementQuote(loan.installments, t) : null,
    };
  });
}

export async function customerApplications(phone: string) {
  return db.query.applications.findMany({
    where: eq(schema.applications.phone, phone),
    orderBy: desc(schema.applications.createdAt),
    columns: { id: true, reference: true, status: true, product: true, amount: true, months: true, approvedAmount: true, approvedMonths: true, createdAt: true },
    with: { documents: { columns: { kind: true, status: true } } },
  });
}

/** Ownership-checked loan with everything needed for detail and statement pages. */
export async function customerLoan(phone: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const loan = await db.query.loans.findFirst({
    where: eq(schema.loans.id, id),
    with: {
      installments: { orderBy: asc(schema.installments.seq) },
      repayments: { orderBy: asc(schema.repayments.receivedAt) },
      paymentRequests: { orderBy: desc(schema.paymentRequests.createdAt), limit: 10 },
    },
  });
  if (!loan || loan.borrowerPhone !== phone) return null;
  return loan;
}
