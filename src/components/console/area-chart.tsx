"use client";

import * as m from "motion/react-m";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn, compactUGX, formatUGX } from "@/lib/utils";

type Point = { week: string; disbursed: number; collected: number; loans: number };
type Metric = "disbursed" | "collected";

const H = 220;
const PAD = { t: 12, r: 8, b: 26, l: 44 };

function niceMax(v: number) {
  if (v <= 0) return 1_000_000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p) * p;
}

const weekLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/**
 * Single-series weekly area chart with metric + range switches, a hover/keyboard crosshair and tooltip.
 * One series at a time keeps the chart honest (one unit, one axis) and the colour meaningful.
 */
export function PortfolioChart({ data }: { data: Point[] }) {
  const [metric, setMetric] = useState<Metric>("disbursed");
  const [range, setRange] = useState<12 | 26>(12);
  const [hover, setHover] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const gid = useId();
  // Draw at the real pixel width so axis text stays 11px on a phone instead of being squashed.
  const [W, setW] = useState(720);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const ticks = W < 480 ? 3 : 6;

  const pts = data.slice(-range);
  const values = pts.map((p) => p[metric]);
  const total = values.reduce((s, v) => s + v, 0);
  const max = niceMax(Math.max(...values, 0));
  const x = (i: number) => PAD.l + (i * (W - PAD.l - PAD.r)) / Math.max(1, pts.length - 1);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

  const { line, area } = useMemo(() => {
    const c = values.map((v, i) => [x(i), y(v)] as const);
    // Straight segments: smoothing would invent values between weeks.
    const d = c.map(([px, py], i) => `${i ? "L" : "M"}${px},${py}`).join(" ");
    return { line: d, area: `${d} L${x(c.length - 1)},${H - PAD.b} L${x(0)},${H - PAD.b} Z` };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, range, data, W]);

  const onMove = (clientX: number) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const sx = ((clientX - r.left) / r.width) * W;
    const i = Math.round(((sx - PAD.l) / (W - PAD.l - PAD.r)) * (pts.length - 1));
    setHover(Math.max(0, Math.min(pts.length - 1, i)));
  };
  const h = hover !== null ? pts[hover] : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{metric === "disbursed" ? "Disbursed" : "Collected"}, last {range} weeks</p>
          <p className="mt-1 font-display text-2xl tracking-tight text-forest-950 tabular sm:text-3xl">{formatUGX(total)}</p>
        </div>
        <div className="flex gap-2">
          <Segmented value={metric} onChange={setMetric} options={[{ v: "disbursed", l: "Disbursed" }, { v: "collected", l: "Collected" }]} />
          <Segmented value={range} onChange={setRange} options={[{ v: 12, l: "12w" }, { v: 26, l: "26w" }]} />
        </div>
      </div>
      <div className="relative mt-4">
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="h-56 w-full touch-none outline-none"
          role="img"
          aria-label={`${metric === "disbursed" ? "Disbursements" : "Collections"} per week. Total ${formatUGX(total)}. Highest week ${formatUGX(Math.max(...values, 0))}.`}
          tabIndex={0}
          onPointerMove={(e) => onMove(e.clientX)}
          onPointerLeave={() => setHover(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") setHover((v) => Math.min(pts.length - 1, (v ?? -1) + 1));
            if (e.key === "ArrowLeft") setHover((v) => Math.max(0, (v ?? pts.length) - 1));
            if (e.key === "Escape") setHover(null);
          }}
          onBlur={() => setHover(null)}
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-forest-500)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-forest-500)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(max * t)} y2={y(max * t)} stroke="var(--color-line)" strokeDasharray={t ? "3 4" : undefined} vectorEffect="non-scaling-stroke" />
              <text x={PAD.l - 8} y={y(max * t) + 4} textAnchor="end" className="fill-muted text-[11px]">
                {t === 0 ? "0" : compactUGX(max * t)}
              </text>
            </g>
          ))}
          <m.path key={`a-${metric}-${range}`} d={area} fill={`url(#${gid})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
          <m.path
            key={`l-${metric}-${range}`}
            d={line}
            fill="none"
            stroke="var(--color-forest-600)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
          {pts.map((p, i) =>
            (i % Math.ceil(pts.length / ticks) === 0 && pts.length - 1 - i >= Math.ceil(pts.length / ticks) / 2) || i === pts.length - 1 ? (
              <text key={p.week} x={x(i)} y={H - 6} textAnchor={i === pts.length - 1 ? "end" : "middle"} className="fill-muted text-[11px]">
                {weekLabel(p.week)}
              </text>
            ) : null,
          )}
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--color-forest-950)" strokeOpacity={0.25} vectorEffect="non-scaling-stroke" />
              <circle cx={x(hover)} cy={y(h[metric])} r={4.5} fill="white" stroke="var(--color-forest-600)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            </g>
          )}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-lg"
            style={{ left: `clamp(4.5rem, ${(x(hover) / W) * 100}%, calc(100% - 4.5rem))` }}
          >
            <p className="text-muted">Week of {weekLabel(h.week)}</p>
            <p className="mt-0.5 font-semibold text-ink tabular">{formatUGX(h[metric])}</p>
            {metric === "disbursed" && <p className="text-muted">{h.loans} loan{h.loans === 1 ? "" : "s"}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Segmented<T extends string | number>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[] }) {
  return (
    <div role="radiogroup" className="flex rounded-full bg-sand p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={String(o.v)}
          role="radio"
          aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn("rounded-full px-3 py-2 font-medium transition-colors sm:py-1.5", value === o.v ? "bg-white text-forest-950 shadow-sm" : "text-muted hover:text-ink")}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

/** Tiny single-series trend line for KPI cards (decorative; the number carries the meaning). */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(...values, 1);
  const d = values.map((v, i) => `${i ? "L" : "M"}${(i / Math.max(1, values.length - 1)) * 100},${28 - (v / max) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden className={cn("h-8 w-24", className)}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.6} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
