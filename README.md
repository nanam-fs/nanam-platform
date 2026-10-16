# NANAM Financial Services — web platform

Public website, staff console and customer portal for [nanam.ug](https://nanam.ug).

**Stack:** Next.js 16 (App Router, Server Actions, React 19) · TypeScript · Tailwind CSS v4 · Postgres via Drizzle ORM · Zod. Deploys to Vercel.

## Run it locally

```bash
npm install
npm run db:reset   # creates a local Postgres (PGlite) in .data/, migrates, seeds staff + demo data
npm run dev        # http://localhost:3000  ·  console: http://localhost:3000/console
```

Staff sign-in details for local use are written to `.data/seed-credentials.txt` (one account per role, generated passwords, gitignored).

**Customer portal (`/portal`) locally:** sign in with a demo borrower's number (e.g. `0772 111 999`). In test mode the SMS code is written to `.data/sms-outbox.log` and Mobile Money payments are simulated (approve after ~6 s; payer numbers ending `000` are declined). Test mode is on under `npm run dev`; for `npm start` set `NANAM_TEST_MODE=1`. It can never activate on a Vercel production deployment.
Stop the dev server before running any `db:*` command. The local database is a single-process file.

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (local, or to `DATABASE_URL` if set) |
| `npm run db:seed` | Create staff accounts (+ demo data locally only) |
| `npm run db:staff-passwords` | Issue fresh passwords for the local seed staff accounts |
| `npm test` | Lending engine and SMS rule unit tests |

## Going to production

1. Create a Postgres database (recommended: **Neon** via the Vercel Marketplace: `vercel integration add neon`), which sets `DATABASE_URL`.
2. `DATABASE_URL=... npm run db:migrate`, then `DATABASE_URL=... npm run db:seed` to create the four staff accounts (no demo data in production).
3. Sign in as admin, change the password, create real staff accounts under **Team**, and disable the seed accounts.
4. Set the environment variables below and deploy to Vercel.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection |
| `PUBLIC_BASE_URL` | e.g. `https://nanam.ug`, used for provider callback URLs |
| `AT_USERNAME`, `AT_API_KEY`, `AT_SENDER_ID` (optional) | Africa's Talking SMS for portal sign-in codes |
| `MTN_MOMO_BASE_URL`, `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, `MTN_MOMO_API_KEY`, `MTN_MOMO_TARGET_ENV` (`mtnuganda`) | MTN MoMo Collections |
| `AIRTEL_BASE_URL`, `AIRTEL_CLIENT_ID`, `AIRTEL_CLIENT_SECRET` | Airtel Money Collections |
| `BLOB_READ_WRITE_TOKEN` or a connected **private** Blob store (`BLOB_STORE_ID`) | Client documents (`vercel blob create-store nanam-docs --access private`) |
| `UPLOAD_TOKEN_SECRET` (32+ random chars) | Signs the 24-hour links that let applicants upload documents right after applying |
| `SMILEID_PARTNER_ID`, `SMILEID_API_KEY`, `SMILEID_ENV` (`sandbox`/`production`) | Instant identity verification (Smile ID Document Verification) |
| `RESEND_API_KEY`, `EMAIL_FROM` | Staff password-reset emails |
| `CRON_SECRET` | Protects the cron routes (`vercel.ts`: payment sweep every 15 min, reminders daily 09:00 EAT) |

Without SMS credentials the portal can't send codes; without a network's Mobile Money credentials, that network is hidden. Nothing silently falls back to test mode in production.
Register callback URLs with the providers: `https://nanam.ug/api/payments/mtn/callback` and `https://nanam.ug/api/payments/airtel/callback`.

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

## Customer portal — `/portal`

| Feature | How it works |
| --- | --- |
| Phone sign-in | 6-digit SMS code (hashed, single-use, 10 min, 5 attempts, 3 codes per 15 min). Codes only go to numbers with an application or loan; the response is identical either way |
| Overview | Balance, next payment, overdue warning, repayment progress, early-payoff saving, live application tracker |
| Loan details | Schedule with paid / overdue status, payment history |
| Statement | Printable ledger (save as PDF) that reconciles charged vs paid to a zero balance |
| Mobile Money | MTN MoMo or Airtel Money prompt on the customer's phone. Pay next instalment, overdue amount, full payoff or any amount |

**Payment safety:** money is posted only after the provider confirms it. Callbacks only identify which payment to re-check, so the outcome is always re-queried from the provider. Posting is idempotent (one transaction claims the request and posts it). Duplicate transaction IDs are rejected. Overpayments are posted up to the amount owed and the excess is flagged for refund in the console. A sweep re-checks anything unresolved.

## Identity verification

After applying, the applicant photographs their National ID (front and back) and takes a guided selfie. On a computer a QR code hands off to their phone and the result appears live; on a phone it starts directly. Photos are checked for exposure before upload, stored privately, and submitted to **Smile ID Document Verification** (V3 API, signed webhooks, sweep cron). Liveness frames are not stored by NANAM.

Decision (`src/lib/kyc-rules.ts`, unit-tested): provider *clear* + NIN and name match → **verified in seconds**; *attention* or a mismatch → officer review; *block* → rejected; *error* → retake. Officers can review, override, text a verification link, or verify walk-ins in person. **Disbursement requires a verified identity.**

Test mode uses a simulator mirroring Smile ID's sandbox: surname `Twinley` → face mismatch, `Masquero` → spoof, `Xeroxley` → review, `Blurton` → retake, given name containing `Mismatch` → NIN mismatch; anyone else verifies. In Smile ID's real sandbox, use their documented test identities (e.g. Amina Fatou Clearwater). To confirm on the first sandbox run: how Smile ID wants the nested `consent`/`user_details` multipart fields encoded (we send JSON strings).

## Mobile Money sandboxes

- **MTN:** subscribe to Collections at momodeveloper.mtn.com, then `MTN_MOMO_SUBSCRIPTION_KEY=… npm run momo:mtn-sandbox` creates the sandbox API user/key in `.env.local`. Sandbox amounts are EUR; magic payer numbers (e.g. 46733123450 failed, …453 stays pending) are preset in the lab.
- **Airtel:** create an app at developers.airtel.ug, set `AIRTEL_CLIENT_ID`/`AIRTEL_CLIENT_SECRET` (staging host `openapiuat.airtel.ug`).
- **Console → Payments lab** (finance/admin) tests each network end to end with live status and raw responses, never touching loans and refusing live mode.

## Website assistant & WhatsApp

The assistant needs no API and costs nothing: it runs in the visitor's browser and answers only from verified NANAM content (`src/lib/assistant/`), computes repayment estimates with the real loan maths, understands common Luganda words, refuses PINs/ID numbers, and hands off to WhatsApp. Add or edit answers in `knowledge.ts`; `npm test` checks behaviour. The dock hides over the hero and footer so it never covers content.

## Legal pages

Draft privacy policy, terms, key loan facts, complaints procedure, fraud & security and cookie notice live in `src/lib/legal.ts` and show a "draft for legal review" banner (`LEGAL_IS_DRAFT`). Items in [brackets] must be completed by NANAM, not guessed.

## Design

Display type **Cabinet Grotesk**, UI type **Switzer** (Fontshare, ITF Free Font License: commercial use allowed, files must not be modified or published in a repository, so they are gitignored and downloaded from Fontshare by `npm run fonts`, which runs automatically before `dev` and `build`). Location photography from Unsplash (credited in the footer; people pictured are not clients). Animated icons and motion use Motion (`LazyMotion`, reduced-motion aware).

## Refunds — `/console/refunds`

A Mobile Money payment that exceeds what's owed (or arrives after a loan is settled) automatically opens a refund case.
**Manager approves or rejects** with a reason → **finance pays it out** and records the transaction reference → the client gets an SMS.
The approver can never be the one who pays it. Payout is recorded manually for now; automating it via MTN/Airtel disbursement APIs is a later step.

## Client documents

Applicants upload ID, passport photo, statements and collateral documents on the confirmation screen right after applying (24-hour signed link), or any time from the portal. Staff can also upload scans.
Officers verify or reject each document in the console (with a reason the client sees in the portal), and the credit assessment shows how many required documents are verified.

- Files are checked by their actual bytes (JPEG, PNG, WebP, PDF only), up to 4 MB; phone photos are compressed in the browser first.
- Stored privately (Vercel Blob private store; `.data/uploads` in test mode) and served only through `/api/documents/[id]` to staff or the owning customer. Upload links can't read files.
- Every staff view of a document is written to the audit log.

## SMS to clients

| Message | When |
| --- | --- |
| Due soon | 1–3 days before an instalment is due |
| Due today | On the due date |
| Overdue | 1, 7 and 30+ days after the oldest missed instalment: one message per loan with the total owed |
| Receipt | Instantly when any repayment posts (staff entry or Mobile Money), with the new balance |
| Disbursed | When a loan is paid out, with the first due date |

Reminders run daily at 09:00 Kampala time (and on demand from **Console → SMS & reminders**). Every message has a dedupe key, so reruns never text a client twice. Failed sends retry up to 3 times. While a loan is in arrears it gets only the arrears message. Wording is factual and polite, and every template is unit-tested to fit in one 160-character SMS.

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
| `src/app/portal/` | Customer portal |
| `src/lib/repayments.ts` | The single path for posting money to a loan (staff and Mobile Money) |
| `src/lib/payments.ts` · `momo.ts` · `sms.ts` | Payment requests and reconciliation, MTN/Airtel clients, SMS |
| `src/lib/customer-auth.ts` | Portal OTP sign-in and sessions |
| `src/lib/documents-config.ts` · `storage.ts` · `upload-token.ts` | Required documents per product, file checks · private storage · applicant upload links |
| `src/lib/reminder-rules.ts` · `notifications.ts` | Which SMS to send when (pure, tested) · delivery with dedupe and retries |

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
| Required documents | Per product, mirroring the website's requirements | `requiredDocuments` in `src/lib/documents-config.ts` |
| Reminder schedule | 3 days before, due day, 1 / 7 / 30 days overdue | `planReminders` in `src/lib/reminder-rules.ts` |

## Roadmap

- Automated refund payouts via MTN/Airtel disbursement APIs.
- Real client photography and testimonials (with consent) to replace stock location photos.
- Agent self-service dashboard (referrals, commission statements).
- Privacy policy and loan terms pages (legal to supply); UMRA licence number in the footer.
