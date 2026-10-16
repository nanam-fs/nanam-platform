"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import type { ActionResult } from "@/app/console/actions";
import { cn } from "@/lib/utils";

type FormAction = (state: ActionResult, fd: FormData) => Promise<ActionResult>;

/** A form wired to a server action, with inline success/error feedback and field errors via render prop. */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = true,
}: {
  action: FormAction;
  children: (state: ActionResult, pending: boolean) => ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children(state, pending)}
      <Feedback state={state} />
    </form>
  );
}

export function Feedback({ state }: { state: ActionResult }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "mt-3 flex gap-2 rounded-lg px-3 py-2 text-sm",
        state.ok ? "bg-forest-50 text-forest-800" : "bg-red-50 text-red-700",
      )}
    >
      {state.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
      <span className="break-words">{state.message}</span>
    </p>
  );
}

/** One-click action (e.g. "Mark as held") with pending state and result message. */
export function ActionButton({
  action,
  children,
  variant = "primary",
  confirm,
}: {
  action: () => Promise<ActionResult>;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionResult | null>(null);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => setState(await action()));
        }}
        className={cn(btn[variant], "w-full sm:w-auto")}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {children}
      </button>
      {state && <Feedback state={state} />}
    </div>
  );
}

export const btn = {
  primary:
    "inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-forest-600 px-4 text-sm font-medium text-white transition-colors hover:bg-forest-700 disabled:opacity-60",
  secondary:
    "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-ink transition-colors hover:bg-cream disabled:opacity-60",
  danger:
    "inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60",
};

export function Submit({ pending, children, variant = "primary" }: { pending: boolean; children: ReactNode; variant?: keyof typeof btn }) {
  return (
    <button type="submit" disabled={pending} className={btn[variant]}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
