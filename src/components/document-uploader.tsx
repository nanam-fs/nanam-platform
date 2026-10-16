"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Paperclip } from "lucide-react";
import type { DocumentKind } from "@/db/schema";
import { documentLabels, MAX_UPLOAD_BYTES } from "@/lib/documents-config";
import { cn } from "@/lib/utils";

type Uploaded = { kind: DocumentKind; fileName: string };

/** Downscale large phone photos before upload so they fit comfortably under the size limit. */
async function prepare(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < 1_200_000) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
  return blob && blob.size < file.size ? blob : file;
}

export function DocumentUploader({
  applicationId,
  token,
  slots,
  required = [],
  existing = [],
  variant = "public",
  onUploaded,
}: {
  applicationId: string;
  token?: string;
  slots: DocumentKind[];
  required?: DocumentKind[];
  existing?: Uploaded[];
  variant?: "public" | "console";
  onUploaded?: () => void;
}) {
  const [done, setDone] = useState<Uploaded[]>(existing);
  const [busy, setBusy] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<{ kind: DocumentKind; message: string } | null>(null);
  const inputs = useRef<Partial<Record<DocumentKind, HTMLInputElement | null>>>({});

  async function upload(kind: DocumentKind, file: File) {
    setError(null);
    setBusy(kind);
    try {
      const body = await prepare(file);
      if (body.size > MAX_UPLOAD_BYTES) throw new Error("That file is over 4 MB. Try a photo instead, or bring it to our office.");
      const fd = new FormData();
      fd.set("applicationId", applicationId);
      fd.set("kind", kind);
      if (token) fd.set("token", token);
      fd.set("file", body, body instanceof File ? body.name : file.name.replace(/\.\w+$/, "") + ".jpg");
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; fileName?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Upload failed. Please try again.");
      setDone((d) => [...d, { kind, fileName: json.fileName ?? file.name }]);
      onUploaded?.();
    } catch (e) {
      setError({ kind, message: e instanceof Error ? e.message : "Upload failed." });
    } finally {
      setBusy(null);
      const input = inputs.current[kind];
      if (input) input.value = "";
    }
  }

  const compact = variant === "console";
  return (
    <ul className={cn("space-y-2", compact && "text-sm")}>
      {slots.map((kind) => {
        const files = done.filter((d) => d.kind === kind);
        const has = files.length > 0;
        return (
          <li key={kind} className={cn("flex flex-col gap-2 border border-line bg-white sm:flex-row sm:items-center sm:justify-between", compact ? "rounded-lg px-3 py-2.5" : "rounded-2xl p-4")}>
            <div className="flex min-w-0 items-start gap-3">
              {has ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-forest-600" /> : <Paperclip className="mt-0.5 size-5 shrink-0 text-muted" />}
              <div className="min-w-0">
                <p className="font-medium text-forest-950">
                  {documentLabels[kind]}
                  {required.includes(kind) && !has && <span className="ml-1.5 text-xs font-normal text-muted">required</span>}
                </p>
                {files.map((f, i) => (
                  <p key={i} className="truncate text-xs text-muted">{f.fileName}</p>
                ))}
                {error?.kind === kind && <p role="alert" className="text-xs text-red-700">{error.message}</p>}
              </div>
            </div>
            <label
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 font-medium transition-colors",
                compact ? "h-8 rounded-lg border border-line px-3 text-xs hover:bg-cream" : "h-10 rounded-full border border-forest-600/30 px-4 text-sm text-forest-700 hover:bg-forest-50",
                busy && "pointer-events-none opacity-60",
              )}
            >
              {busy === kind ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
              {busy === kind ? "Uploading…" : has ? "Add another" : "Upload"}
              <input
                ref={(el) => {
                  inputs.current[kind] = el;
                }}
                type="file"
                data-kind={kind}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                capture={kind === "passport_photo" ? "user" : undefined}
                className="sr-only"
                disabled={!!busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(kind, f);
                }}
              />
            </label>
          </li>
        );
      })}
    </ul>
  );
}
