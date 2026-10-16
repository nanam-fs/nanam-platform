import "server-only";
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { get, put } from "@vercel/blob";
import { scratchPath, testMode } from "./test-mode";

/**
 * Private file storage. Vercel Blob (private store) when connected; a local folder in test mode.
 * Files are never publicly addressable: every read goes through an authorised route.
 */
const blobConfigured = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
// Local storage is test-mode only; the ignore hints keep the bundler from tracing the whole project.
const localRoot = () => resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR ?? scratchPath("uploads"));

function localPath(key: string) {
  const p = resolve(/*turbopackIgnore: true*/ join(localRoot(), key));
  if (!p.startsWith(localRoot() + "/")) throw new Error("Invalid storage key");
  return p;
}

export function storageAvailable() {
  return blobConfigured() || testMode();
}

export async function putFile(key: string, bytes: Uint8Array, contentType: string) {
  if (blobConfigured()) {
    await put(key, Buffer.from(bytes), { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false });
    return;
  }
  if (!testMode()) throw new Error("File storage is not configured (connect a private Vercel Blob store).");
  const p = localPath(key);
  mkdirSync(/*turbopackIgnore: true*/ dirname(p), { recursive: true });
  writeFileSync(/*turbopackIgnore: true*/ p, bytes, { flag: "wx" });
}

export async function getFile(key: string): Promise<ReadableStream<Uint8Array> | null> {
  if (blobConfigured()) {
    const r = await get(key, { access: "private" });
    return r && r.statusCode === 200 ? r.stream : null;
  }
  if (!testMode()) return null;
  const p = localPath(key);
  if (!existsSync(/*turbopackIgnore: true*/ p)) return null;
  return Readable.toWeb(createReadStream(/*turbopackIgnore: true*/ p)) as ReadableStream<Uint8Array>;
}
