/**
 * Seeds staff accounts and (locally) demo lending data.
 *   npm run db:seed            → staff + demo data (refuses demo data on a DATABASE_URL unless SEED_DEMO=1)
 * Passwords are generated and written to .data/seed-credentials.txt (gitignored), never printed.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { eq, sql } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { assertNoServerRunning, credentialsPath } from "../src/db/local-lock";
import * as s from "../src/db/schema";
import { allocate, buildSchedule, isoDate } from "../src/lib/lending";
import { hashPassword } from "../src/lib/password";

if (!process.env.DATABASE_URL) assertNoServerRunning();
const { db, driver, close } = createDb();
const demo = driver === "pglite" || process.env.SEED_DEMO === "1";

const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.staff);
if (Number(n) > 0) {
  console.log("Staff already exist — skipping seed. Delete .data/pglite to start fresh.");
  await close();
  process.exit(0);
}

const team = [
  { name: "Grace Namubiru", email: "admin@nanam.test", role: "admin" as const },
  { name: "Joseph Kato", email: "manager@nanam.test", role: "manager" as const },
  { name: "Ruth Achieng", email: "officer@nanam.test", role: "officer" as const },
  { name: "Brian Ssali", email: "finance@nanam.test", role: "finance" as const },
];
const creds: string[] = ["# NANAM console — local seed accounts (do not commit)"];
const staffIds: Record<string, string> = {};
for (const t of team) {
  const password = randomBytes(9).toString("base64url");
  const [row] = await db.insert(s.staff).values({ ...t, passwordHash: await hashPassword(password) }).returning({ id: s.staff.id });
  staffIds[t.role] = row.id;
  creds.push(`${t.role.padEnd(8)} ${t.email}  ${password}`);
}
const credFile = credentialsPath();
mkdirSync(dirname(credFile), { recursive: true });
writeFileSync(credFile, creds.join("\n") + "\n", { mode: 0o600 });
console.log(`✓ staff created — credentials in ${credFile}`);

if (!demo) {
  await close();
  process.exit(0);
}

/* ───────────── Demo data ───────────── */
const rate = 2.8;
const ref = (p: string) => `${p}-DEMO-${randomBytes(2).toString("hex").toUpperCase()}`;
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000);
const todayIso = isoDate(new Date());

const [agent] = await db
  .insert(s.agents)
  .values({
    reference: ref("AGT"),
    type: "b2b",
    fullName: "Mukono Traders SACCO",
    organisation: "Mukono Traders SACCO",
    registrationNumber: "SACCO/2019/0412",
    email: "info@mukonotraders.test",
    phone: "+256772000111",
    whatsapp: "+256772000111",
    district: "Mukono",
    subCounty: "Goma",
    payout: "bank",
    status: "active",
    referralCode: "MUKO7A2F",
  })
  .returning({ id: s.agents.id });
await db.insert(s.agents).values({
  reference: ref("AGT"),
  type: "p2p",
  fullName: "Peter Okello",
  email: "peter.okello@example.test",
  phone: "+256701000222",
  whatsapp: "+256701000222",
  district: "Wakiso",
  subCounty: "Kira",
  payout: "mobile-money",
});

type Seed = {
  name: string; phone: string; nin: string; district: string; product: string; amount: number; months: number;
  purpose: string; income: number; security: "logbook" | "land-title" | "contract";
  collateral?: { description: string; identifier: string; valuation: number };
  stage: "new" | "reviewing" | "recommended" | "approved" | "declined" | "loan";
  disbursedDaysAgo?: number; paidInstalments?: number; partial?: number; viaAgent?: boolean; createdDaysAgo: number;
  /** Paid instalment 1 early by Mobile Money, overpaying by this much (opens a refund case). */
  overpaid?: number;
};

const seeds: Seed[] = [
  { name: "Sarah Nakato", phone: "+256772345678", nin: "CF90021234ABCD", district: "Wakiso", product: "business", amount: 15_000_000, months: 4, purpose: "Restock hardware shop for the festive season", income: 9_000_000, security: "land-title", stage: "new", createdDaysAgo: 0 },
  { name: "Daniel Mugisha", phone: "+256701234567", nin: "CM88011234EFGH", district: "Kampala", product: "logbook", amount: 8_000_000, months: 3, purpose: "School fees and medical bills", income: 4_500_000, security: "logbook", stage: "new", createdDaysAgo: 1, viaAgent: true },
  { name: "Aisha Nabukenya", phone: "+256753112233", nin: "CF92051234IJKL", district: "Mukono", product: "contract-finance", amount: 40_000_000, months: 5, purpose: "Supply of furniture to district LPO", income: 18_000_000, security: "contract", collateral: { description: "Toyota Hiace 2015 + district LPO", identifier: "UBE 412K", valuation: 65_000_000 }, stage: "reviewing", createdDaysAgo: 2 },
  { name: "Moses Tumusiime", phone: "+256782998877", nin: "CM85031234MNOP", district: "Wakiso", product: "logbook", amount: 12_000_000, months: 6, purpose: "Expand boda boda fleet", income: 6_000_000, security: "logbook", collateral: { description: "Toyota Premio 2012, silver", identifier: "UBA 123X", valuation: 22_000_000 }, stage: "recommended", createdDaysAgo: 3 },
  { name: "Esther Akello", phone: "+256774556677", nin: "CF87121234QRST", district: "Kampala", product: "asset-finance", amount: 25_000_000, months: 6, purpose: "Purchase titled plot in Namugongo (50% paid)", income: 12_000_000, security: "land-title", collateral: { description: "Plot being purchased, Namugongo", identifier: "Block 214 Plot 1180", valuation: 50_000_000 }, stage: "approved", createdDaysAgo: 4 },
  { name: "Ivan Byaruhanga", phone: "+256706443322", nin: "CM91041234UVWX", district: "Mbarara", product: "business", amount: 60_000_000, months: 6, purpose: "Working capital", income: 7_000_000, security: "land-title", stage: "declined", createdDaysAgo: 9 },
  // Loans: one current, one in arrears, one deep arrears, one fully repaid.
  { name: "Florence Nansubuga", phone: "+256772111999", nin: "CF86071234YZAB", district: "Wakiso", product: "logbook", amount: 10_000_000, months: 3, purpose: "Stock for retail shop", income: 6_500_000, security: "logbook", collateral: { description: "Toyota Wish 2010, black", identifier: "UAZ 889L", valuation: 18_000_000 }, stage: "loan", disbursedDaysAgo: 40, paidInstalments: 1, createdDaysAgo: 43, viaAgent: true },
  { name: "Samuel Okot", phone: "+256703555444", nin: "CM83091234CDEF", district: "Kampala", product: "business", amount: 20_000_000, months: 4, purpose: "Restaurant equipment", income: 11_000_000, security: "land-title", collateral: { description: "Land, Kira municipality", identifier: "Block 105 Plot 77", valuation: 45_000_000 }, stage: "loan", disbursedDaysAgo: 75, paidInstalments: 1, partial: 2_000_000, createdDaysAgo: 80 },
  { name: "Harriet Atim", phone: "+256781222333", nin: "CF89021234GHIJ", district: "Mukono", product: "contract-finance", amount: 30_000_000, months: 3, purpose: "School supplies tender", income: 14_000_000, security: "contract", collateral: { description: "Isuzu Elf truck 2014", identifier: "UBD 301F", valuation: 55_000_000 }, stage: "loan", disbursedDaysAgo: 130, paidInstalments: 0, createdDaysAgo: 135 },
  { name: "Robert Sserwadda", phone: "+256752777888", nin: "CM80011234KLMN", district: "Wakiso", product: "logbook", amount: 5_000_000, months: 2, purpose: "Emergency medical costs", income: 3_500_000, security: "logbook", collateral: { description: "Toyota Ipsum 2006", identifier: "UAR 554C", valuation: 11_000_000 }, stage: "loan", disbursedDaysAgo: 95, paidInstalments: 2, createdDaysAgo: 98 },
  { name: "Gloria Nambi", phone: "+256709101112", nin: "CF94061234OPQR", district: "Kampala", product: "business", amount: 18_000_000, months: 6, purpose: "Salon expansion", income: 8_500_000, security: "logbook", collateral: { description: "Subaru Forester 2011", identifier: "UBB 220M", valuation: 30_000_000 }, stage: "loan", disbursedDaysAgo: 12, paidInstalments: 0, createdDaysAgo: 15, overpaid: 150_000 },
];

for (const d of seeds) {
  const createdAt = daysAgo(d.createdDaysAgo);
  const status: s.ApplicationStatus = d.stage === "loan" ? "disbursed" : d.stage;
  const advanced = ["recommended", "approved", "declined", "loan"].includes(d.stage);
  const [app] = await db
    .insert(s.applications)
    .values({
      reference: ref("NFL"), status, product: d.product, amount: d.amount, months: d.months, purpose: d.purpose,
      fullName: d.name, phone: d.phone, nin: d.nin, district: d.district, incomeSource: "business", monthlyIncome: d.income,
      security: d.security, agentId: d.viaAgent ? agent.id : null, referralCode: d.viaAgent ? "MUKO7A2F" : null,
      assignedTo: d.stage === "new" ? null : staffIds.officer,
      recommendedBy: advanced ? staffIds.officer : null,
      approvedAmount: advanced ? d.amount : null, approvedMonths: advanced ? d.months : null,
      decisionNote: advanced ? "Income verified against 6-month MoMo statement. Collateral inspected and valued. Good repayment history with other lenders." : null,
      decidedBy: ["approved", "declined", "loan"].includes(d.stage) ? staffIds.manager : null,
      decidedAt: ["approved", "declined", "loan"].includes(d.stage) ? daysAgo(d.createdDaysAgo - 1) : null,
      createdAt, updatedAt: createdAt,
    })
    .returning({ id: s.applications.id });

  if (d.stage === "declined") {
    await db.insert(s.notes).values({ applicationId: app.id, authorId: staffIds.manager, body: "Declined: requested amount far exceeds verified income; instalment would be over 150% of income." });
  }
  if (d.collateral) {
    const held = ["approved", "loan", "recommended"].includes(d.stage);
    const repaid = d.stage === "loan" && d.paidInstalments === d.months;
    await db.insert(s.collateral).values({
      applicationId: app.id, type: d.security, ...d.collateral,
      status: repaid ? "released" : held ? "held" : "pending",
      receivedAt: held ? daysAgo(d.createdDaysAgo - 1) : null, releasedAt: repaid ? daysAgo(3) : null,
    });
  }
  if (d.stage !== "loan") continue;

  const start = daysAgo(d.disbursedDaysAgo!);
  const fee = Math.round(d.amount * 0.02);
  const [loan] = await db
    .insert(s.loans)
    .values({
      reference: ref("LN"), applicationId: app.id, borrowerName: d.name, borrowerPhone: d.phone, product: d.product,
      principal: d.amount, monthlyRate: rate, months: d.months, processingFee: fee, netDisbursed: d.amount - fee,
      disbursedAt: start, disbursementMethod: "mobile_money", disbursementRef: `MP${randomBytes(4).toString("hex").toUpperCase()}`,
      disbursedBy: staffIds.finance, status: d.paidInstalments === d.months ? "closed" : "active",
      closedAt: d.paidInstalments === d.months ? daysAgo(3) : null,
    })
    .returning({ id: s.loans.id });
  const rows = await db
    .insert(s.installments)
    .values(buildSchedule(d.amount, d.months, rate, start).map((r) => ({ ...r, loanId: loan.id })))
    .returning();

  const pay = async (amount: number, when: Date, reference = `MP${randomBytes(4).toString("hex").toUpperCase()}`) => {
    const open = rows.filter((r) => r.amountPaid < r.amountDue);
    const { updates } = allocate(amount, open);
    for (const u of updates) {
      const r = rows.find((x) => x.id === u.id)!;
      r.amountPaid += u.add;
      await db.update(s.installments).set({ amountPaid: r.amountPaid, paidAt: u.settles ? when : null }).where(eq(s.installments.id, u.id));
    }
    const [rep] = await db.insert(s.repayments).values({ loanId: loan.id, amount, method: "mobile_money", reference, receivedAt: when, recordedBy: staffIds.finance }).returning({ id: s.repayments.id });
    return rep.id;
  };
  for (let i = 0; i < (d.paidInstalments ?? 0); i++) {
    const due = new Date(`${rows[i].dueDate}T09:00:00Z`);
    await pay(rows[i].amountDue, due.getTime() > Date.now() ? new Date() : due);
  }
  if (d.partial) await pay(d.partial, daysAgo(10));
  if (d.overpaid) {
    const txn = `MP${randomBytes(4).toString("hex").toUpperCase()}`;
    const repaymentId = await pay(rows[0].amountDue, daysAgo(2), txn);
    const [req] = await db
      .insert(s.paymentRequests)
      .values({
        loanId: loan.id, customerPhone: d.phone, payerMsisdn: d.phone, network: "airtel", amount: rows[0].amountDue + d.overpaid,
        purpose: "custom", status: "successful", provider: "airtel-test", providerRef: `TEST-AIRTEL-${randomBytes(6).toString("hex")}`,
        providerTxnId: txn, excess: d.overpaid, repaymentId, completedAt: daysAgo(2),
      })
      .returning({ id: s.paymentRequests.id });
    await db.insert(s.refunds).values({ paymentRequestId: req.id, loanId: loan.id, amount: d.overpaid, payeeMsisdn: d.phone, network: "airtel", reason: "Paid more than was owed" });
  }
  if (d.viaAgent) await db.insert(s.commissions).values({ agentId: agent.id, loanId: loan.id, amount: Math.round(d.amount * 0.01) });
}

await db.insert(s.messages).values([
  { reference: ref("MSG"), name: "Patrick Wasswa", email: "patrick.w@example.test", phone: "+256772404040", topic: "new-loan", body: "Hello, I have a Toyota Noah 2014. How much can I get on a logbook loan and how long does valuation take?" },
  { reference: ref("MSG"), name: "Kampala Forex Ltd", email: "ops@kampalaforex.test", topic: "partnership", body: "We would like to become a B2B referral partner. Please share commission terms." },
]);

console.log(`✓ demo data: ${seeds.length} applications, ${seeds.filter((x) => x.stage === "loan").length} loans (today ${todayIso})`);
await close();
