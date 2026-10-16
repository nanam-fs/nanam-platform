"use client";

import { useActionState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { DemoCode } from "@/components/demo-code";
import { loginStep, type LoginState } from "../actions";

const field =
  "h-14 w-full rounded-2xl border border-line bg-white px-4 text-lg text-ink focus:border-forest-600 focus:outline-none focus:ring-4 focus:ring-forest-600/10";

export function PortalLoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginStep, { step: "phone" });

  if (state.step === "code") {
    return (
      <form action={action} className="space-y-4">
        <input type="hidden" name="phone" value={state.phone} />
        {state.message && <p className="rounded-xl bg-forest-50 px-4 py-3 text-sm text-forest-800">{state.message}</p>}
        {state.demoCode && <DemoCode code={state.demoCode} />}
        <div>
          <label htmlFor="code" className="mb-2 block text-sm font-medium text-forest-950">6-digit code</label>
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            className={`${field} text-center font-mono tracking-[0.5em]`}
          />
        </div>
        {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
        <button name="intent" value="verify" disabled={pending} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-forest-600 font-medium text-white hover:bg-forest-700 disabled:opacity-60">
          {pending ? <Loader2 className="size-5 animate-spin" /> : null} Sign in
        </button>
        <div className="flex justify-between text-sm">
          <button name="intent" value="change" formNoValidate className="text-muted hover:text-forest-700">Use a different number</button>
          <button name="intent" value="send" formNoValidate className="font-medium text-forest-700 hover:underline">Resend code</button>
        </div>
      </form>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="phone" className="mb-2 block text-sm font-medium text-forest-950">Mobile number</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0772 123 456" required autoFocus defaultValue={state.phone} className={field} />
        <p className="mt-2 text-sm text-muted">Use the number on your loan application.</p>
      </div>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      <button name="intent" value="send" disabled={pending} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-forest-600 font-medium text-white hover:bg-forest-700 disabled:opacity-60">
        {pending ? <Loader2 className="size-5 animate-spin" /> : null} Send me a code <ArrowRight className="size-4" />
      </button>
    </form>
  );
}
