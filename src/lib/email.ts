import "server-only";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { scratchPath, testMode } from "./test-mode";

/**
 * Transactional email via Resend's REST API when RESEND_API_KEY is set.
 * In test mode without a key, emails are appended to .data/email-outbox.log.
 */
export async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "NANAM <no-reply@nanam.ug>", to: [to], subject, text }),
    });
    if (!res.ok) throw new Error(`Email provider returned ${res.status}`);
    return { channel: "resend" as const };
  }
  if (!testMode()) throw new Error("Email is not configured (set RESEND_API_KEY and EMAIL_FROM).");
  const outbox = process.env.EMAIL_OUTBOX ?? scratchPath("email-outbox.log");
  mkdirSync(/*turbopackIgnore: true*/ dirname(outbox), { recursive: true });
  appendFileSync(/*turbopackIgnore: true*/ outbox, `--- ${new Date().toISOString()}\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
  return { channel: "dev-outbox" as const };
}

export const emailConfigured = () => !!process.env.RESEND_API_KEY;
