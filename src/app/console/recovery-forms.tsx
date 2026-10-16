"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { forgotPassword, resetPassword, type ActionResult } from "./actions";

const input = "h-11 w-full rounded-lg border border-line bg-white px-3 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/15";
const button = "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-forest-600 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-60";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(forgotPassword, { ok: false });
  if (state.ok) return <p role="status" className="rounded-lg bg-forest-50 px-3 py-3 text-sm text-forest-800">{state.message}</p>;
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-forest-950">Work email</label>
        <input id="email" name="email" type="email" required autoComplete="username" autoFocus className={input} />
        {state.errors?.email && <p className="mt-1 text-xs text-red-600">{state.errors.email[0]}</p>}
      </div>
      <button disabled={pending} className={button}>{pending && <Loader2 className="size-4 animate-spin" />} Email me a reset link</button>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(resetPassword.bind(null, token), { ok: false });
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-forest-950">New password</label>
        <input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" autoFocus className={input} />
        <p className="mt-1 text-xs text-muted">At least 10 characters. A short phrase is easier to remember.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-forest-950">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" required minLength={10} autoComplete="new-password" className={input} />
        {state.errors?.confirm && <p className="mt-1 text-xs text-red-600">{state.errors.confirm[0]}</p>}
      </div>
      {state.message && !state.ok && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}
      <button disabled={pending} className={button}>{pending && <Loader2 className="size-4 animate-spin" />} Set new password</button>
    </form>
  );
}
