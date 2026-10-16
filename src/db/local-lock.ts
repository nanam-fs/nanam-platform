import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

// The local PGlite database is a single-process store. A running app server records its pid here
// so the db:* scripts can refuse to touch the files underneath it.
const LOCK = ".data/server.pid";

function alive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function claimServerLock() {
  mkdirSync(".data", { recursive: true });
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
  if (!existsSync(LOCK)) return;
  const pid = Number(readFileSync(LOCK, "utf8"));
  if (pid && pid !== process.pid && alive(pid)) {
    console.error(`✗ A NANAM server (pid ${pid}) is using the local database. Stop it (Ctrl+C) first, then run this again.`);
    process.exit(1);
  }
}
