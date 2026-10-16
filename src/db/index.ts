import "server-only";
import { createDb, type DB } from "./client";
import * as schema from "./schema";

const g = globalThis as unknown as { __nanamDb?: DB };

// Reuse one connection across hot reloads and concurrent requests.
export const db: DB = (g.__nanamDb ??= createDb().db);
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export { schema };
