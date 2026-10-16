"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Laptop, Loader2, ScanFace, ShieldCheck, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "idle" | "starting" | "waiting" | "processing" | "verified" | "review" | "rejected" | "retake" | "expired" | "error";

/**
 * Starts an identity check. On a computer it shows a QR code to continue on the phone and waits live;
 * on a phone it goes straight to the camera. Results usually arrive within seconds.
 */
export function IdentityCheck({ applicationId, uploadToken, initialStatus }: { applicationId: string; uploadToken?: string; initialStatus?: string | null }) {
  const [phase, setPhase] = useState<Phase>(initialStatus === "verified" ? "verified" : initialStatus === "review" ? "review" : initialStatus === "processing" ? "processing" : "idle");
  const [link, setLink] = useState<{ token: string; captureUrl: string; qrSvg: string } | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMobile(window.matchMedia("(pointer: coarse)").matches && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)));
  }, []);

  async function start() {
    setPhase("starting");
    const res = await fetch("/api/kyc/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId, token: uploadToken }) }).catch(() => null);
    const j = (await res?.json().catch(() => null)) as { ok?: boolean; token?: string; captureUrl?: string; qrSvg?: string; message?: string } | null;
    if (!j?.ok || !j.token || !j.captureUrl || !j.qrSvg) {
      setReason(j?.message ?? "Couldn’t start the identity check.");
      setPhase("error");
      return;
    }
    setLink({ token: j.token, captureUrl: j.captureUrl, qrSvg: j.qrSvg });
    if (mobile) window.location.href = j.captureUrl;
    else setPhase("waiting");
  }

  // Watch the check while the applicant uses their phone.
  useEffect(() => {
    if (!link || !["waiting", "processing"].includes(phase)) return;
    const t = setInterval(async () => {
      const r = (await fetch(`/api/kyc/${link.token}/status`, { cache: "no-store" }).then((x) => x.json()).catch(() => null)) as { status?: string; reason?: string | null } | null;
      if (!r?.status || r.status === "awaiting_capture") return;
      setReason(r.reason ?? null);
      setPhase(r.status as Phase);
    }, 2500);
    return () => clearInterval(t);
  }, [link, phase]);

  const done = phase === "verified";
  return (
    <section className={cn("rounded-3xl border p-5 text-left sm:p-6 md:p-8", done ? "border-forest-600/30 bg-forest-50" : "border-line bg-white")}>
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", done ? "bg-forest-600 text-white" : "bg-forest-950 text-lime-400")}>
          {done ? <CheckCircle2 className="size-6" /> : <ScanFace className="size-6" strokeWidth={1.6} />}
        </span>
        <div>
          <p className="font-display text-2xl leading-tight text-forest-950">{done ? "Identity verified" : "Verify your identity"}</p>
          <p className="mt-1 text-sm text-muted">
            {done ? "Thanks, your ID and selfie matched. Nothing more to do here." : "Photograph your National ID and take a quick selfie. Most checks finish in seconds and speed up your approval."}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <m.div key={phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
          {(phase === "idle" || phase === "starting" || phase === "error" || phase === "retake" || phase === "expired") && (
            <div className="space-y-3">
              {(phase === "error" || phase === "retake" || phase === "expired") && (
                <p role="alert" className="flex gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" /> {reason ?? (phase === "expired" ? "That link expired." : "Let’s try again.")}
                </p>
              )}
              <button onClick={start} disabled={phase === "starting"} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest-600 font-medium text-white hover:bg-forest-700 disabled:opacity-60 sm:w-auto sm:px-7">
                {phase === "starting" ? <Loader2 className="size-4 animate-spin" /> : mobile ? <Smartphone className="size-4" /> : <ShieldCheck className="size-4" />}
                {phase === "idle" || phase === "starting" ? "Start identity check" : "Start again"}
              </button>
            </div>
          )}

          {phase === "waiting" && link && (
            <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
              <div className="mx-auto w-44 rounded-2xl border border-line bg-white p-2 [&_svg]:h-auto [&_svg]:w-full" aria-label="QR code to continue on your phone" dangerouslySetInnerHTML={{ __html: link.qrSvg }} />
              <div>
                <p className="font-medium text-forest-950">Scan with your phone camera</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted">
                  <li>Open the camera on your phone and point it at the code.</li>
                  <li>Tap the link, then follow the steps.</li>
                  <li>Keep this page open. Your result appears here automatically.</li>
                </ol>
                <p className="mt-4 flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="size-3.5 animate-spin" /> Waiting for your phone… (link valid for 30 minutes)
                </p>
                <a href={link.captureUrl} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-forest-700 underline-offset-4 hover:underline">
                  <Laptop className="size-4" /> No phone? Use this computer’s webcam
                </a>
              </div>
            </div>
          )}

          {phase === "processing" && (
            <p className="flex items-center gap-2 text-sm text-forest-800">
              <Loader2 className="size-4 animate-spin" /> Photos received. Checking your identity…
            </p>
          )}
          {phase === "review" && <p className="rounded-xl bg-sand px-4 py-3 text-sm text-ink/80">Photos received. A NANAM officer will complete the check shortly; we’ll contact you if anything else is needed.</p>}
          {phase === "rejected" && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{reason ?? "We couldn’t verify your identity."} Please visit our office with your National ID.</p>}
        </m.div>
      </AnimatePresence>
    </section>
  );
}
