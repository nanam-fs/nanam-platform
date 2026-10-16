import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "../src/db/client";

const { db, driver, close } = createDb();
const opts = { migrationsFolder: "drizzle" };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await (driver === "pglite" ? migratePglite(db as any, opts) : migratePostgres(db, opts));
console.log(`✓ migrations applied (${driver})`);
await close();
