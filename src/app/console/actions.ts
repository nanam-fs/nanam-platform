"use server";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, schema } from "@/db";
import type { ApplicationStatus } from "@/db/schema";
import { audit } from "@/lib/audit";
import { authorize, createSession, currentSessionId, destroySession, getStaff, loginThrottle, PermissionError } from "@/lib/auth";
import { buildSchedule, canTransition } from "@/lib/lending";
import { notifyDisbursement, notifyRefund, notifyRepayment, runReminders } from "@/lib/notifications";
import { postRepayment, RepaymentError } from "@/lib/repayments";
import { hashPassword, PASSWORD_MIN, verifyPassword } from "@/lib/password";
import { adminIssueReset, completePasswordReset, requestPasswordReset } from "@/lib/password-reset";
import type { Permission } from "@/lib/permissions";
import { normalisePhone } from "@/lib/inbox";
import { site } from "@/lib/site";
import { sendSms } from "@/lib/sms";

export type ActionResult = { ok: boolean; message?: string; errors?: Record<string, string[] | undefined> };

class ActionError extends Error {}

/** Runs a mutation with authorisation and uniform error reporting. */
async function run(permission: Permission, fn: (actor: { id: string; role: string }) => Promise<string | void>): Promise<ActionResult> {
  try {
    const actor = await authorize(permission);
    const message = await fn(actor);
    return { ok: true, message: message ?? "Saved." };
  } catch (err) {
    if (err instanceof PermissionError || err instanceof ActionError) return { ok: false, message: err.message };
    if (err instanceof z.ZodError) {
      return { ok: false, message: "Please check the highlighted fields.", errors: z.flattenError(err).fieldErrors as ActionResult["errors"] };
    }
    console.error("[console] action failed", err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

const money = z.coerce.number().int("Whole shillings only").positive("Must be more than zero");
const form = (fd: FormData) => Object.fromEntries([...fd].filter(([k]) => !k.startsWith("$ACTION")));

/* ───────────── Sign in / out ───────────── */

export async function login(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const throttle = loginThrottle(`${email}|${ip}`);
  if (throttle.blocked) return { ok: false, message: "Too many attempts. Try again in 15 minutes." };

  const user = email ? await db.query.staff.findFirst({ where: eq(schema.staff.email, email) }) : undefined;
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const valid = await verifyPassword(password, user?.passwordHash ?? "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAA");
  if (!user || !valid || !user.active) {
    throttle.fail();
    await audit(db, { actorId: user?.id ?? null, action: "auth.login_failed", entity: "staff", detail: { email, ip } });
    return { ok: false, message: "Incorrect email or password." };
  }
  throttle.reset();
  await createSession(user.id);
  await db.update(schema.staff).set({ lastLoginAt: new Date() }).where(eq(schema.staff.id, user.id));
  await audit(db, { actorId: user.id, action: "auth.login", entity: "staff", entityId: user.id, detail: { ip } });
  const next = String(fd.get("next") ?? "");
  redirect(next.startsWith("/console") ? next : "/console");
}

export async function logout() {
  const staff = await getStaff();
  if (staff) await audit(db, { actorId: staff.id, action: "auth.logout", entity: "staff", entityId: staff.id });
  await destroySession();
  redirect("/console/login");
}

/* ───────────── Password recovery ───────────── */

export async function forgotPassword(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, errors: { email: ["Enter your work email"] } };
  try {
    await requestPasswordReset(email);
  } catch (err) {
    console.error("[console] reset email failed", err);
  }
  return { ok: true, message: `If ${email} has a NANAM staff account, we’ve emailed a reset link. It expires in 30 minutes.` };
}

export async function resetPassword(token: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const password = String(fd.get("password") ?? "");
  if (password !== String(fd.get("confirm") ?? "")) return { ok: false, errors: { confirm: ["Passwords don’t match"] } };
  const r = await completePasswordReset(token, password);
  if (!r.ok) return { ok: false, message: r.message };
  redirect("/console/login?reset=1");
}

export async function issueResetLink(staffId: string): Promise<ActionResult> {
  return run("staff.manage", async (actor) => {
    const { link, ttl } = await adminIssueReset(staffId, actor.id);
    return `Share this one-time link privately (valid ${ttl / 60} hours): ${link}`;
  });
}

/* ───────────── Customer phone change ───────────── */

export async function changeCustomerPhone(applicationId: string, _: ActionResult, fd: FormData) {
  const r = await run("customer.update_phone", async (actor) => {
    const data = z
      .object({
        phone: z.string().trim().refine((v) => /^(\+?256|0)?7\d{8}$/.test(v.replace(/[\s-]/g, "")), "Enter a valid Ugandan number"),
        verification: z.string().trim().min(10, "Describe how you verified the client’s identity"),
      })
      .parse(form(fd));
    const next = normalisePhone(data.phone);
    const app = await db.query.applications.findFirst({ where: eq(schema.applications.id, applicationId), columns: { phone: true, fullName: true } });
    if (!app) throw new ActionError("Application not found.");
    if (app.phone === next) throw new ActionError("That’s already the number on file.");
    const old = app.phone;
    await db.transaction(async (tx) => {
      // Move every record that belongs to this client, so the portal and reminders follow the new number.
      await tx.update(schema.applications).set({ phone: next, phoneVerifiedAt: null, updatedAt: new Date() }).where(eq(schema.applications.phone, old));
      await tx.update(schema.loans).set({ borrowerPhone: next }).where(eq(schema.loans.borrowerPhone, old));
      await tx.delete(schema.customerSessions).where(eq(schema.customerSessions.phone, old));
      await audit(tx, { actorId: actor.id, action: "customer.phone_changed", entity: "application", entityId: applicationId, detail: { from: old, to: next, verification: data.verification } });
    });
    after(async () => {
      const notice = `NANAM: The phone number on your account was changed by our team on ${new Date().toLocaleDateString("en-GB")}. If you did not request this, call ${site.phones[0]} immediately.`;
      await sendSms(old, notice).catch(() => {});
      await sendSms(next, `NANAM: Hi ${app.fullName.split(" ")[0]}, this is now the number on your NANAM account. Sign in at nanam.ug/portal.`).catch(() => {});
    });
    return `Number changed to ${next}. Both numbers have been notified by SMS.`;
  });
  revalidatePath("/console", "layout");
  return r;
}

/* ───────────── Applications ───────────── */

async function moveApplication(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  id: string,
  from: ApplicationStatus[],
  to: ApplicationStatus,
  set: Partial<typeof schema.applications.$inferInsert> = {},
) {
  const [app] = await tx.select().from(schema.applications).where(eq(schema.applications.id, id)).for("update");
  if (!app) throw new ActionError("Application not found.");
  if (!from.includes(app.status) || !canTransition(app.status, to)) {
    throw new ActionError(`This application is already ${app.status}. Refresh to see the latest state.`);
  }
  await tx
    .update(schema.applications)
    .set({ ...set, status: to, updatedAt: new Date() })
    .where(eq(schema.applications.id, id));
  return app;
}

export async function startReview(id: string) {
  const r = await run("application.review", async (actor) => {
    await db.transaction(async (tx) => {
      await moveApplication(tx, id, ["new"], "reviewing", { assignedTo: actor.id });
      await audit(tx, { actorId: actor.id, action: "application.review_started", entity: "application", entityId: id });
    });
    return "Assigned to you and moved to review.";
  });
  revalidatePath("/console", "layout");
  return r;
}

export async function recommend(id: string, _: ActionResult, fd: FormData) {
  const r = await run("application.recommend", async (actor) => {
    const data = z
      .object({
        approvedAmount: money.min(2_000_000, "Minimum UGX 2,000,000").max(100_000_000, "Maximum UGX 100,000,000"),
        approvedMonths: z.coerce.number().int().min(1).max(6),
        decisionNote: z.string().trim().min(10, "Summarise your assessment (at least 10 characters)"),
      })
      .parse(form(fd));
    await db.transaction(async (tx) => {
      await moveApplication(tx, id, ["reviewing"], "recommended", { ...data, recommendedBy: actor.id });
      await tx.insert(schema.notes).values({ applicationId: id, authorId: actor.id, body: `Recommendation: ${data.decisionNote}` });
      await audit(tx, { actorId: actor.id, action: "application.recommended", entity: "application", entityId: id, detail: data });
    });
    return "Recommended for approval.";
  });
  revalidatePath("/console", "layout");
  return r;
}

export async function decide(id: string, _: ActionResult, fd: FormData) {
  const r = await run("application.decide", async (actor) => {
    const data = z
      .object({ decision: z.enum(["approved", "declined", "reviewing"]), note: z.string().trim().min(5, "Add a short reason") })
      .parse(form(fd));
    await db.transaction(async (tx) => {
      const [app] = await tx.select().from(schema.applications).where(eq(schema.applications.id, id)).for("update");
      if (app?.recommendedBy === actor.id && data.decision === "approved") {
        throw new ActionError("You recommended this loan, so a different manager must approve it.");
      }
      await moveApplication(tx, id, ["recommended"], data.decision, {
        decidedBy: data.decision === "reviewing" ? null : actor.id,
        decidedAt: data.decision === "reviewing" ? null : new Date(),
      });
      const verb = { approved: "Approved", declined: "Declined", reviewing: "Returned for review" }[data.decision];
      await tx.insert(schema.notes).values({ applicationId: id, authorId: actor.id, body: `${verb}: ${data.note}` });
      await audit(tx, { actorId: actor.id, action: `application.${data.decision}`, entity: "application", entityId: id, detail: { note: data.note } });
    });
    return data.decision === "approved" ? "Approved. Finance can now disburse." : "Decision recorded.";
  });
  revalidatePath("/console", "layout");
  return r;
}

export async function withdraw(id: string, _: ActionResult, fd: FormData) {
  const r = await run("application.withdraw", async (actor) => {
    const note = z.string().trim().min(5, "Add a short reason").parse(fd.get("note"));
    await db.transaction(async (tx) => {
      await moveApplication(tx, id, ["new", "reviewing", "approved"], "withdrawn");
      await tx.insert(schema.notes).values({ applicationId: id, authorId: actor.id, body: `Withdrawn: ${note}` });
      await audit(tx, { actorId: actor.id, action: "application.withdrawn", entity: "application", entityId: id, detail: { note } });
    });
    return "Application withdrawn.";
  });
  revalidatePath("/console", "layout");
  return r;
}

export async function addNote(id: string, _: ActionResult, fd: FormData) {
  const r = await run("application.review", async (actor) => {
    const body = z.string().trim().min(2, "Write a note").max(2000).parse(fd.get("body"));
    await db.insert(schema.notes).values({ applicationId: id, authorId: actor.id, body });
    return "Note added.";
  });
  revalidatePath(`/console/applications/${id}`);
  return r;
}

/* ───────────── Documents ───────────── */

export async function reviewDocument(id: string, status: "verified" | "rejected", _: ActionResult, fd: FormData) {
  const r = await run("application.review", async (actor) => {
    const note = String(fd.get("note") ?? "").trim();
    if (status === "rejected" && note.length < 3) throw new ActionError("Say why, e.g. blurry photo or expired ID.");
    const [doc] = await db
      .update(schema.documents)
      .set({ status, reviewNote: note || null, reviewedBy: actor.id, reviewedAt: new Date() })
      .where(eq(schema.documents.id, id))
      .returning({ applicationId: schema.documents.applicationId, kind: schema.documents.kind });
    if (!doc) throw new ActionError("Document not found.");
    await audit(db, { actorId: actor.id, action: `document.${status}`, entity: "application", entityId: doc.applicationId, detail: { document: id, kind: doc.kind, note } });
    return status === "verified" ? "Marked as verified." : "Marked as rejected. Ask the client for a new copy.";
  });
  revalidatePath("/console", "layout");
  return r;
}

/* ───────────── Collateral ───────────── */

export async function addCollateral(applicationId: string, _: ActionResult, fd: FormData) {
  const r = await run("collateral.manage", async (actor) => {
    const data = z
      .object({
        type: z.enum(["logbook", "land-title", "contract"]),
        description: z.string().trim().min(3, "Describe the item, e.g. Toyota Premio 2012, silver"),
        identifier: z.string().trim().min(2, "Registration, plot/block or contract number"),
        valuation: z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v)),
      })
      .parse(form(fd));
    const app = await db.query.applications.findFirst({ where: eq(schema.applications.id, applicationId), columns: { status: true } });
    if (!app || !["new", "reviewing", "recommended", "approved"].includes(app.status)) {
      throw new ActionError("Collateral can only be added to an open application.");
    }
    const [row] = await db.insert(schema.collateral).values({ applicationId, ...data }).returning({ id: schema.collateral.id });
    await audit(db, { actorId: actor.id, action: "collateral.added", entity: "collateral", entityId: row.id, detail: { applicationId, ...data } });
    return "Collateral recorded.";
  });
  revalidatePath("/console", "layout");
  return r;
}

export async function markCollateralHeld(id: string) {
  const r = await run("collateral.manage", async (actor) => {
    const [row] = await db
      .update(schema.collateral)
      .set({ status: "held", receivedAt: new Date() })
      .where(and(eq(schema.collateral.id, id), eq(schema.collateral.status, "pending")))
      .returning({ id: schema.collateral.id });
    if (!row) throw new ActionError("Already marked as held.");
    await audit(db, { actorId: actor.id, action: "collateral.received", entity: "collateral", entityId: id });
    return "Original document received and held in safe custody.";
  });
  revalidatePath("/console", "layout");
  return r;
}

export async function releaseCollateral(id: string) {
  const r = await run("collateral.release", async (actor) => {
    const item = await db.query.collateral.findFirst({
      where: eq(schema.collateral.id, id),
      with: { application: { columns: { status: true }, with: { loan: { columns: { status: true } } } } },
    });
    if (!item || item.status !== "held") throw new ActionError("Only held collateral can be released.");
    const app = item.application;
    const settled = app.loan ? app.loan.status === "closed" : ["declined", "withdrawn"].includes(app.status);
    if (!settled) throw new ActionError("Collateral can only be released once the loan is fully repaid or the application has closed.");
    await db.update(schema.collateral).set({ status: "released", releasedAt: new Date() }).where(eq(schema.collateral.id, id));
    await audit(db, { actorId: actor.id, action: "collateral.released", entity: "collateral", entityId: id });
    return "Collateral released to the client.";
  });
  revalidatePath("/console", "layout");
  return r;
}

/* ───────────── Disbursement & repayments ───────────── */

export async function disburse(applicationId: string, _: ActionResult, fd: FormData) {
  let loanId = "";
  const r = await run("loan.disburse", async (actor) => {
    const data = z
      .object({
        method: z.enum(["mobile_money", "bank", "cash"]),
        reference: z.string().trim().min(3, "Enter the transaction or receipt reference"),
        date: z.iso.date("Pick the disbursement date"),
      })
      .parse(form(fd));

    loanId = await db.transaction(async (tx) => {
      const app = await moveApplication(tx, applicationId, ["approved"], "disbursed");
      const held = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(schema.collateral)
        .where(and(eq(schema.collateral.applicationId, applicationId), eq(schema.collateral.status, "held")));
      if (!held[0]?.n) throw new ActionError("Record the original collateral as held before disbursing.");

      const principal = app.approvedAmount ?? app.amount;
      const months = app.approvedMonths ?? app.months;
      const fee = Math.round((principal * site.pricing.processingFee) / 100);
      const start = new Date(`${data.date}T00:00:00Z`);
      const reference = `LN-${data.date.slice(2, 7).replace("-", "")}-${randomBytes(2).toString("hex").toUpperCase()}`;

      const [loan] = await tx
        .insert(schema.loans)
        .values({
          reference,
          applicationId,
          borrowerName: app.fullName,
          borrowerPhone: app.phone,
          product: app.product,
          principal,
          monthlyRate: site.pricing.monthlyRate,
          months,
          processingFee: fee,
          netDisbursed: principal - fee,
          disbursedAt: start,
          disbursementMethod: data.method,
          disbursementRef: data.reference,
          disbursedBy: actor.id,
        })
        .returning({ id: schema.loans.id });

      await tx.insert(schema.installments).values(
        buildSchedule(principal, months, site.pricing.monthlyRate, start).map((row) => ({ ...row, loanId: loan.id })),
      );

      if (app.agentId) {
        const agent = await tx.query.agents.findFirst({ where: eq(schema.agents.id, app.agentId), columns: { commissionRate: true } });
        if (agent) {
          await tx.insert(schema.commissions).values({
            agentId: app.agentId,
            loanId: loan.id,
            amount: Math.round((principal * agent.commissionRate) / 100),
          });
        }
      }
      await audit(tx, { actorId: actor.id, action: "loan.disbursed", entity: "loan", entityId: loan.id, detail: { loan: reference, principal, fee, method: data.method, transactionRef: data.reference, date: data.date } });
      return loan.id;
    });
    after(() => notifyDisbursement(loanId).catch((e) => console.error("[sms] disbursement notice failed", e)));
    return "Loan disbursed and repayment schedule created.";
  });
  revalidatePath("/console", "layout");
  if (r.ok) redirect(`/console/loans/${loanId}`);
  return r;
}

export async function recordRepayment(loanId: string, _: ActionResult, fd: FormData) {
  const r = await run("loan.repayment", async (actor) => {
    const data = z
      .object({
        amount: money,
        method: z.enum(["mobile_money", "bank", "cash"]),
        reference: z.string().trim().min(3, "Enter the MoMo, bank or receipt reference"),
        receivedAt: z.iso.date("Pick the date received"),
        settle: z.literal("on").optional(),
      })
      .parse(form(fd));

    try {
      const result = await db.transaction((tx) =>
        postRepayment(tx, {
          loanId,
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          receivedOn: data.receivedAt,
          recordedBy: actor.id,
          source: "staff",
          settle: !!data.settle,
          onExcess: "reject",
        }),
      );
      after(() => notifyRepayment(result.repaymentId).catch((e) => console.error("[sms] receipt failed", e)));
      return result.closes ? "Repayment recorded. The loan is now fully repaid. Collateral can be released." : "Repayment recorded.";
    } catch (err) {
      if (err instanceof RepaymentError) throw new ActionError(err.message);
      throw err;
    }
  });
  revalidatePath("/console", "layout");
  return r;
}

/* ───────────── Agents & commissions ───────────── */

export async function setAgentStatus(id: string, status: "active" | "suspended" | "rejected") {
  const r = await run("agent.manage", async (actor) => {
    const agent = await db.query.agents.findFirst({ where: eq(schema.agents.id, id) });
    if (!agent) throw new ActionError("Agent not found.");
    // Referral codes are permanent once issued so links already shared keep attributing correctly.
    const referralCode =
      agent.referralCode ?? (status === "active" ? `${agent.fullName.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase()}${randomBytes(2).toString("hex").toUpperCase()}` : null);
    await db.update(schema.agents).set({ status, referralCode }).where(eq(schema.agents.id, id));
    await audit(db, { actorId: actor.id, action: `agent.${status}`, entity: "agent", entityId: id });
    return status === "active" ? `Agent activated. Referral link: ${site.url}/ref/${referralCode}` : "Agent updated.";
  });
  revalidatePath("/console/agents");
  return r;
}

export async function markCommissionPaid(id: string) {
  const r = await run("commission.pay", async (actor) => {
    const [row] = await db
      .update(schema.commissions)
      .set({ status: "paid", paidAt: new Date() })
      .where(and(eq(schema.commissions.id, id), eq(schema.commissions.status, "pending")))
      .returning({ id: schema.commissions.id });
    if (!row) throw new ActionError("Commission already paid.");
    await audit(db, { actorId: actor.id, action: "commission.paid", entity: "commission", entityId: id });
    return "Commission marked as paid.";
  });
  revalidatePath("/console/agents");
  return r;
}

/* ───────────── Refunds ───────────── */

export async function decideRefund(id: string, _: ActionResult, fd: FormData) {
  const r = await run("refund.approve", async (actor) => {
    const data = z.object({ decision: z.enum(["approved", "rejected"]), note: z.string().trim().min(5, "Add a short reason") }).parse(form(fd));
    const [row] = await db
      .update(schema.refunds)
      .set({ status: data.decision, decidedBy: actor.id, decidedAt: new Date(), decisionNote: data.note })
      .where(and(eq(schema.refunds.id, id), eq(schema.refunds.status, "pending_approval")))
      .returning({ amount: schema.refunds.amount });
    if (!row) throw new ActionError("This refund has already been decided. Refresh to see the latest state.");
    await audit(db, { actorId: actor.id, action: `refund.${data.decision}`, entity: "refund", entityId: id, detail: { amount: row.amount, note: data.note } });
    return data.decision === "approved" ? "Approved. Finance can now pay it out." : "Refund rejected.";
  });
  revalidatePath("/console", "layout");
  // The refund leaves the current tab, so carry the confirmation to the tab it moved to.
  if (r.ok) redirect(`/console/refunds?status=${String(fd.get("decision")) === "approved" ? "approved" : "rejected"}&notice=${encodeURIComponent(r.message ?? "")}`);
  return r;
}

export async function payRefund(id: string, _: ActionResult, fd: FormData) {
  const r = await run("refund.pay", async (actor) => {
    const data = z
      .object({
        method: z.enum(["mobile_money", "bank", "cash"]),
        reference: z.string().trim().min(3, "Enter the payout transaction reference"),
      })
      .parse(form(fd));
    const refund = await db.query.refunds.findFirst({ where: eq(schema.refunds.id, id) });
    if (!refund) throw new ActionError("Refund not found.");
    if (refund.decidedBy === actor.id) throw new ActionError("You approved this refund, so someone else must pay it out.");
    const [row] = await db
      .update(schema.refunds)
      .set({ status: "paid", paidBy: actor.id, paidAt: new Date(), payoutMethod: data.method, payoutRef: data.reference })
      .where(and(eq(schema.refunds.id, id), eq(schema.refunds.status, "approved")))
      .returning({ amount: schema.refunds.amount });
    if (!row) throw new ActionError("Only approved refunds can be paid.");
    await audit(db, { actorId: actor.id, action: "refund.paid", entity: "refund", entityId: id, detail: { amount: row.amount, ...data } });
    after(() => notifyRefund(id).catch((e) => console.error("[sms] refund notice failed", e)));
    return "Refund recorded as paid. The client has been notified by SMS.";
  });
  revalidatePath("/console", "layout");
  if (r.ok) redirect(`/console/refunds?status=paid&notice=${encodeURIComponent(r.message ?? "")}`);
  return r;
}

/* ───────────── SMS reminders ───────────── */

export async function sendRemindersNow() {
  const r = await run("reminders.run", async (actor) => {
    const t = await runReminders();
    await audit(db, { actorId: actor.id, action: "sms.reminders_run", entity: "sms", detail: t });
    if (t.planned === 0) return "Nothing due for a reminder today.";
    return `Reminders: ${t.sent} sent, ${t.duplicate} already sent earlier${t.failed ? `, ${t.failed} failed (will retry)` : ""}.`;
  });
  revalidatePath("/console/sms");
  return r;
}

/* ───────────── Messages ───────────── */

export async function setMessageStatus(id: string, status: "open" | "closed") {
  const r = await run("message.manage", async (actor) => {
    await db.update(schema.messages).set({ status }).where(eq(schema.messages.id, id));
    await audit(db, { actorId: actor.id, action: `message.${status}`, entity: "message", entityId: id });
  });
  revalidatePath("/console/messages");
  return r;
}

/* ───────────── Team ───────────── */

export async function createStaff(_: ActionResult, fd: FormData) {
  const r = await run("staff.manage", async (actor) => {
    const data = z
      .object({
        name: z.string().trim().min(2, "Enter a name"),
        email: z.email("Enter a valid email").transform((v) => v.toLowerCase()),
        role: z.enum(["admin", "manager", "officer", "finance"]),
        password: z.string().min(PASSWORD_MIN, `At least ${PASSWORD_MIN} characters`),
      })
      .parse(form(fd));
    const exists = await db.query.staff.findFirst({ where: eq(schema.staff.email, data.email), columns: { id: true } });
    if (exists) throw new ActionError("Someone with this email already has an account.");
    const [row] = await db
      .insert(schema.staff)
      .values({ name: data.name, email: data.email, role: data.role, passwordHash: await hashPassword(data.password) })
      .returning({ id: schema.staff.id });
    await audit(db, { actorId: actor.id, action: "staff.created", entity: "staff", entityId: row.id, detail: { email: data.email, role: data.role } });
    return `${data.name} can now sign in. Share the temporary password securely and ask them to change it.`;
  });
  revalidatePath("/console/team");
  return r;
}

export async function updateStaff(id: string, _: ActionResult, fd: FormData) {
  const r = await run("staff.manage", async (actor) => {
    const data = z
      .object({ role: z.enum(["admin", "manager", "officer", "finance"]), active: z.enum(["true", "false"]).transform((v) => v === "true") })
      .parse(form(fd));
    if (id === actor.id && (!data.active || data.role !== "admin")) {
      throw new ActionError("You can’t remove your own admin access. Ask another administrator.");
    }
    await db.update(schema.staff).set(data).where(eq(schema.staff.id, id));
    if (!data.active) await db.delete(schema.sessions).where(eq(schema.sessions.staffId, id));
    await audit(db, { actorId: actor.id, action: "staff.updated", entity: "staff", entityId: id, detail: data });
    return "Team member updated.";
  });
  revalidatePath("/console/team");
  return r;
}

export async function changePassword(_: ActionResult, fd: FormData) {
  const staff = await getStaff();
  if (!staff) return { ok: false, message: "Your session has expired." };
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  if (!(await verifyPassword(current, staff.passwordHash))) return { ok: false, errors: { current: ["Current password is incorrect"] } };
  if (next.length < PASSWORD_MIN) return { ok: false, errors: { next: [`At least ${PASSWORD_MIN} characters`] } };
  await db.update(schema.staff).set({ passwordHash: await hashPassword(next) }).where(eq(schema.staff.id, staff.id));
  // Sign out other devices.
  const sessions = await db.select({ id: schema.sessions.id }).from(schema.sessions).where(eq(schema.sessions.staffId, staff.id));
  const keep = await currentSessionId();
  const others = sessions.map((s) => s.id).filter((s) => s !== keep);
  if (others.length) await db.delete(schema.sessions).where(and(eq(schema.sessions.staffId, staff.id), inArray(schema.sessions.id, others)));
  await audit(db, { actorId: staff.id, action: "staff.password_changed", entity: "staff", entityId: staff.id });
  return { ok: true, message: "Password updated. Other devices have been signed out." };
}
