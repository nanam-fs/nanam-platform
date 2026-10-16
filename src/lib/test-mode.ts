/**
 * Test mode lets SMS codes go to a local outbox file and Mobile Money use a simulator.
 * On by default in development; opt-in elsewhere with NANAM_TEST_MODE=1;
 * never on a live Vercel production deployment, whatever the flags say.
 */
export function testMode() {
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.NODE_ENV !== "production" || process.env.NANAM_TEST_MODE === "1";
}
