"use client";

import { MessageSquareText } from "lucide-react";

/** Shown instead of an SMS when no SMS provider is connected (local test mode or the demo deployment). */
export function DemoCode({ code, inputId = "code" }: { code: string; inputId?: string }) {
  function fill() {
    const el = document.getElementById(inputId) as HTMLInputElement | null;
    if (!el) return;
    // Set through the native setter so React-managed inputs see the change too.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, code);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.focus();
  }
  return (
    <div role="status" className="rounded-xl border border-dashed border-lime-600/60 bg-lime-300/25 px-4 py-3 text-forest-900">
      <p className="flex items-center gap-2 text-xs font-medium">
        <MessageSquareText className="size-3.5 shrink-0 text-forest-700" /> Demo: no SMS is sent. Your code is
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="font-mono text-xl font-semibold tracking-[0.25em] text-forest-950">{code}</span>
        <button type="button" onClick={fill} className="min-h-10 shrink-0 rounded-full bg-forest-950 px-4 text-xs font-medium text-white hover:bg-forest-800">
          Use code
        </button>
      </div>
    </div>
  );
}
