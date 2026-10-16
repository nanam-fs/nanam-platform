"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, CircleAlert, IdCard, Loader2, RotateCcw, ScanFace, ShieldCheck, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "intro" | "front" | "back" | "selfie" | "review" | "sending" | "result";
type Shot = { blob: Blob; url: string };
type Result = { status: string; reason: string | null };

const LIVENESS_FRAMES = 8;
const prompts = ["Look straight at the camera", "Slowly turn your head left", "Now slowly to the right", "Back to the centre, and smile"];

/** Grabs the current video frame as a JPEG, scaled so the long edge is at most `max` px. */
async function grab(video: HTMLVideoElement, max: number, quality = 0.88, mirror = false): Promise<Blob> {
  const scale = Math.min(1, max / Math.max(video.videoWidth, video.videoHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(video.videoWidth * scale);
  c.height = Math.round(video.videoHeight * scale);
  const ctx = c.getContext("2d")!;
  if (mirror) {
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, c.width, c.height);
  return new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("capture failed"))), "image/jpeg", quality));
}

/** Rough exposure check on a small thumbnail: rejects black, blank or badly lit frames. */
async function exposureProblem(blob: Blob): Promise<string | null> {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = 48;
  c.height = 32;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, 48, 32);
  const d = ctx.getImageData(0, 0, 48, 32).data;
  let sum = 0;
  let sq = 0;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    sum += l;
    sq += l * l;
  }
  const n = d.length / 4;
  const mean = sum / n;
  const sd = Math.sqrt(sq / n - mean * mean);
  if (mean < 35) return "That photo is too dark. Move to better light and try again.";
  if (mean > 235) return "That photo is washed out. Avoid direct light or glare and try again.";
  if (sd < 4) return "We couldn’t see the card clearly. Hold it inside the frame and try again.";
  return null;
}

/** Downscale a file chosen from the camera app (fallback path) to a JPEG. */
async function fromFile(file: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("convert failed"))), "image/jpeg", 0.88));
}

function useCamera(facing: "environment" | "user", active: boolean) {
  const ref = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "ready" | "denied">("starting");
  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const v = ref.current;
        if (v) {
          v.srcObject = s;
          // "Ready" only once real frames are arriving; the first frames after start are often black.
          v.onplaying = () => setTimeout(() => !cancelled && setState("ready"), 600);
        }
      })
      .catch(() => setState("denied"));
    if (!navigator.mediaDevices) queueMicrotask(() => setState("denied"));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing, active]);
  return [ref, state] as const;
}

export function CaptureFlow({ token, firstName }: { token: string; firstName: string }) {
  const [step, setStep] = useState<Step>("intro");
  const [consent, setConsent] = useState(false);
  const [front, setFront] = useState<Shot | null>(null);
  const [back, setBack] = useState<Shot | null>(null);
  const [selfie, setSelfie] = useState<Shot | null>(null);
  const [frames, setFrames] = useState<Blob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const shot = (blob: Blob): Shot => ({ blob, url: URL.createObjectURL(blob) });

  const submit = useCallback(async () => {
    if (!front || !selfie || frames.length < 6) return;
    setStep("sending");
    setError(null);
    const fd = new FormData();
    fd.set("consent", consent ? "on" : "");
    fd.set("front", front.blob, "front.jpg");
    if (back) fd.set("back", back.blob, "back.jpg");
    fd.set("selfie", selfie.blob, "selfie.jpg");
    frames.forEach((f, i) => fd.append("liveness", f, `l${i}.jpg`));
    const res = await fetch(`/api/kyc/${token}/submit`, { method: "POST", body: fd }).catch(() => null);
    const j = (await res?.json().catch(() => null)) as { ok?: boolean; status?: string; reason?: string | null; message?: string } | null;
    if (!res?.ok || !j?.ok) {
      setError(j?.message ?? "We couldn’t send your photos. Check your connection and try again.");
      setStep("review");
      return;
    }
    setResult({ status: j.status ?? "processing", reason: j.reason ?? null });
    setStep("result");
  }, [back, consent, frames, front, selfie, token]);

  // While the provider is processing, keep checking (usually a few seconds).
  useEffect(() => {
    if (step !== "result" || result?.status !== "processing") return;
    const t = setInterval(async () => {
      const r = (await fetch(`/api/kyc/${token}/status`, { cache: "no-store" }).then((x) => x.json()).catch(() => null)) as Result | null;
      if (r && r.status !== "processing") setResult(r);
    }, 2000);
    return () => clearInterval(t);
  }, [step, result?.status, token]);

  const order: Step[] = ["front", "back", "selfie", "review"];
  const progress = Math.max(0, order.indexOf(step));

  return (
    <div className="flex min-h-dvh flex-col bg-forest-950 text-white">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 pt-5">
        <p className="text-sm font-medium tracking-tight">NANAM · Identity check</p>
        {order.includes(step) && (
          <ol className="flex gap-1.5" aria-label={`Step ${progress + 1} of ${order.length}`}>
            {order.map((s, i) => (
              <li key={s} className={cn("h-1 w-6 rounded-full transition-colors", i <= progress ? "bg-lime-400" : "bg-white/15")} />
            ))}
          </ol>
        )}
      </header>

      <AnimatePresence mode="wait">
        <m.main
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-6 pb-8"
        >
          {step === "intro" && (
            <div className="flex flex-1 flex-col">
              <h1 className="text-3xl font-semibold tracking-tight text-balance">Hi {firstName}, let’s confirm it’s you.</h1>
              <p className="mt-3 text-white/65">It takes about a minute. Your result usually appears within seconds.</p>
              <ul className="mt-8 space-y-4">
                {[
                  { icon: IdCard, t: "Your National ID card", b: "We’ll photograph the front and the back." },
                  { icon: ScanFace, t: "A quick selfie", b: "Follow the prompts so we can check it’s really you." },
                  { icon: Sun, t: "Good light", b: "Avoid glare on the card, and remove hats or glasses." },
                ].map(({ icon: Icon, t, b }) => (
                  <li key={t} className="flex gap-4">
                    <Icon className="mt-0.5 size-6 shrink-0 text-lime-400" strokeWidth={1.6} />
                    <div>
                      <p className="font-medium">{t}</p>
                      <p className="text-sm text-white/60">{b}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <label className="mt-auto flex gap-3 rounded-2xl bg-white/5 p-4 text-sm text-white/80">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-lime-500" />
                <span>
                  I agree that NANAM and its verification partner may process photos of my ID and my face to confirm my identity for this loan
                  application, in line with the Data Protection and Privacy Act, 2019.
                </span>
              </label>
              <button
                disabled={!consent}
                onClick={() => setStep("front")}
                className="mt-4 flex h-14 items-center justify-center gap-2 rounded-full bg-lime-500 font-medium text-forest-950 disabled:opacity-40"
              >
                <Camera className="size-5" /> Start
              </button>
            </div>
          )}

          {(step === "front" || step === "back") && (
            <DocumentCapture
              key={step}
              side={step}
              existing={step === "front" ? front : back}
              onCapture={(b) => (step === "front" ? setFront(shot(b)) : setBack(shot(b)))}
              onNext={() => setStep(step === "front" ? "back" : "selfie")}
            />
          )}

          {step === "selfie" && (
            <SelfieCapture
              existing={selfie}
              onCapture={(s, f) => {
                setSelfie(shot(s));
                setFrames(f);
              }}
              onNext={() => setStep("review")}
            />
          )}

          {step === "review" && (
            <div className="flex flex-1 flex-col">
              <h1 className="text-2xl font-semibold tracking-tight">Check your photos</h1>
              <p className="mt-2 text-sm text-white/60">Make sure the text on your ID is sharp and your face is clear.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { label: "ID front", s: front, go: "front" as Step },
                  { label: "ID back", s: back, go: "back" as Step },
                ].map(({ label, s, go }) => (
                  <button key={label} onClick={() => setStep(go)} className="group relative overflow-hidden rounded-2xl bg-white/5 text-left">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {s ? <img src={s.url} alt={label} className="aspect-[1.586] w-full object-cover" /> : <div className="aspect-[1.586]" />}
                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-3 py-1.5 text-xs">
                      {label} <RotateCcw className="size-3.5 opacity-70" />
                    </span>
                  </button>
                ))}
                <button onClick={() => setStep("selfie")} className="relative col-span-2 overflow-hidden rounded-2xl bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {selfie && <img src={selfie.url} alt="Selfie" className="mx-auto aspect-square w-1/2 rounded-full object-cover p-3" />}
                  <span className="block pb-3 text-center text-xs text-white/70">Selfie · tap to retake</span>
                </button>
              </div>
              {error && (
                <p role="alert" className="mt-4 flex gap-2 rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
                </p>
              )}
              <button onClick={submit} className="mt-auto flex h-14 items-center justify-center gap-2 rounded-full bg-lime-500 font-medium text-forest-950">
                <ShieldCheck className="size-5" /> Submit for verification
              </button>
            </div>
          )}

          {step === "sending" && <Waiting title="Sending securely…" body="Uploading your photos over an encrypted connection." />}

          {step === "result" && result && <ResultView result={result} />}
        </m.main>
      </AnimatePresence>
    </div>
  );
}

function DocumentCapture({ side, existing, onCapture, onNext }: { side: "front" | "back"; existing: Shot | null; onCapture: (b: Blob) => void; onNext: () => void }) {
  const [preview, setPreview] = useState(existing);
  const [video, camState] = useCamera("environment", !preview);
  const file = useRef<HTMLInputElement>(null);

  const [problem, setProblem] = useState<string | null>(null);
  const accept = async (b: Blob) => {
    const issue = await exposureProblem(b);
    setProblem(issue);
    if (issue) return;
    onCapture(b);
    setPreview({ blob: b, url: URL.createObjectURL(b) });
  };
  const take = async () => {
    if (video.current) await accept(await grab(video.current, 1600));
  };
  const pick = async (f: File) => accept(await fromFile(f));

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-semibold tracking-tight">{side === "front" ? "Front of your ID" : "Back of your ID"}</h1>
      <p className="mt-2 text-sm text-white/60">Fit the card inside the frame, flat and fully visible.</p>
      <div className="relative mt-6 aspect-[1.586] w-full overflow-hidden rounded-2xl bg-black">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.url} alt={`ID ${side}`} className="size-full object-cover" />
        ) : (
          <>
            <video ref={video} autoPlay playsInline muted className="size-full object-cover" />
            <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-dashed border-lime-400/80" />
            {camState === "starting" && <Loader2 className="absolute inset-0 m-auto size-6 animate-spin text-white/60" />}
          </>
        )}
      </div>
      {problem && !preview && (
        <p role="alert" className="mt-4 flex gap-2 rounded-xl bg-amber-400/15 px-4 py-3 text-sm text-amber-100">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {problem}
        </p>
      )}
      {camState === "denied" && !preview && (
        <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-white/70">Camera access is blocked. Use your phone’s camera app instead:</p>
      )}
      <input ref={file} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
      <div className="mt-auto space-y-3 pt-6">
        {preview ? (
          <>
            <button onClick={onNext} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-lime-500 font-medium text-forest-950">
              <Check className="size-5" /> Use this photo
            </button>
            <button onClick={() => setPreview(null)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-white/80">
              <RotateCcw className="size-4" /> Retake
            </button>
          </>
        ) : camState === "denied" ? (
          <button onClick={() => file.current?.click()} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-lime-500 font-medium text-forest-950">
            <Camera className="size-5" /> Open camera app
          </button>
        ) : (
          <button onClick={take} disabled={camState !== "ready"} aria-label="Take photo" className="mx-auto grid size-18 place-items-center rounded-full border-4 border-white/80 disabled:opacity-40">
            <span className="size-13 rounded-full bg-white" />
          </button>
        )}
      </div>
    </div>
  );
}

function SelfieCapture({ existing, onCapture, onNext }: { existing: Shot | null; onCapture: (selfie: Blob, frames: Blob[]) => void; onNext: () => void }) {
  const [done, setDone] = useState(!!existing);
  const [running, setRunning] = useState(false);
  const [prompt, setPrompt] = useState(0);
  const [count, setCount] = useState(0);
  const [video, camState] = useCamera("user", !done);

  const run = async () => {
    const v = video.current;
    if (!v) return;
    setRunning(true);
    const frames: Blob[] = [];
    let selfie: Blob | null = null;
    // Eight frames across ~3 s while the person follows the prompts; the provider checks they're live.
    for (let i = 0; i < LIVENESS_FRAMES; i++) {
      setPrompt(Math.min(prompts.length - 1, Math.floor((i / LIVENESS_FRAMES) * prompts.length)));
      await new Promise((r) => setTimeout(r, 380));
      frames.push(await grab(v, 640, 0.8, true));
      setCount(i + 1);
      if (i === 1) selfie = await grab(v, 1280, 0.9, true);
    }
    onCapture(selfie ?? frames[0], frames);
    setRunning(false);
    setDone(true);
  };

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-semibold tracking-tight">Take a selfie</h1>
      <p className="mt-2 text-sm text-white/60">Hold your phone at eye level with your face inside the oval.</p>
      <div className="relative mx-auto mt-6 aspect-[3/4] w-full max-w-xs overflow-hidden rounded-[2rem] bg-black">
        {done ? (
          <div className="grid size-full place-items-center">
            <m.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="grid size-20 place-items-center rounded-full bg-lime-500 text-forest-950">
              <Check className="size-10" />
            </m.span>
          </div>
        ) : (
          <>
            <video ref={video} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" />
            <div className="pointer-events-none absolute inset-[10%_14%] rounded-[50%] border-[3px] border-lime-400/90 shadow-[0_0_0_999px_rgb(3_26_15/0.55)]" />
            {running && (
              <p aria-live="assertive" className="absolute inset-x-0 bottom-4 text-center text-sm font-medium">
                {prompts[prompt]}
              </p>
            )}
          </>
        )}
      </div>
      {running && (
        <div className="mx-auto mt-4 h-1 w-40 overflow-hidden rounded-full bg-white/15">
          <m.div className="h-full bg-lime-400" animate={{ width: `${(count / LIVENESS_FRAMES) * 100}%` }} />
        </div>
      )}
      {camState === "denied" && !done && <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-white/70">Allow camera access in your browser settings, then reload this page. A live selfie is required.</p>}
      <div className="mt-auto space-y-3 pt-6">
        {done ? (
          <>
            <button onClick={onNext} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-lime-500 font-medium text-forest-950">
              <Check className="size-5" /> Continue
            </button>
            <button onClick={() => setDone(false)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-white/80">
              <RotateCcw className="size-4" /> Retake selfie
            </button>
          </>
        ) : (
          <button onClick={run} disabled={camState !== "ready" || running} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-lime-500 font-medium text-forest-950 disabled:opacity-40">
            {running ? <Loader2 className="size-5 animate-spin" /> : <ScanFace className="size-5" />} {running ? "Hold still and follow the prompts" : "Start selfie"}
          </button>
        )}
      </div>
    </div>
  );
}

function Waiting({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span className="relative grid size-20 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-lime-400/20" />
        <ShieldCheck className="size-10 text-lime-400" />
      </span>
      <p className="mt-6 text-xl font-semibold">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-white/60">{body}</p>
    </div>
  );
}

function ResultView({ result }: { result: Result }) {
  if (result.status === "processing") return <Waiting title="Checking your identity…" body="This usually takes a few seconds. You can keep this page open." />;
  const content: Record<string, { title: string; body: string; tone: "good" | "wait" | "bad" }> = {
    verified: { title: "You’re verified", body: "Thank you. Your identity is confirmed and your application continues. You can close this page.", tone: "good" },
    review: { title: "Almost there", body: "A NANAM officer will take a quick look and contact you if anything else is needed.", tone: "wait" },
    rejected: { title: "We couldn’t verify you", body: `${result.reason ?? ""} Please visit our office with your National ID, or call us.`, tone: "bad" },
    retake: { title: "Let’s try that again", body: `${result.reason ?? "The photos weren’t clear enough."} Go back to your computer or the portal to start a new check.`, tone: "bad" },
    expired: { title: "This link has expired", body: "Start a new identity check from your computer or the NANAM portal.", tone: "bad" },
  };
  const c = content[result.status] ?? content.review;
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <m.span
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn("grid size-20 place-items-center rounded-full", c.tone === "good" ? "bg-lime-500 text-forest-950" : c.tone === "wait" ? "bg-white/10 text-lime-300" : "bg-red-500/20 text-red-200")}
      >
        {c.tone === "good" ? <Check className="size-10" /> : c.tone === "wait" ? <ShieldCheck className="size-10" /> : <CircleAlert className="size-10" />}
      </m.span>
      <p className="mt-6 text-2xl font-semibold">{c.title}</p>
      <p className="mt-2 max-w-xs text-white/65">{c.body}</p>
    </div>
  );
}
