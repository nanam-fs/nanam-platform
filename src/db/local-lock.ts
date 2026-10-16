import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

// The local PGlite database is a single-process store. A running app server records its pid here
// so the db:* scripts can refuse to touch the files underneath it.
const dir = () => process.env.PGLITE_DIR ?? ".data/pglite";
const lockPath = () => (process.env.PGLITE_DIR ? `${dir()}.server.pid` : ".data/server.pid");

function alive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function claimServerLock() {
  const LOCK = lockPath();
  mkdirSync(dirname(LOCK), { recursive: true });
  writeFileSync(LOCK, String(process.pid));
  const release = () => {
    try {
      if (readFileSync(LOCK, "utf8") === String(process.pid)) rmSync(LOCK);
    } catch {}
  };
  process.once("exit", release);
  for (const sig of ["SIGINT", "SIGTERM"] as const) process.once(sig, () => (release(), process.exit(0)));
}

export function assertNoServerRunning() {
  const LOCK = lockPath();
  if (!existsSync(LOCK)) return;
  const pid = Number(readFileSync(LOCK, "utf8"));
  if (pid && pid !== process.pid && alive(pid)) {
    console.error(`✗ A NANAM server (pid ${pid}) is using the local database. Stop it (Ctrl+C) first, then run this again.`);
    process.exit(1);
  }
}

/** Where local seed passwords are written: beside the database they belong to. */
export function credentialsPath() {
  if (process.env.DATABASE_URL) return ".data/production-credentials.txt"; // never overwrite the local dev logins
  return process.env.PGLITE_DIR ? `${dir()}.credentials.txt` : ".data/seed-credentials.txt";
}
