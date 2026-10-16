import type { ApplicationStatus } from "@/db/schema";

/* ───────────── Workflow ───────────── */

export const statusLabels: Record<ApplicationStatus, string> = {
  new: "New",
  reviewing: "In review",
  recommended: "Recommended",
  approved: "Approved",
  declined: "Declined",
  disbursed: "Disbursed",
  withdrawn: "Withdrawn",
};

/** Allowed next states. Disbursement happens through the loan flow, not a plain status change. */
export const transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  new: ["reviewing", "withdrawn"],
  reviewing: ["recommended", "withdrawn"],
  recommended: ["approved", "declined", "reviewing"],
  approved: ["disbursed", "withdrawn"],
  declined: [],
  disbursed: [],
  withdrawn: [],
};

export const openStatuses: ApplicationStatus[] = ["new", "reviewing", "recommended", "approved"];

export function canTransition(from: ApplicationStatus, to: ApplicationStatus) {
  return transitions[from].includes(to);
}

/* ───────────── Schedule ───────────── */

export type ScheduleRow = { seq: number; dueDate: string; principalDue: number; interestDue: number; amountDue: number };

/** Same calendar day each month; clamps to month end (31 Jan → 28/29 Feb). */
export function addMonths(date: Date, n: number) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(date.getUTCDate(), last));
  return d;
}

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Equal instalments on a reducing balance, in whole shillings.
 * Rounding differences are absorbed by the final instalment so principal always clears to exactly zero.
 */
export function buildSchedule(principal: number, months: number, monthlyRatePct: number, start: Date): ScheduleRow[] {
  const r = monthlyRatePct / 100;
  const instalment = Math.round(r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months)));
  let balance = principal;
  const rows: ScheduleRow[] = [];
  for (let seq = 1; seq <= months; seq++) {
    const interestDue = Math.round(balance * r);
    const principalDue = seq === months ? balance : Math.min(balance, instalment - interestDue);
    balance -= principalDue;
    rows.push({ seq, dueDate: isoDate(addMonths(start, seq)), principalDue, interestDue, amountDue: principalDue + interestDue });
  }
  return rows;
}

/* ───────────── Repayment allocation ───────────── */

export type OpenInstallment = { id: string; seq: number; amountDue: number; amountPaid: number };

/** Apply a payment to the oldest unpaid instalments first. Returns per-instalment increments and any excess. */
export function allocate(payment: number, open: OpenInstallment[]) {
  let remaining = payment;
  const updates: { id: string; add: number; settles: boolean }[] = [];
  for (const inst of [...open].sort((a, b) => a.seq - b.seq)) {
    if (remaining <= 0) break;
    const owing = inst.amountDue - inst.amountPaid;
    if (owing <= 0) continue;
    const add = Math.min(owing, remaining);
    remaining -= add;
    updates.push({ id: inst.id, add, settles: add === owing });
  }
  return { updates, excess: remaining };
}

/** Days past due for an unpaid instalment, relative to `today` (YYYY-MM-DD). */
export function daysPastDue(dueDate: string, today: string) {
  return Math.max(0, Math.round((Date.parse(today) - Date.parse(dueDate)) / 86_400_000));
}

export function arrearsBucket(dpd: number) {
  if (dpd === 0) return "current";
  if (dpd <= 30) return "1–30";
  if (dpd <= 60) return "31–60";
  if (dpd <= 90) return "61–90";
  return "90+";
}

/* ───────────── Credit policy (assumptions — confirm with NANAM's credit committee) ───────────── */

export const creditPolicy = {
  /** Maximum instalment as a share of verified monthly income. */
  maxDebtToIncome: 0.4,
  /** Minimum collateral valuation as a multiple of the loan amount. */
  minCollateralCover: 1.5,
};

/* ───────────── Early settlement ───────────── */

type SchedLine = { id: string; seq: number; dueDate: string; principalDue: number; interestDue: number; amountDue: number; amountPaid: number };

/**
 * Settlement today = everything overdue + the current period's instalment in full
 * + only the remaining principal of later instalments (their future interest is waived).
 */
export function settlementQuote(lines: SchedLine[], todayIso: string) {
  const open = lines.filter((l) => l.amountPaid < l.amountDue).sort((a, b) => a.seq - b.seq);
  const current = open.find((l) => l.dueDate >= todayIso);
  let amount = 0;
  let waived = 0;
  const adjustments: { id: string; interestDue: number; amountDue: number }[] = [];
  for (const l of open) {
    if (l.dueDate < todayIso || l === current) {
      amount += l.amountDue - l.amountPaid;
      continue;
    }
    // Future period: keep any interest already paid, waive the rest.
    const interestPaid = Math.min(l.interestDue, l.amountPaid);
    waived += l.interestDue - interestPaid;
    adjustments.push({ id: l.id, interestDue: interestPaid, amountDue: l.principalDue + interestPaid });
    amount += l.principalDue + interestPaid - l.amountPaid;
  }
  return { amount, waived, adjustments };
}
