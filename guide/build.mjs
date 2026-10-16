// Renders guide.html → PDF (and page previews) with headless Chrome over CDP.
// Usage: npm run guide -- <base-url>   (writes public/nanam-platform-guide.pdf)
//    or: node guide/build.mjs <base-url> <out.pdf> [previewDir]
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [base = "https://nanam-platform-three.vercel.app", outPdf = join(here, "../public/nanam-platform-guide.pdf"), previewDir] = process.argv.slice(2);
const web = join(here, "..");
const host = base.replace(/^https?:\/\//, "").replace(/\/$/, "");
const html = readFileSync(join(here, "guide.html"), "utf8")
  .replaceAll("{{FONTS}}", `file://${web}/src/app/fonts`)
  .replaceAll("{{BRAND}}", `file://${web}/public/brand`)
  .replaceAll("{{BASE}}", base.replace(/\/$/, ""))
  .replaceAll("{{HOST}}", host);
writeFileSync(join(here, "render.html"), html);

const PORT = 9360;
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", ["--headless=new", "--disable-gpu", "--allow-file-access-from-files", `--remote-debugging-port=${PORT}`, `--user-data-dir=${here}/.profile`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
for (let i = 0; i < 50; i++) { try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); const p = t.find((x) => x.type === "page"); if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
await new Promise((r) => ws.addEventListener("open", r));
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (m) => (m.error ? rej(new Error(m.error.message)) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1123, height: 794, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: `file://${join(here, "render.html")}` });
await sleep(800);
for (let i = 0; i < 50 && (await js("document.readyState")) !== "complete"; i++) await sleep(200);
await js("document.fonts.ready.then(() => true)");
await js("Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))");
const broken = await js("[...document.images].filter(i => !i.naturalWidth).map(i => i.getAttribute('src'))");
if (broken.length) console.log("BROKEN IMAGES:", broken.join(", "));
const fonts = await js("[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join(',')");
console.log("fonts loaded:", fonts);

if (previewDir) {
  mkdirSync(previewDir, { recursive: true });
  const rects = await js("[...document.querySelectorAll('.page')].map(p => { const r = p.getBoundingClientRect(); return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })");
  for (const [n, r] of rects.entries()) {
    const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 70, captureBeyondViewport: true, clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
    writeFileSync(join(previewDir, `page-${String(n + 1).padStart(2, "0")}.jpg`), Buffer.from(data, "base64"));
  }
  console.log("previews:", rects.length);
}
const { data } = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
writeFileSync(outPdf, Buffer.from(data, "base64"));
console.log("pdf:", outPdf);
ws.close(); chrome.kill();
