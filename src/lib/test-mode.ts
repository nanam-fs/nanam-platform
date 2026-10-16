import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Demo mode (NANAM_DEMO=1) is an explicit switch for a pre-launch demonstration deployment: sample data,
 * on-screen SMS codes, simulated Mobile Money and identity checks, and a banner on every page.
 * Remove the variable (and reset the database) before serving real customers.
 */
export const demoMode = () => process.env.NANAM_DEMO === "1";

/**
 * Test mode lets SMS codes go to a local outbox file and Mobile Money use a simulator.
 * On by default in development; opt-in elsewhere with NANAM_TEST_MODE=1;
 * never on a live Vercel production deployment unless demo mode is switched on explicitly.
 */
export function testMode() {
  if (demoMode()) return true;
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.NODE_ENV !== "production" || process.env.NANAM_TEST_MODE === "1";
}

/** Where test-mode outboxes and uploads live: ./.data locally, the function's temp folder on Vercel (read-only disk). */
export const scratchPath = (...parts: string[]) => (process.env.VERCEL ? join(tmpdir(), "nanam", ...parts) : join(".data", ...parts));
