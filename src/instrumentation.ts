export async function register() {
  // Local development only: bring the embedded database up to date on start-up.
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DATABASE_URL) return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { claimServerLock } = await import("./db/local-lock");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const { db } = await import("./db");
  claimServerLock();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate(db as any, { migrationsFolder: "drizzle" });
}
