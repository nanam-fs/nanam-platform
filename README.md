# NANAM Financial Services — web platform

Public website + staff console for [nanam.ug](https://nanam.ug).

**Stack:** Next.js 16 (App Router, Server Actions, React 19) · TypeScript · Tailwind CSS v4 · Postgres via Drizzle ORM · Zod. Deploys to Vercel.

## Run it locally

```bash
npm install
npm run db:reset   # creates a local Postgres (PGlite) in .data/, migrates, seeds staff + demo data
npm run dev        # http://localhost:3000  ·  console: http://localhost:3000/console
```

Staff sign-in details for local use are written to `.data/seed-credentials.txt` (one account per role, generated passwords, gitignored).
Stop the dev server before running any `db:*` command. The local database is a single-process file.

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (local, or to `DATABASE_URL` if set) |
| `npm run db:seed` | Create staff accounts (+ demo data locally only) |
| `npm test` | Lending engine unit tests |

## Going to production

1. Create a Postgres database (recommended: **Neon** via the Vercel Marketplace: `vercel integration add neon`), which sets `DATABASE_URL`.
2. `DATABASE_URL=... npm run db:migrate`, then `DATABASE_URL=... npm run db:seed` to create the four staff accounts (no demo data in production).
3. Sign in as admin, change the password, create real staff accounts under **Team**, and disable the seed accounts.
4. Deploy to Vercel with `DATABASE_URL` set.

## Staff console — `/console`

| Area | What it does |
| --- | --- |
| Overview | Outstanding portfolio, PAR 30, arrears, collections due, monthly disbursements, aging, role-specific work queue |
| Applications | Website applications → review → recommend → approve/decline → disburse. Affordability (debt-to-income) and collateral-cover checks |
| Loan book | Schedules, repayments (oldest instalment first), arrears, early-settlement figure that waives future interest |
| Collateral | Register of logbooks/titles in custody; release only after full repayment |
| Agents | Partner sign-ups → activate → referral link `nanam.ug/ref/CODE` → commission on each disbursed referral |
| Messages | Contact-form inbox |
| Team / Audit log | Admin: staff accounts and roles; immutable log of every sign-in, decision and money movement |

**Controls built in:** role-based permissions (`src/lib/permissions.ts`); maker-checker (the person who recommends a loan can never approve it); disbursement blocked until the original collateral is held; duplicate payment references rejected; overpayments rejected; every action audited; sessions are httpOnly cookies backed by hashed tokens; sign-in throttling.

| Role | Can |
| --- | --- |
| Loan officer | Review applications, record collateral, recommend |
| Credit manager | Approve/decline (not their own recommendation), manage agents, release collateral |
| Finance | Disburse approved loans, record repayments, pay commissions |
| Administrator | All of the above + team management + audit log |

## Where things live

| Path | What |
| --- | --- |
| `src/lib/site.ts` | Company facts: phones, WhatsApp, address, regulator, pricing |
| `src/lib/products.ts` · `content.ts` | Loan products, FAQs, testimonials, values |
| `src/lib/lending.ts` | Workflow rules, schedule builder, repayment allocation, early settlement, **credit policy thresholds** |
| `src/lib/loan-math.ts` | Public calculator maths |
| `src/db/schema.ts` | Database tables |
| `src/app/(site)/` | Public website |
| `src/app/console/` | Staff console (`actions.ts` holds every server mutation) |

## Assumptions to confirm with NANAM

| Topic | Current assumption | Where to change |
| --- | --- | --- |
| WhatsApp number | +256 773 902993 (both numbers listed as phone lines) | `src/lib/site.ts` |
| Interest method | Reducing balance, equal monthly instalments | `src/lib/lending.ts` `buildSchedule` |
| Processing fee | 2%, deducted from the payout (borrower receives 98%) | `src/lib/site.ts`, `disburse` action |
| Loan limits | UGX 2M–100M on all products, 1–6 months | `src/lib/products.ts`, `src/lib/schemas.ts` |
| Affordability guide | Instalment ≤ 40% of monthly income | `creditPolicy` in `src/lib/lending.ts` |
| Collateral cover guide | Valuation ≥ 1.5× loan amount | `creditPolicy` in `src/lib/lending.ts` |
| Early settlement | Overdue + current period in full; future interest waived | `settlementQuote` in `src/lib/lending.ts` |
| Agent commission | 1% of principal, paid on disbursement | `agents.commission_rate` (per agent) |
| Penalties on late payment | None charged (not modelled) | — |

## Roadmap

- **Next — customer portal:** phone-number OTP sign-in, balances, schedule, statements, document upload, Mobile Money repayment (MTN MoMo / Airtel Money collections API) with automatic reconciliation.
- SMS reminders before due dates and on arrears (e.g. Africa's Talking).
- Document uploads on applications (ID, statements, logbook scans) to private blob storage.
- Agent self-service dashboard (referrals, commission statements).
- Privacy policy and loan terms pages (legal to supply); UMRA licence number in the footer.
