import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { ApplicationStatus } from "@/db/schema";
import { statusLabels } from "@/lib/lending";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {back && (
          <Link href={back.href} className="mb-3 inline-block text-sm text-muted hover:text-forest-700">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-forest-950">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, actions, children, className, padded = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("rounded-xl border border-line bg-white", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
          <h2 className="text-sm font-semibold text-forest-950">{title}</h2>
          {actions}
        </div>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}

const tones = {
  neutral: "bg-sand text-ink/75",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  progress: "bg-amber-50 text-amber-800 ring-amber-200",
  good: "bg-forest-50 text-forest-800 ring-forest-200",
  bad: "bg-red-50 text-red-700 ring-red-200",
  done: "bg-forest-600 text-white",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-transparent ring-inset", tones[tone])}>{children}</span>;
}

const statusTone: Record<ApplicationStatus, Tone> = {
  new: "info",
  reviewing: "progress",
  recommended: "progress",
  approved: "good",
  declined: "bad",
  disbursed: "done",
  withdrawn: "neutral",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={statusTone[status]}>{statusLabels[status]}</Badge>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "bad" | "good" }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight tabular text-forest-950", tone === "bad" && "text-red-700")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm [&_td]:px-5 [&_td]:py-3 [&_th]:px-5 [&_th]:py-2.5 [&_th]:text-xs [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted [&_thead_tr]:border-b [&_thead_tr]:border-line [&_tbody_tr]:border-b [&_tbody_tr]:border-line/70 [&_tbody_tr:last-child]:border-0">
        {children}
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-12 text-center text-sm text-muted">{children}</p>;
}

export function DefList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted">{k}</dt>
          <dd className="mt-0.5 font-medium text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

const control =
  "w-full rounded-lg border border-line bg-white px-3 h-9 text-sm text-ink placeholder:text-muted/70 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/15 aria-[invalid=true]:border-red-500";

export function CField({ label, name, error, children, hint }: { label: string; name: string; error?: string[]; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-ink/80">
        {label}
      </label>
      {children}
      {error?.[0] ? <p className="mt-1 text-xs text-red-600">{error[0]}</p> : hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function CInput({ error, className, ...props }: ComponentProps<"input"> & { error?: string[] }) {
  return <input id={props.name} aria-invalid={error?.length ? true : undefined} className={cn(control, className)} {...props} />;
}

export function CSelect({ error, className, ...props }: ComponentProps<"select"> & { error?: string[] }) {
  return <select id={props.name} aria-invalid={error?.length ? true : undefined} className={cn(control, className)} {...props} />;
}

export function CTextarea({ error, className, ...props }: ComponentProps<"textarea"> & { error?: string[] }) {
  return <textarea id={props.name} aria-invalid={error?.length ? true : undefined} className={cn(control, "h-auto min-h-20 py-2", className)} {...props} />;
}

export function FilterTabs({ tabs, active }: { tabs: { href: string; label: string; count?: number; key: string }[]; active: string }) {
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line" aria-label="Filter">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={cn(
            "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm",
            active === t.key ? "border-forest-600 font-medium text-forest-800" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-sand px-1.5 text-xs tabular text-ink/70">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Kampala" }) : "—";

export const fmtDateTime = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("en-UG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Kampala" }) : "—";
