import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { ApplicationStatus } from "@/db/schema";

/** Today's date in Kampala, as YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Kampala" });

// Principal still owed on an instalment: payments go to interest first, then principal.
const principalOutstanding = sql.raw(
  "(i.principal_due - greatest(0, least(i.principal_due, i.amount_paid - i.interest_due)))",
);

async function one<T>(query: ReturnType<typeof sql>) {
  const res = await db.execute(query);
  return (res as unknown as { rows?: T[] }).rows?.[0] ?? (res as unknown as T[])[0];
}
async function many<T>(query: ReturnType<typeof sql>) {
  const res = await db.execute(query);
  return ((res as unknown as { rows?: T[] }).rows ?? (res as unknown as T[])) as T[];
}

export async function portfolioSummary() {
  const t = today();
  const row = await one<{
    outstanding: number;
    par30: number;
    arrears: number;
    due7: number;
    active_loans: number;
    loans_in_arrears: number;
  }>(sql`
    with open_i as (
      select i.*, ${principalOutstanding} as p_out
      from installments i join loans l on l.id = i.loan_id
      where l.status = 'active'
    ),
    late as (
      select distinct loan_id from open_i
      where amount_paid < amount_due and due_date < ${t}::date - 30
    )
    select
      coalesce(sum(p_out), 0)::bigint::float8 as outstanding,
      coalesce(sum(p_out) filter (where loan_id in (select loan_id from late)), 0)::float8 as par30,
      coalesce(sum(amount_due - amount_paid) filter (where due_date < ${t}::date), 0)::float8 as arrears,
      coalesce(sum(amount_due - amount_paid) filter (where due_date between ${t}::date and ${t}::date + 7), 0)::float8 as due7,
      count(distinct loan_id)::int as active_loans,
      count(distinct loan_id) filter (where amount_paid < amount_due and due_date < ${t}::date)::int as loans_in_arrears
    from open_i
  `);
  return {
    outstanding: Number(row?.outstanding ?? 0),
    par30: Number(row?.par30 ?? 0),
    par30Ratio: row && Number(row.outstanding) > 0 ? Number(row.par30) / Number(row.outstanding) : 0,
    arrears: Number(row?.arrears ?? 0),
    due7: Number(row?.due7 ?? 0),
    activeLoans: Number(row?.active_loans ?? 0),
    loansInArrears: Number(row?.loans_in_arrears ?? 0),
  };
}

export async function monthTotals() {
  const row = await one<{ disbursed: number; disbursed_count: number; collected: number; fees: number }>(sql`
    select
      (select coalesce(sum(principal), 0)::float8 from loans
         where disbursed_at >= date_trunc('month', now() at time zone 'Africa/Kampala') at time zone 'Africa/Kampala') as disbursed,
      (select count(*)::int from loans
         where disbursed_at >= date_trunc('month', now() at time zone 'Africa/Kampala') at time zone 'Africa/Kampala') as disbursed_count,
      (select coalesce(sum(processing_fee), 0)::float8 from loans
         where disbursed_at >= date_trunc('month', now() at time zone 'Africa/Kampala') at time zone 'Africa/Kampala') as fees,
      (select coalesce(sum(amount), 0)::float8 from repayments
         where received_at >= date_trunc('month', now() at time zone 'Africa/Kampala') at time zone 'Africa/Kampala') as collected
  `);
  return {
    disbursed: Number(row?.disbursed ?? 0),
    disbursedCount: Number(row?.disbursed_count ?? 0),
    collected: Number(row?.collected ?? 0),
    fees: Number(row?.fees ?? 0),
  };
}

/** Disbursed and collected per month, last 6 months including this one. */
export async function monthlySeries() {
  const rows = await many<{ month: string; disbursed: number; collected: number }>(sql`
    with months as (
      select generate_series(
        date_trunc('month', now() at time zone 'Africa/Kampala') - interval '5 months',
        date_trunc('month', now() at time zone 'Africa/Kampala'),
        interval '1 month'
      )::date as month
    )
    select to_char(m.month, 'YYYY-MM') as month,
      coalesce((select sum(principal) from loans l
        where date_trunc('month', l.disbursed_at at time zone 'Africa/Kampala')::date = m.month), 0)::float8 as disbursed,
      coalesce((select sum(amount) from repayments r
        where date_trunc('month', r.received_at at time zone 'Africa/Kampala')::date = m.month), 0)::float8 as collected
    from months m order by m.month
  `);
  return rows.map((r) => ({ month: r.month, disbursed: Number(r.disbursed), collected: Number(r.collected) }));
}

/** Outstanding principal by days-past-due bucket of each loan's oldest unpaid instalment. */
export async function arrearsAging() {
  const t = today();
  const rows = await many<{ bucket: string; amount: number; loans: number }>(sql`
    with per_loan as (
      select l.id,
        coalesce(sum(${principalOutstanding}), 0) as p_out,
        coalesce(max(${t}::date - i.due_date) filter (where i.amount_paid < i.amount_due and i.due_date < ${t}::date), 0) as dpd
      from loans l join installments i on i.loan_id = l.id
      where l.status = 'active'
      group by l.id
    )
    select case when dpd = 0 then 'current' when dpd <= 30 then '1–30' when dpd <= 60 then '31–60' when dpd <= 90 then '61–90' else '90+' end as bucket,
      sum(p_out)::float8 as amount, count(*)::int as loans
    from per_loan group by 1
  `);
  const order = ["current", "1–30", "31–60", "61–90", "90+"];
  return order.map((bucket) => {
    const r = rows.find((x) => x.bucket === bucket);
    return { bucket, amount: Number(r?.amount ?? 0), loans: Number(r?.loans ?? 0) };
  });
}

export async function pipelineCounts() {
  const rows = await many<{ status: ApplicationStatus; n: number }>(sql`select status, count(*)::int as n from applications group by status`);
  return Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Partial<Record<ApplicationStatus, number>>;
}

export type LoanRow = {
  id: string;
  reference: string;
  borrower_name: string;
  borrower_phone: string;
  product: string;
  principal: number;
  status: "active" | "closed" | "written_off";
  disbursed_at: string;
  outstanding: number;
  next_due: string | null;
  next_amount: number | null;
  dpd: number;
};

export async function loanBook(filter: "active" | "arrears" | "closed" | "all") {
  const t = today();
  const rows = await many<LoanRow>(sql`
    select l.id, l.reference, l.borrower_name, l.borrower_phone, l.product, l.principal::float8 as principal, l.status, l.disbursed_at,
      coalesce(sum(i.amount_due - i.amount_paid), 0)::float8 as outstanding,
      min(i.due_date) filter (where i.amount_paid < i.amount_due)::text as next_due,
      (array_agg(i.amount_due - i.amount_paid order by i.seq) filter (where i.amount_paid < i.amount_due))[1]::float8 as next_amount,
      coalesce(max(${t}::date - i.due_date) filter (where i.amount_paid < i.amount_due and i.due_date < ${t}::date), 0)::int as dpd
    from loans l join installments i on i.loan_id = l.id
    group by l.id
    order by l.disbursed_at desc
  `);
  return rows
    .map((r) => ({ ...r, principal: Number(r.principal), outstanding: Number(r.outstanding), dpd: Number(r.dpd), next_amount: r.next_amount === null ? null : Number(r.next_amount) }))
    .filter((r) =>
      filter === "all" ? true : filter === "closed" ? r.status !== "active" : filter === "arrears" ? r.status === "active" && r.dpd > 0 : r.status === "active",
    );
}

/** One row per loan with anything overdue or due within 7 days: total owing and days past due of the oldest miss. */
export async function collectionsWorklist(limit = 8) {
  const t = today();
  return many<{ loan_id: string; reference: string; borrower_name: string; borrower_phone: string; due_date: string; owing: number; dpd: number; missed: number }>(sql`
    select l.id as loan_id, l.reference, l.borrower_name, l.borrower_phone,
      min(i.due_date)::text as due_date,
      sum(i.amount_due - i.amount_paid)::float8 as owing,
      greatest(0, ${t}::date - min(i.due_date))::int as dpd,
      count(*) filter (where i.due_date < ${t}::date)::int as missed
    from installments i join loans l on l.id = i.loan_id
    where l.status = 'active' and i.amount_paid < i.amount_due and i.due_date <= ${t}::date + 7
    group by l.id
    order by min(i.due_date) asc
    limit ${limit}
  `);
}
