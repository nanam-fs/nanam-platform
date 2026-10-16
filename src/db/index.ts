import "server-only";
import { createDb, type DB } from "./client";
import * as schema from "./schema";

const g = globalThis as unknown as { __nanamDb?: DB; __nanamDbClose?: () => Promise<void> };

// Reuse one connection across hot reloads and concurrent requests.
if (!g.__nanamDb) {
  const created = createDb();
  g.__nanamDb = created.db;
  g.__nanamDbClose = created.close;
}
export const db: DB = g.__nanamDb;
/** Flushes and closes the connection. The embedded local database must be closed before the process exits, or its files can be left corrupt. */
export const closeDb = () => g.__nanamDbClose?.() ?? Promise.resolve();
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema };
