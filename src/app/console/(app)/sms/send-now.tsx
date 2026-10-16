"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { btn, Feedback } from "@/components/console/action-form";
import type { ActionResult } from "../../actions";
import { sendRemindersNow } from "../../actions";

/** Stays mounted after sending, so the result message remains visible once the list refreshes. */
export function SendNow({ pending }: { pending: number }) {
  const [busy, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="flex flex-col items-end">
      <button type="button" disabled={busy || pending === 0} onClick={() => start(async () => setResult(await sendRemindersNow()))} className={btn.primary}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {pending === 0 ? "All sent for today" : `Send ${pending} reminder${pending === 1 ? "" : "s"} now`}
      </button>
      {result && <Feedback state={result} />}
    </div>
  );
}
