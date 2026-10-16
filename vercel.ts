import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  // Daily schedules fit Vercel's Hobby plan (one run per day per job). On Pro, tighten the two sweeps
  // to "*/15 * * * *" (payments) and "*/10 * * * *" (identity checks); they are safety nets behind provider callbacks.
  crons: [
    // Re-checks unresolved Mobile Money payments in case a provider callback was missed.
    // Vercel sends `Authorization: Bearer $CRON_SECRET`; set CRON_SECRET in project env.
    { path: "/api/payments/sweep", schedule: "0 5 * * *" },
    // Payment reminders at 09:00 Kampala time (06:00 UTC).
    { path: "/api/reminders/run", schedule: "0 6 * * *" },
    // Identity checks whose webhook was missed.
    { path: "/api/kyc/sweep", schedule: "30 5 * * *" },
  ],
};
