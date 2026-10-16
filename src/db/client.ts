import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

/**
 * Postgres everywhere:
 * - DATABASE_URL set (production, e.g. Neon via the Vercel Marketplace) → postgres.js
 * - otherwise (local development) → embedded PGlite stored in ./.data/pglite
 * Both expose the same Drizzle query API, so one type covers both.
 */
export function createDb(): { db: DB; driver: "postgres" | "pglite"; close: () => Promise<void> } {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { max: 5, prepare: false });
    return { db: drizzlePostgres(client, { schema }), driver: "postgres", close: () => client.end() };
  }
  if (process.env.VERCEL) {
    // Serverless functions have no writable disk for the embedded database.
    throw new Error("DATABASE_URL is not set. Connect a Postgres database (Vercel → Storage → Neon) to this project, then redeploy.");
  }
  const dir = process.env.PGLITE_DIR ?? ".data/pglite";
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  return { db: drizzlePglite(client, { schema }) as unknown as DB, driver: "pglite", close: () => client.close() };
}
