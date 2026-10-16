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
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-lime-600/60 bg-lime-300/25 px-4 py-3 text-sm text-forest-900">
      <MessageSquareText className="size-4 shrink-0 text-forest-700" />
      <p className="min-w-0 flex-1">
        <span className="font-medium">Demo: no SMS is sent.</span> The code is{" "}
        <span className="font-mono text-base font-semibold tracking-[0.2em] text-forest-950">{code}</span>
      </p>
      <button type="button" onClick={fill} className="min-h-9 rounded-full bg-forest-950 px-3.5 text-xs font-medium text-white hover:bg-forest-800">
        Use code
      </button>
    </div>
  );
}
