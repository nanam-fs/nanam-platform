import "server-only";
import { randomUUID } from "node:crypto";
import { detectNetwork, type Network } from "./phone";
import { testMode } from "./test-mode";

export { detectNetwork, type Network };

export type ProviderStatus = {
  status: "pending" | "successful" | "failed";
  transactionId?: string;
  reason?: string;
  /** Provider's raw response, for the payments lab and troubleshooting. Never shown to customers. */
  raw?: unknown;
};

export interface MomoProvider {
  name: string;
  /** "live" | "sandbox" | "simulator" */
  mode: "live" | "sandbox" | "simulator";
  /** Prompts the payer's phone. Returns our provider reference used for status checks. */
  requestPayment(p: { amount: number; msisdn: string; externalId: string; note: string }): Promise<{ providerRef: string; raw?: unknown }>;
  getStatus(r: { providerRef: string; createdAt: Date; payerMsisdn: string }): Promise<ProviderStatus>;
  /** Checks credentials by fetching a fresh access token. */
  ping(): Promise<{ ok: boolean; detail: string }>;
}

/**
 * Normalises a payer number. Ugandan numbers become 2567XXXXXXXX; other international numbers
 * (such as MTN's sandbox test MSISDNs 46733123450…) pass through as digits.
 */
export function toMsisdn(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (/^(256|0)?7\d{8}$/.test(d)) return `256${d.slice(-9)}`;
  return d;
}

const tokens = new Map<string, { token: string; until: number }>();
async function cachedToken(key: string, fetcher: () => Promise<{ token: string; ttl: number }>) {
  const hit = tokens.get(key);
  if (hit && hit.until > Date.now()) return hit.token;
  const { token, ttl } = await fetcher();
  tokens.set(key, { token, until: Date.now() + Math.max(60, ttl - 60) * 1000 });
  return token;
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text.slice(0, 500);
  }
}

/* ───────────── MTN MoMo Collections (request to pay) ─────────────
 * momodeveloper.mtn.com: sandbox https://sandbox.momodeveloper.mtn.com (target env "sandbox", currency EUR);
 * production https://proxy.momoapi.mtn.com (target env "mtnuganda", currency UGX).
 */
function mtn(): MomoProvider | null {
  const subKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY;
  const user = process.env.MTN_MOMO_API_USER;
  const key = process.env.MTN_MOMO_API_KEY;
  if (!subKey || !user || !key) return null;
  const env = process.env.MTN_MOMO_TARGET_ENV ?? "sandbox";
  const sandbox = env === "sandbox";
  const base = (process.env.MTN_MOMO_BASE_URL ?? (sandbox ? "https://sandbox.momodeveloper.mtn.com" : "https://proxy.momoapi.mtn.com")).replace(/\/$/, "");
  const currency = process.env.MTN_MOMO_CURRENCY ?? (sandbox ? "EUR" : "UGX");
  const cacheKey = `mtn:${base}:${user}`;

  const token = () =>
    cachedToken(cacheKey, async () => {
      const res = await fetch(`${base}/collection/token/`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${user}:${key}`).toString("base64")}`, "Ocp-Apim-Subscription-Key": subKey },
      });
      const j = (await readJson(res)) as { access_token?: string; expires_in?: number; error?: string } | null;
      if (!res.ok || !j?.access_token) throw new Error(`MTN token request failed (${res.status}${j?.error ? `: ${j.error}` : ""})`);
      return { token: j.access_token, ttl: Number(j.expires_in ?? 3600) };
    });

  const headers = async () => ({ Authorization: `Bearer ${await token()}`, "X-Target-Environment": env, "Ocp-Apim-Subscription-Key": subKey });

  return {
    name: "mtn",
    mode: sandbox ? "sandbox" : "live",
    async requestPayment({ amount, msisdn, externalId, note }) {
      const ref = randomUUID();
      // The callback must be HTTPS on the providerCallbackHost. MTN sends it once with no retry, so we also poll.
      const callback = process.env.PUBLIC_BASE_URL?.startsWith("https://") ? `${process.env.PUBLIC_BASE_URL}/api/payments/mtn/callback` : undefined;
      const res = await fetch(`${base}/collection/v1_0/requesttopay`, {
        method: "POST",
        headers: { ...(await headers()), "X-Reference-Id": ref, "Content-Type": "application/json", ...(callback ? { "X-Callback-Url": callback } : {}) },
        body: JSON.stringify({
          amount: String(amount),
          currency,
          externalId,
          payer: { partyIdType: "MSISDN", partyId: toMsisdn(msisdn) },
          payerMessage: note.slice(0, 160),
          payeeNote: note.slice(0, 160),
        }),
      });
      if (res.status !== 202) {
        const j = (await readJson(res)) as { code?: string; message?: string } | null;
        throw new Error(`MTN declined the request (${res.status}${j?.code ? ` ${j.code}` : ""}${j?.message ? `: ${j.message}` : ""})`);
      }
      return { providerRef: ref, raw: { httpStatus: 202, referenceId: ref, currency, targetEnvironment: env } };
    },
    async getStatus({ providerRef }) {
      const res = await fetch(`${base}/collection/v1_0/requesttopay/${providerRef}`, { headers: await headers() });
      const j = (await readJson(res)) as { status?: string; financialTransactionId?: string; reason?: string | { code?: string; message?: string } } | null;
      if (!res.ok) return { status: "pending", raw: { httpStatus: res.status, body: j } };
      const reason = typeof j?.reason === "string" ? j.reason : [j?.reason?.code, j?.reason?.message].filter(Boolean).join(": ") || undefined;
      if (j?.status === "SUCCESSFUL") return { status: "successful", transactionId: j.financialTransactionId, raw: j };
      if (j?.status === "FAILED") return { status: "failed", reason: reason ?? "Payment failed", raw: j };
      return { status: "pending", raw: j };
    },
    async ping() {
      try {
        tokens.delete(cacheKey);
        await token();
        return { ok: true, detail: `Token issued · ${base} · ${env} · ${currency}` };
      } catch (e) {
        return { ok: false, detail: e instanceof Error ? e.message : "Token request failed" };
      }
    },
  };
}

/* ───────────── Airtel Money Collections (USSD push) ─────────────
 * Uganda hosts: staging https://openapiuat.airtel.ug, production https://openapi.airtel.ug
 * (openapi[uat].airtel.africa are being retired). Subscriber msisdn is sent without the country code.
 */
function airtel(): MomoProvider | null {
  const id = process.env.AIRTEL_CLIENT_ID;
  const secret = process.env.AIRTEL_CLIENT_SECRET;
  if (!id || !secret) return null;
  const env = process.env.AIRTEL_ENV ?? "staging";
  const base = (process.env.AIRTEL_BASE_URL ?? (env === "production" ? "https://openapi.airtel.ug" : "https://openapiuat.airtel.ug")).replace(/\/$/, "");
  const payPath = process.env.AIRTEL_PAYMENTS_PATH ?? "/merchant/v1/payments/";
  const cacheKey = `airtel:${base}:${id}`;

  const token = () =>
    cachedToken(cacheKey, async () => {
      const res = await fetch(`${base}/auth/oauth2/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "*/*" },
        body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: "client_credentials" }),
      });
      const j = (await readJson(res)) as { access_token?: string; expires_in?: number | string; error_description?: string } | null;
      if (!res.ok || !j?.access_token) throw new Error(`Airtel token request failed (${res.status}${j?.error_description ? `: ${j.error_description}` : ""})`);
      return { token: j.access_token, ttl: Number(j.expires_in ?? 7200) };
    });

  const headers = async () => ({ Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", Accept: "*/*", "X-Country": "UG", "X-Currency": "UGX" });

  return {
    name: "airtel",
    mode: env === "production" ? "live" : "sandbox",
    async requestPayment({ amount, msisdn, externalId, note }) {
      const ref = `NF${externalId.replace(/-/g, "").slice(0, 20).toUpperCase()}`;
      const res = await fetch(`${base}${payPath}`, {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({
          reference: note.slice(0, 30),
          subscriber: { country: "UG", currency: "UGX", msisdn: msisdn.replace(/\D/g, "").slice(-9) },
          transaction: { amount, country: "UG", currency: "UGX", id: ref },
        }),
      });
      const j = (await readJson(res)) as { status?: { success?: boolean; message?: string; response_code?: string } } | null;
      if (!res.ok || j?.status?.success === false) {
        throw new Error(`Airtel declined the request (${res.status}${j?.status?.response_code ? ` ${j.status.response_code}` : ""}${j?.status?.message ? `: ${j.status.message}` : ""})`);
      }
      return { providerRef: ref, raw: j };
    },
    async getStatus({ providerRef }) {
      const res = await fetch(`${base}/standard/v1/payments/${providerRef}`, { headers: await headers() });
      const j = (await readJson(res)) as { data?: { transaction?: { status?: string; airtel_money_id?: string; message?: string } } } | null;
      if (!res.ok) return { status: "pending", raw: { httpStatus: res.status, body: j } };
      const t = j?.data?.transaction;
      // TS success, TF failed; TA (ambiguous) and TIP (in progress) stay pending until resolved.
      if (t?.status === "TS") return { status: "successful", transactionId: t.airtel_money_id, raw: j };
      if (t?.status === "TF") return { status: "failed", reason: t.message ?? "Payment failed", raw: j };
      return { status: "pending", raw: j };
    },
    async ping() {
      try {
        tokens.delete(cacheKey);
        await token();
        return { ok: true, detail: `Token issued · ${base} · ${env}` };
      } catch (e) {
        return { ok: false, detail: e instanceof Error ? e.message : "Token request failed" };
      }
    },
  };
}

/* ───────────── Test-mode simulator ───────────── */

/**
 * Stand-in for a network with no credentials (test mode only). Approves ~6 s after the request;
 * payer numbers ending 000 decline, ending 111 stay pending.
 */
function simulator(network: Network): MomoProvider {
  return {
    name: `${network}-test`,
    mode: "simulator",
    async requestPayment() {
      const ref = `TEST-${network.toUpperCase()}-${randomUUID()}`;
      return { providerRef: ref, raw: { simulated: true, referenceId: ref } };
    },
    async getStatus({ createdAt, payerMsisdn, providerRef }) {
      if (Date.now() - createdAt.getTime() < 6000 || payerMsisdn.endsWith("111")) return { status: "pending", raw: { simulated: true, status: "PENDING" } };
      if (payerMsisdn.endsWith("000")) return { status: "failed", reason: "Payer declined the prompt (simulator)", raw: { simulated: true, status: "FAILED" } };
      const transactionId = `T${providerRef.slice(-12).toUpperCase()}`;
      return { status: "successful", transactionId, raw: { simulated: true, status: "SUCCESSFUL", financialTransactionId: transactionId } };
    },
    async ping() {
      return { ok: true, detail: "Simulator: no credentials configured for this network" };
    },
  };
}

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

/** True when payments on this network don't move real money (simulator or provider sandbox). */
export const isTestMode = (network: Network) => {
  const p = providerFor(network);
  return !!p && p.mode !== "live";
};

/** MTN sandbox scenario numbers (momodeveloper.mtn.com/api-documentation/testing). Any other number succeeds. */
export const mtnSandboxNumbers = [
  { msisdn: "46733123450", outcome: "Failed" },
  { msisdn: "46733123451", outcome: "Rejected" },
  { msisdn: "46733123452", outcome: "Expired" },
  { msisdn: "46733123453", outcome: "Ongoing (stays pending)" },
  { msisdn: "46733123454", outcome: "Delayed" },
  { msisdn: "46733123455", outcome: "Payer not found" },
  { msisdn: "46733123460", outcome: "Invalid currency" },
  { msisdn: "46733123462", outcome: "Service unavailable" },
] as const;
