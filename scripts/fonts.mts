/**
 * Downloads Switzer and Cabinet Grotesk from Fontshare into src/app/fonts.
 *
 * The ITF Free Font License allows self-hosting on our own site but forbids publishing the font files
 * in a repository, so they are gitignored and fetched from the official source before dev/build.
 * Files are extracted byte-for-byte (the licence forbids modifying them).
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../src/app/fonts");
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

mkdirSync(dir, { recursive: true });
for (const [family, files] of Object.entries(wanted)) {
  if (files.every((f) => existsSync(join(dir, f)))) continue;
  const res = await fetch(`https://api.fontshare.com/v2/fonts/download/${family}`);
  if (!res.ok) throw new Error(`Fontshare download for ${family} failed: HTTP ${res.status}`);
  const found = extract(Buffer.from(await res.arrayBuffer()), files);
  for (const f of files) {
    const data = found.get(f);
    if (!data) throw new Error(`${f} not found in the Fontshare ${family} package`);
    writeFileSync(join(dir, f), data);
  }
  console.log(`fonts: fetched ${files.join(", ")} from Fontshare`);
}
