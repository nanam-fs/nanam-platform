import { cn, compactUGX, formatUGX } from "@/lib/utils";

/** Single-series monthly columns. Hover/focus a column for the exact value. */
export function MonthlyBars({ data, label }: { data: { month: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const ticks = [max, max / 2, 0];
  return (
    <figure>
      <figcaption className="sr-only">{label}</figcaption>
      <div className="flex h-44 gap-3">
        <div className="flex flex-col justify-between py-0.5 text-right text-[11px] text-muted tabular">
          {ticks.map((t, i) => (
            <span key={i}>{t === 0 ? "0" : compactUGX(t)}</span>
          ))}
        </div>
        <div className="relative flex flex-1 items-end gap-2 border-b border-line">
          {[0, 50].map((p) => (
            <span key={p} aria-hidden className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line/80" style={{ top: `${p}%` }} />
          ))}
          {data.map((d) => {
            const name = new Date(`${d.month}-01T00:00:00Z`).toLocaleDateString("en-UG", { month: "short", timeZone: "UTC" });
            return (
              <div key={d.month} tabIndex={0} className="group relative flex h-full flex-1 items-end justify-center outline-none" aria-label={`${name}: ${formatUGX(d.value)}`}>
                <div
                  className="w-full max-w-10 rounded-t-[4px] bg-forest-600 transition-colors group-hover:bg-forest-500 group-focus-visible:bg-forest-500"
                  style={{ height: `${Math.max(d.value > 0 ? 2 : 0, (d.value / max) * 100)}%` }}
                />
                <span className="pointer-events-none absolute -top-9 z-10 hidden whitespace-nowrap rounded-md bg-forest-950 px-2 py-1 text-xs text-white shadow-lg group-hover:block group-focus-visible:block">
                  {name}: {formatUGX(d.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex gap-2 pl-[calc(2.25rem+0.75rem)]">
        {data.map((d) => (
          <span key={d.month} className="flex-1 text-center text-[11px] text-muted">
            {new Date(`${d.month}-01T00:00:00Z`).toLocaleDateString("en-UG", { month: "short", timeZone: "UTC" })}
          </span>
        ))}
      </div>
    </figure>
  );
}

const bucketTone: Record<string, { bar: string; label: string }> = {
  current: { bar: "bg-forest-500", label: "Current" },
  "1–30": { bar: "bg-amber-400", label: "1–30 days late" },
  "31–60": { bar: "bg-orange-500", label: "31–60 days late" },
  "61–90": { bar: "bg-red-500", label: "61–90 days late" },
  "90+": { bar: "bg-red-700", label: "Over 90 days" },
};

/** Portfolio aging. Each row is labelled in text, so colour is never the only cue. */
export function AgingBars({ data }: { data: { bucket: string; amount: number; loans: number }[] }) {
  const total = data.reduce((s, d) => s + d.amount, 0) || 1;
  return (
    <ul className="space-y-3.5">
      {data.map((d) => {
        const tone = bucketTone[d.bucket];
        const pct = (d.amount / total) * 100;
        return (
          <li key={d.bucket} title={`${tone.label}: ${formatUGX(d.amount)} across ${d.loans} loan${d.loans === 1 ? "" : "s"}`}>
            <div className="flex justify-between text-sm">
              <span className="text-ink/80">{tone.label}</span>
              <span className="tabular text-ink">
                {formatUGX(d.amount)} <span className="text-muted">· {d.loans}</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sand">
              <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
