import { rmSync } from "node:fs";
import { assertNoServerRunning } from "../src/db/local-lock";

assertNoServerRunning();
rmSync(process.env.PGLITE_DIR ?? ".data/pglite", { recursive: true, force: true });
console.log("✓ local database removed");
