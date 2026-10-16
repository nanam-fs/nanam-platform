import { site } from "./site";

export type SmsKind = "due_soon" | "due_today" | "overdue_1" | "overdue_7" | "overdue_30" | "receipt" | "disbursed";

export type PlannedSms = { loanId: string; phone: string; kind: SmsKind; dedupeKey: string; body: string };

type Inst = { id: string; seq: number; dueDate: string; amountDue: number; amountPaid: number };
type LoanForReminders = { id: string; reference: string; borrowerName: string; borrowerPhone: string; installments: Inst[] };

// Plain ASCII keeps every message in the 160-character GSM-7 SMS encoding.
const ugx = (n: number) => `UGX ${Math.round(n).toLocaleString("en-US")}`;
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const first = (name: string) => name.trim().split(/\s+/)[0];
const helpline = () => site.phones[0].replace(/^\+256\s?/, "0").replace(/\s/g, "");
const PORTAL = "nanam.ug/portal";

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

/**
 * Which reminders a loan should get today. Windows (not exact days) mean a missed run still
 * catches up, while dedupe keys guarantee each reminder is sent at most once per instalment.
 * Tone stays factual and polite, as fair-collection practice requires.
 */
export function planReminders(loan: LoanForReminders, today: string): PlannedSms[] {
  const open = loan.installments.filter((i) => i.amountPaid < i.amountDue).sort((a, b) => a.seq - b.seq);
  if (open.length === 0) return [];
  const name = first(loan.borrowerName);
  const base = { loanId: loan.id, phone: loan.borrowerPhone };
  const overdue = open.filter((i) => i.dueDate < today);

  if (overdue.length > 0) {
    const anchor = overdue[0];
    const dpd = daysBetween(anchor.dueDate, today);
    const owed = overdue.reduce((s, i) => s + i.amountDue - i.amountPaid, 0);
    const kind: SmsKind = dpd >= 30 ? "overdue_30" : dpd >= 7 ? "overdue_7" : "overdue_1";
    const body = {
      overdue_1: `NANAM: Hi ${name}, your payment of ${ugx(owed)} for loan ${loan.reference} was due ${day(anchor.dueDate)}. Please pay at ${PORTAL} or call ${helpline()} for help.`,
      overdue_7: `NANAM: Hi ${name}, loan ${loan.reference} has ${ugx(owed)} overdue. Please pay at ${PORTAL} or call ${helpline()} to agree a plan.`,
      overdue_30: `NANAM: Hi ${name}, loan ${loan.reference} is over 30 days overdue with ${ugx(owed)} unpaid. Please call us today on ${helpline()} to agree a way forward.`,
    }[kind];
    // While a loan is in arrears, the arrears message is the only reminder it gets.
    return [{ ...base, kind, dedupeKey: `${kind}:${anchor.id}`, body }];
  }

  const next = open[0];
  const until = daysBetween(today, next.dueDate);
  const owing = next.amountDue - next.amountPaid;
  if (until === 0) {
    return [{ ...base, kind: "due_today", dedupeKey: `due_today:${next.id}`, body: `NANAM: Hi ${name}, your instalment of ${ugx(owing)} for loan ${loan.reference} is due today. Pay with MoMo at ${PORTAL}. Help: ${helpline()}` }];
  }
  if (until >= 1 && until <= 3) {
    return [{ ...base, kind: "due_soon", dedupeKey: `due_soon:${next.id}`, body: `NANAM: Hi ${name}, your instalment of ${ugx(owing)} for loan ${loan.reference} is due on ${day(next.dueDate)}. Pay with MoMo at ${PORTAL}. Help: ${helpline()}` }];
  }
  return [];
}

export function receiptSms(p: { name: string; reference: string; amount: number; balance: number; closed: boolean }) {
  return p.closed
    ? `NANAM: We received ${ugx(p.amount)} for loan ${p.reference}. Your loan is now fully repaid - thank you! Call ${helpline()} to arrange collection of your documents.`
    : `NANAM: We received ${ugx(p.amount)} for loan ${p.reference}. Balance remaining: ${ugx(p.balance)}. Thank you, ${first(p.name)}.`;
}

export function disbursedSms(p: { name: string; reference: string; net: number; firstAmount: number; firstDue: string }) {
  return `NANAM: Hi ${first(p.name)}, loan ${p.reference} is disbursed: ${ugx(p.net)} sent to you. First instalment ${ugx(p.firstAmount)} due ${day(p.firstDue)}. Pay at ${PORTAL}`;
}
