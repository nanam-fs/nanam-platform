import "server-only";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { scratchPath, testMode } from "./test-mode";

/**
 * Sends an SMS through Africa's Talking when AT_USERNAME and AT_API_KEY are set.
 * In test mode without credentials, messages go to .data/sms-outbox.log instead.
 * Otherwise, missing credentials fail loudly rather than silently dropping codes.
 */
export async function sendSms(to: string, message: string) {
  const username = process.env.AT_USERNAME;
  const apiKey = process.env.AT_API_KEY;

  if (username && apiKey) {
    const base = username === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
    const body = new URLSearchParams({ username, to, message });
    if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);
    const res = await fetch(`${base}/version1/messaging`, {
      method: "POST",
      headers: { apiKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error(`SMS provider returned ${res.status}`);
    const json = (await res.json()) as { SMSMessageData?: { Recipients?: { status: string }[] } };
    const status = json.SMSMessageData?.Recipients?.[0]?.status;
    if (status && status !== "Success") throw new Error(`SMS not sent: ${status}`);
    return { channel: "africastalking" as const };
  }

  if (!testMode()) throw new Error("SMS is not configured (set AT_USERNAME and AT_API_KEY).");

  const outbox = process.env.SMS_OUTBOX ?? scratchPath("sms-outbox.log");
  mkdirSync(dirname(outbox), { recursive: true });
  appendFileSync(outbox, `${new Date().toISOString()}  ${to}  ${message}\n`);
  return { channel: "dev-outbox" as const };
}

export const smsConfigured = () => !!(process.env.AT_USERNAME && process.env.AT_API_KEY);
