"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCustomer, requestOtp, signOutCustomer, verifyOtp } from "@/lib/customer-auth";
import { initiatePayment, PaymentError, syncPayment } from "@/lib/payments";
import { testMode } from "@/lib/test-mode";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";

export type LoginState = { step: "phone" | "code"; phone?: string; message?: string; error?: string };

export async function loginStep(prev: LoginState, fd: FormData): Promise<LoginState> {
  const intent = String(fd.get("intent") ?? "send");
  if (intent === "change") return { step: "phone" };

  if (intent === "verify") {
    const phone = String(fd.get("phone") ?? "");
    const result = await verifyOtp(phone, String(fd.get("code") ?? ""));
    if (!result.ok) return { step: "code", phone, error: result.message };
    redirect("/portal");
  }

  try {
    const r = await requestOtp(String(fd.get("phone") ?? prev.phone ?? ""));
    if (!r.ok) return { step: prev.step, phone: prev.phone, error: r.message };
    return { step: "code", phone: r.phone, message: `If ${r.phone} is registered with NANAM, we’ve sent it a 6-digit code.` };
  } catch (err) {
    console.error("[portal] could not send code", err);
    const detail = testMode() && err instanceof Error ? ` (${err.message})` : "";
    return { step: "phone", error: `We couldn’t send a code right now. Please try again shortly.${detail}` };
  }
}

export async function portalSignOut() {
  await signOutCustomer();
  redirect("/portal/login");
}

export type PayState = { requestId?: string; error?: string };

export async function startPayment(loanId: string, _: PayState, fd: FormData): Promise<PayState> {
  const customer = await getCustomer();
  if (!customer) return { error: "Your session has expired. Please sign in again." };
  const parsed = z
    .object({
      purpose: z.enum(["instalment", "arrears", "settlement", "custom"]),
      amount: z.coerce.number().optional(),
      payer: z.string().min(9, "Enter the Mobile Money number to charge"),
      network: z.enum(["mtn", "airtel"], "Choose MTN or Airtel"),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    const requestId = await initiatePayment({
      loanId,
      customerPhone: customer.phone,
      payerMsisdn: parsed.data.payer,
      network: parsed.data.network,
      purpose: parsed.data.purpose,
      amount: parsed.data.amount,
    });
    return { requestId };
  } catch (err) {
    if (err instanceof PaymentError) return { error: err.message };
    console.error("[portal] payment failed to start", err);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function checkPayment(requestId: string) {
  const customer = await getCustomer();
  if (!customer) return { status: "unauthorised" as const };
  const own = await db.query.paymentRequests.findFirst({
    where: and(eq(schema.paymentRequests.id, requestId), eq(schema.paymentRequests.customerPhone, customer.phone)),
    columns: { id: true },
  });
  if (!own) return { status: "unauthorised" as const };
  const r = await syncPayment(requestId);
  if (!r) return { status: "unauthorised" as const };
  return { status: r.status, amount: r.amount, reference: r.providerTxnId ?? r.providerRef, reason: r.failureReason, excess: r.excess };
}
