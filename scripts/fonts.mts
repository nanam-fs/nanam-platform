/**
 * Downloads Switzer and Cabinet Grotesk from Fontshare into src/app/fonts.
 *
 * The ITF Free Font License allows self-hosting on our own site but forbids publishing the font files
 * in a repository, so they are gitignored and fetched from the official source before dev/build.
 * Files are extracted byte-for-byte (the licence forbids modifying them).
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "src/app/fonts");
// Vercel restores node_modules/.cache between builds, so after the first download no network is needed.
const cache = join(root, "node_modules/.cache/nanam-fonts");
const wanted: Record<string, string[]> = {
  switzer: ["Switzer-Variable.woff2", "Switzer-VariableItalic.woff2"],
  "cabinet-grotesk": ["CabinetGrotesk-Variable.woff2"],
};

/** Minimal zip reader: walks the central directory and returns the named entries. */
function extract(zip: Buffer, names: string[]) {
  const out = new Map<string, Buffer>();
  let eocd = zip.length - 22;
  while (eocd >= 0 && zip.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("not a zip file");
  let p = zip.readUInt32LE(eocd + 16);
  const count = zip.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i++) {
    const method = zip.readUInt16LE(p + 10);
    const size = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.toString("utf8", p + 46, p + 46 + nameLen);
    const base = name.split("/").pop()!;
    // Take the web build (Fonts/WEB/fonts/...), the one Fontshare ships for @font-face.
    if (names.includes(base) && name.includes("/WEB/")) {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const raw = zip.subarray(start, start + size);
      out.set(base, method === 0 ? Buffer.from(raw) : inflateRawSync(raw));
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** Fontshare can be slow to answer from some regions: retry with growing waits before giving up. */
async function download(family: string) {
  const url = `https://api.fontshare.com/v2/fonts/download/${family}`;
  let last: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(45_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      last = err;
      console.warn(`fonts: ${family} download attempt ${attempt} failed (${err instanceof Error ? err.message : err}); retrying`);
      await new Promise((r) => setTimeout(r, attempt * 3000));
    }
  }
  throw new Error(`Could not download ${family} from Fontshare after 5 attempts: ${last instanceof Error ? last.message : last}`);
}

mkdirSync(dir, { recursive: true });
mkdirSync(cache, { recursive: true });
for (const [family, files] of Object.entries(wanted)) {
  if (files.every((f) => existsSync(join(dir, f)))) continue;
  if (files.every((f) => existsSync(join(cache, f)))) {
    for (const f of files) copyFileSync(join(cache, f), join(dir, f));
    console.log(`fonts: ${files.join(", ")} from build cache`);
    continue;
  }
  const found = extract(await download(family), files);
  for (const f of files) {
    const data = found.get(f);
    if (!data) throw new Error(`${f} not found in the Fontshare ${family} package`);
    writeFileSync(join(dir, f), data);
    writeFileSync(join(cache, f), data);
  }
  console.log(`fonts: fetched ${files.join(", ")} from Fontshare`);
}
