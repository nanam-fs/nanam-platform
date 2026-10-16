import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    // Re-checks unresolved Mobile Money payments in case a provider callback was missed.
    // Vercel sends `Authorization: Bearer $CRON_SECRET`; set CRON_SECRET in project env.
    { path: "/api/payments/sweep", schedule: "*/15 * * * *" },
  ],
};
