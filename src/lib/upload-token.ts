import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { testMode } from "./test-mode";

/**
 * Short-lived capability that lets an applicant attach documents to the application they just
 * submitted, without an account. Signed with UPLOAD_TOKEN_SECRET; bound to one application.
 */
const TTL_MS = 24 * 3600_000;

function secret() {
  const s = process.env.UPLOAD_TOKEN_SECRET;
  if (s && s.length >= 32) return s;
  return testMode() ? "local-test-mode-upload-secret-not-for-production" : null;
}

const sign = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

export function issueUploadToken(applicationId: string) {
  const key = secret();
  if (!key) return null;
  const payload = `${applicationId}.${Date.now() + TTL_MS}`;
  return `${payload}.${sign(payload, key)}`;
}

export function verifyUploadToken(token: string, applicationId: string) {
  const key = secret();
  if (!key) return false;
  const [id, exp, sig] = token.split(".");
  if (!id || !exp || !sig || id !== applicationId || Number(exp) < Date.now()) return false;
  const expected = Buffer.from(sign(`${id}.${exp}`, key));
  const actual = Buffer.from(sig);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
