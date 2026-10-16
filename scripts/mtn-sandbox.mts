/**
 * Provisions an MTN MoMo *sandbox* API user + key for the Collections product and writes them to .env.local.
 *   MTN_MOMO_SUBSCRIPTION_KEY=<Collections primary key from momodeveloper.mtn.com> npm run momo:mtn-sandbox
 * Optional: CALLBACK_HOST=your-domain.example (defaults to nanam.ug). Secrets are written, never printed.
 * Docs: https://momodeveloper.mtn.com/api-documentation/api-description
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const BASE = "https://sandbox.momodeveloper.mtn.com";
const subKey = process.env.MTN_MOMO_SUBSCRIPTION_KEY ?? process.argv[2];
if (!subKey) {
  console.error("✗ Set MTN_MOMO_SUBSCRIPTION_KEY to your Collections subscription key (momodeveloper.mtn.com → Profile → Subscriptions).");
  process.exit(1);
}
const host = process.env.CALLBACK_HOST ?? "nanam.ug";
const user = randomUUID();

const created = await fetch(`${BASE}/v1_0/apiuser`, {
  method: "POST",
  headers: { "X-Reference-Id": user, "Ocp-Apim-Subscription-Key": subKey, "Content-Type": "application/json" },
  body: JSON.stringify({ providerCallbackHost: host }),
});
if (created.status !== 201) {
  console.error(`✗ Creating the API user failed (${created.status}): ${(await created.text()).slice(0, 300)}`);
  process.exit(1);
}
const keyRes = await fetch(`${BASE}/v1_0/apiuser/${user}/apikey`, { method: "POST", headers: { "Ocp-Apim-Subscription-Key": subKey } });
const body = (await keyRes.json().catch(() => ({}))) as { apiKey?: string };
if (keyRes.status !== 201 || !body.apiKey) {
  console.error(`✗ Creating the API key failed (${keyRes.status}).`);
  process.exit(1);
}

const values: Record<string, string> = {
  MTN_MOMO_BASE_URL: BASE,
  MTN_MOMO_TARGET_ENV: "sandbox",
  MTN_MOMO_CURRENCY: "EUR",
  MTN_MOMO_SUBSCRIPTION_KEY: subKey,
  MTN_MOMO_API_USER: user,
  MTN_MOMO_API_KEY: body.apiKey,
};
const file = ".env.local";
let env = existsSync(file) ? readFileSync(file, "utf8") : "";
for (const [k, v] of Object.entries(values)) {
  const line = `${k}=${v}`;
  const re = new RegExp(`^${k}=.*$`, "m");
  env = re.test(env) ? env.replace(re, line) : `${env.replace(/\n?$/, "\n")}${line}\n`;
}
writeFileSync(file, env.replace(/^\n/, ""), { mode: 0o600 });
console.log(`✓ MTN sandbox API user created (callback host ${host}). Credentials written to ${file}. Restart the dev server.`);
