import "server-only";
import { randomUUID } from "node:crypto";
import { detectNetwork, type Network } from "./phone";
import { testMode } from "./test-mode";

export { detectNetwork, type Network };
export type ProviderStatus = { status: "pending" | "successful" | "failed"; transactionId?: string; reason?: string };

export interface MomoProvider {
  name: string;
  /** Prompts the payer's phone. Returns our provider reference used for status checks. */
  requestPayment(p: { amount: number; msisdn: string; externalId: string; note: string }): Promise<{ providerRef: string }>;
  getStatus(r: { providerRef: string; createdAt: Date; payerMsisdn: string }): Promise<ProviderStatus>;
}

/* ───────────── Token cache ───────────── */

const tokens = new Map<string, { token: string; until: number }>();
async function cachedToken(key: string, fetcher: () => Promise<{ token: string; ttl: number }>) {
  const hit = tokens.get(key);
  if (hit && hit.until > Date.now()) return hit.token;
  const { token, ttl } = await fetcher();
  tokens.set(key, { token, until: Date.now() + (ttl - 60) * 1000 });
  return token;
}

/* ───────────── MTN MoMo Collections (request to pay) ───────────── */

function mtn(): MomoProvider | null {
  const base = process.env.MTN_MOMO_BASE_URL;
  const subKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const user = process.env.MTN_MOMO_API_USER;
  const key = process.env.MTN_MOMO_API_KEY;
  if (!base || !subKey || !user || !key) return null;
  const env = process.env.MTN_MOMO_TARGET_ENV ?? "sandbox";
  const currency = process.env.MTN_MOMO_CURRENCY ?? (env === "sandbox" ? "EUR" : "UGX");

  const token = () =>
    cachedToken("mtn", async () => {
      const res = await fetch(`${base}/collection/token/`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${user}:${key}`).toString("base64")}`, "Ocp-Apim-Subscription-Key": subKey },
      });
      if (!res.ok) throw new Error(`MTN token failed (${res.status})`);
      const j = (await res.json()) as { access_token: string; expires_in: number };
      return { token: j.access_token, ttl: j.expires_in };
    });

  const headers = async () => ({
    Authorization: `Bearer ${await token()}`,
    "X-Target-Environment": env,
    "Ocp-Apim-Subscription-Key": subKey,
  });

  return {
    name: "mtn",
    async requestPayment({ amount, msisdn, externalId, note }) {
      const ref = randomUUID();
      const callback = process.env.PUBLIC_BASE_URL?.startsWith("https://") ? `${process.env.PUBLIC_BASE_URL}/api/payments/mtn/callback` : undefined;
      const res = await fetch(`${base}/collection/v1_0/requesttopay`, {
        method: "POST",
        headers: { ...(await headers()), "X-Reference-Id": ref, "Content-Type": "application/json", ...(callback ? { "X-Callback-Url": callback } : {}) },
        body: JSON.stringify({
          amount: String(amount),
          currency,
          externalId,
          payer: { partyIdType: "MSISDN", partyId: `256${msisdn.replace(/\D/g, "").slice(-9)}` },
          payerMessage: note,
          payeeNote: note,
        }),
      });
      if (res.status !== 202) throw new Error(`MTN declined the request (${res.status})`);
      return { providerRef: ref };
    },
    async getStatus({ providerRef }) {
      const res = await fetch(`${base}/collection/v1_0/requesttopay/${providerRef}`, { headers: await headers() });
      if (!res.ok) return { status: "pending" };
      const j = (await res.json()) as { status: string; financialTransactionId?: string; reason?: string | { message?: string } };
      if (j.status === "SUCCESSFUL") return { status: "successful", transactionId: j.financialTransactionId };
      if (j.status === "FAILED") return { status: "failed", reason: typeof j.reason === "string" ? j.reason : j.reason?.message };
      return { status: "pending" };
    },
  };
}

/* ───────────── Airtel Money Collections ───────────── */

function airtel(): MomoProvider | null {
  const base = process.env.AIRTEL_BASE_URL;
  const id = process.env.AIRTEL_CLIENT_ID;
  const secret = process.env.AIRTEL_CLIENT_SECRET;
  if (!base || !id || !secret) return null;

  const token = () =>
    cachedToken("airtel", async () => {
      const res = await fetch(`${base}/auth/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "*/*" },
        body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: "client_credentials" }),
      });
      if (!res.ok) throw new Error(`Airtel token failed (${res.status})`);
      const j = (await res.json()) as { access_token: string; expires_in: number | string };
      return { token: j.access_token, ttl: Number(j.expires_in) };
    });

  const headers = async () => ({
    Authorization: `Bearer ${await token()}`,
    "Content-Type": "application/json",
    Accept: "*/*",
    "X-Country": "UG",
    "X-Currency": "UGX",
  });

  return {
    name: "airtel",
    async requestPayment({ amount, msisdn, externalId, note }) {
      const ref = `NF${externalId.replace(/-/g, "").slice(0, 20).toUpperCase()}`;
      const res = await fetch(`${base}/merchant/v1/payments/`, {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({
          reference: note.slice(0, 30),
          subscriber: { country: "UG", currency: "UGX", msisdn: msisdn.replace(/\D/g, "").slice(-9) },
          transaction: { amount, country: "UG", currency: "UGX", id: ref },
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { status?: { success?: boolean; message?: string } };
      if (!res.ok || j.status?.success === false) throw new Error(`Airtel declined the request${j.status?.message ? `: ${j.status.message}` : ""}`);
      return { providerRef: ref };
    },
    async getStatus({ providerRef }) {
      const res = await fetch(`${base}/standard/v1/payments/${providerRef}`, { headers: await headers() });
      if (!res.ok) return { status: "pending" };
      const j = (await res.json()) as { data?: { transaction?: { status?: string; airtel_money_id?: string; message?: string } } };
      const t = j.data?.transaction;
      if (t?.status === "TS") return { status: "successful", transactionId: t.airtel_money_id };
      if (t?.status === "TF") return { status: "failed", reason: t.message };
      return { status: "pending" };
    },
  };
}

/* ───────────── Development simulator ───────────── */

/**
 * Test-mode stand-in for the phone prompt: approves ~6 seconds after the request,
 * or declines when the payer number ends in 000 (to exercise the failure path).
 */
function simulator(network: Network): MomoProvider {
  return {
    name: `${network}-test`,
    async requestPayment() {
      return { providerRef: `TEST-${network.toUpperCase()}-${randomUUID()}` };
    },
    async getStatus({ createdAt, payerMsisdn, providerRef }) {
      if (Date.now() - createdAt.getTime() < 6000) return { status: "pending" };
      if (payerMsisdn.endsWith("000")) return { status: "failed", reason: "Payer declined the prompt (test mode)" };
      return { status: "successful", transactionId: `T${providerRef.slice(-12).toUpperCase()}` };
    },
  };
}

/** The provider for a network, or null if Mobile Money for that network isn't available here. */
export function providerFor(network: Network): MomoProvider | null {
  const real = network === "mtn" ? mtn() : airtel();
  if (real) return real;
  return testMode() ? simulator(network) : null;
}

export function providerByName(name: string): MomoProvider | null {
  if (name === "mtn" || name === "airtel") return providerFor(name);
  if (name === "mtn-test" || name === "airtel-test") return testMode() ? simulator(name.split("-")[0] as Network) : null;
  return null;
}

export const isTestMode = (network: Network) => providerFor(network)?.name.endsWith("-test") ?? false;
