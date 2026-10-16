import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// All money is whole Uganda Shillings (UGX has no minor unit in practice).
const ugx = (name: string) => bigint(name, { mode: "number" });
const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/* ───────────── Staff & sessions ───────────── */

export const staffRole = pgEnum("staff_role", ["admin", "manager", "officer", "finance"]);

export const staff = pgTable("staff", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: staffRole("role").notNull(),
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie token; the raw token is never stored.
    id: text("id").primaryKey(),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_staff_idx").on(t.staffId)],
);

/* ───────────── Agents (partner network) ───────────── */

export const agentStatus = pgEnum("agent_status", ["pending", "active", "suspended", "rejected"]);

export const agents = pgTable("agents", {
  id: id(),
  reference: text("reference").notNull().unique(),
  type: text("type", { enum: ["b2b", "p2p"] }).notNull(),
  fullName: text("full_name").notNull(),
  organisation: text("organisation"),
  registrationNumber: text("registration_number"),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp").notNull(),
  district: text("district").notNull(),
  subCounty: text("sub_county").notNull(),
  payout: text("payout", { enum: ["bank", "mobile-money"] }).notNull(),
  status: agentStatus("status").notNull().default("pending"),
  referralCode: text("referral_code").unique(),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(1),
  createdAt: createdAt(),
});

/* ───────────── Applications ───────────── */

export const applicationStatus = pgEnum("application_status", [
  "new",
  "reviewing",
  "recommended",
  "approved",
  "declined",
  "disbursed",
  "withdrawn",
]);

export const applications = pgTable(
  "applications",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    status: applicationStatus("status").notNull().default("new"),
    product: text("product").notNull(),
    amount: ugx("amount").notNull(),
    months: integer("months").notNull(),
    purpose: text("purpose").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    nin: text("nin").notNull(),
    district: text("district").notNull(),
    incomeSource: text("income_source").notNull(),
    monthlyIncome: ugx("monthly_income").notNull(),
    security: text("security").notNull(),
    securityDetails: text("security_details"),
    referralCode: text("referral_code"),
    agentId: uuid("agent_id").references(() => agents.id),
    assignedTo: uuid("assigned_to").references(() => staff.id),
    recommendedBy: uuid("recommended_by").references(() => staff.id),
    decidedBy: uuid("decided_by").references(() => staff.id),
    approvedAmount: ugx("approved_amount"),
    approvedMonths: integer("approved_months"),
    decisionNote: text("decision_note"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("applications_status_idx").on(t.status), index("applications_created_idx").on(t.createdAt)],
);

export const notes = pgTable(
  "notes",
  {
    id: id(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => staff.id),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("notes_application_idx").on(t.applicationId)],
);

/* ───────────── Collateral register ───────────── */

export const collateralStatus = pgEnum("collateral_status", ["pending", "held", "released"]);

export const collateral = pgTable(
  "collateral",
  {
    id: id(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    type: text("type", { enum: ["logbook", "land-title", "contract"] }).notNull(),
    description: text("description").notNull(),
    // Vehicle registration, plot/block number, or contract number.
    identifier: text("identifier").notNull(),
    valuation: ugx("valuation"),
    status: collateralStatus("status").notNull().default("pending"),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("collateral_application_idx").on(t.applicationId)],
);

/* ───────────── Loans, schedule, repayments ───────────── */

export const loanStatus = pgEnum("loan_status", ["active", "closed", "written_off"]);
export const paymentMethod = pgEnum("payment_method", ["mobile_money", "bank", "cash"]);

export const loans = pgTable(
  "loans",
  {
    id: id(),
    reference: text("reference").notNull().unique(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    borrowerName: text("borrower_name").notNull(),
    borrowerPhone: text("borrower_phone").notNull(),
    product: text("product").notNull(),
    principal: ugx("principal").notNull(),
    monthlyRate: numeric("monthly_rate", { precision: 5, scale: 2, mode: "number" }).notNull(),
    months: integer("months").notNull(),
    processingFee: ugx("processing_fee").notNull(),
    netDisbursed: ugx("net_disbursed").notNull(),
    disbursedAt: timestamp("disbursed_at", { withTimezone: true }).notNull(),
    disbursementMethod: paymentMethod("disbursement_method").notNull(),
    disbursementRef: text("disbursement_ref").notNull(),
    disbursedBy: uuid("disbursed_by")
      .notNull()
      .references(() => staff.id),
    status: loanStatus("status").notNull().default("active"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("loans_application_uq").on(t.applicationId), index("loans_status_idx").on(t.status)],
);

export const installments = pgTable(
  "installments",
  {
    id: id(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => loans.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    dueDate: date("due_date").notNull(),
    principalDue: ugx("principal_due").notNull(),
    interestDue: ugx("interest_due").notNull(),
    amountDue: ugx("amount_due").notNull(),
    amountPaid: ugx("amount_paid").notNull().default(0),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("installments_loan_seq_uq").on(t.loanId, t.seq), index("installments_due_idx").on(t.dueDate)],
);

export const repayments = pgTable(
  "repayments",
  {
    id: id(),
    loanId: uuid("loan_id")
      .notNull()
      .references(() => loans.id),
    amount: ugx("amount").notNull(),
    method: paymentMethod("method").notNull(),
    reference: text("reference").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    recordedBy: uuid("recorded_by")
      .notNull()
      .references(() => staff.id),
    createdAt: createdAt(),
  },
  (t) => [index("repayments_loan_idx").on(t.loanId), uniqueIndex("repayments_method_ref_uq").on(t.method, t.reference)],
);

export const commissions = pgTable("commissions", {
  id: id(),
  agentId: uuid("agent_id")
    .notNull()
    .references(() => agents.id),
  loanId: uuid("loan_id")
    .notNull()
    .unique()
    .references(() => loans.id),
  amount: ugx("amount").notNull(),
  status: text("status", { enum: ["pending", "paid"] }).notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/* ───────────── Inbox & audit ───────────── */

export const messages = pgTable("messages", {
  id: id(),
  reference: text("reference").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  topic: text("topic").notNull(),
  body: text("body").notNull(),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  createdAt: createdAt(),
});

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorId: uuid("actor_id").references(() => staff.id),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId), index("audit_created_idx").on(t.createdAt)],
);

/* ───────────── Relations ───────────── */

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  agent: one(agents, { fields: [applications.agentId], references: [agents.id] }),
  assignee: one(staff, { fields: [applications.assignedTo], references: [staff.id] }),
  notes: many(notes),
  collateral: many(collateral),
  loan: one(loans, { fields: [applications.id], references: [loans.applicationId] }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  application: one(applications, { fields: [notes.applicationId], references: [applications.id] }),
  author: one(staff, { fields: [notes.authorId], references: [staff.id] }),
}));

export const collateralRelations = relations(collateral, ({ one }) => ({
  application: one(applications, { fields: [collateral.applicationId], references: [applications.id] }),
}));

export const loansRelations = relations(loans, ({ one, many }) => ({
  application: one(applications, { fields: [loans.applicationId], references: [applications.id] }),
  installments: many(installments),
  repayments: many(repayments),
  commission: one(commissions, { fields: [loans.id], references: [commissions.loanId] }),
}));

export const installmentsRelations = relations(installments, ({ one }) => ({
  loan: one(loans, { fields: [installments.loanId], references: [loans.id] }),
}));

export const repaymentsRelations = relations(repayments, ({ one }) => ({
  loan: one(loans, { fields: [repayments.loanId], references: [loans.id] }),
  recorder: one(staff, { fields: [repayments.recordedBy], references: [staff.id] }),
}));

export const commissionsRelations = relations(commissions, ({ one }) => ({
  agent: one(agents, { fields: [commissions.agentId], references: [agents.id] }),
  loan: one(loans, { fields: [commissions.loanId], references: [loans.id] }),
}));

export const auditRelations = relations(auditLog, ({ one }) => ({
  actor: one(staff, { fields: [auditLog.actorId], references: [staff.id] }),
}));

export type Staff = typeof staff.$inferSelect;
export type Role = Staff["role"];
export type Application = typeof applications.$inferSelect;
export type ApplicationStatus = Application["status"];
export type Loan = typeof loans.$inferSelect;
export type Installment = typeof installments.$inferSelect;
