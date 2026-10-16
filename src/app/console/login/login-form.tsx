"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { login, type ActionResult } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(login, { ok: false });
  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-forest-950">Work email</label>
        <input id="email" name="email" type="email" required autoComplete="username" autoFocus className="h-11 w-full rounded-lg border border-line bg-white px-3 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/15" />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-forest-950">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="h-11 w-full rounded-lg border border-line bg-white px-3 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/15" />
      </div>
      {state.message && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>}
      <button disabled={pending} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-forest-600 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-60">
        {pending && <Loader2 className="size-4 animate-spin" />} Sign in
      </button>
    </form>
  );
}
