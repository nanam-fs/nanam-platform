/**
 * Local only: issues fresh passwords for the seeded staff accounts (*@nanam.test)
 * and rewrites the credentials file. Use if the file was lost or out of sync.
 */
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { eq, like } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { assertNoServerRunning, credentialsPath } from "../src/db/local-lock";
import * as s from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

if (process.env.DATABASE_URL) {
  console.error("✗ Refusing to reset passwords on a DATABASE_URL database. Use the console's Team page.");
  process.exit(1);
}
assertNoServerRunning();
const { db, close } = createDb();
const seeded = await db.select().from(s.staff).where(like(s.staff.email, "%@nanam.test"));
const lines = ["# NANAM console — local seed accounts (do not commit)"];
for (const u of seeded) {
  const password = randomBytes(9).toString("base64url");
  await db.update(s.staff).set({ passwordHash: await hashPassword(password) }).where(eq(s.staff.id, u.id));
  await db.delete(s.sessions).where(eq(s.sessions.staffId, u.id));
  lines.push(`${u.role.padEnd(8)} ${u.email}  ${password}`);
}
const file = credentialsPath();
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, lines.join("\n") + "\n", { mode: 0o600 });
console.log(`✓ ${seeded.length} staff passwords reset — see ${file}`);
await close();
