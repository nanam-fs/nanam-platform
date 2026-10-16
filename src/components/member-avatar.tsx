import { useId } from "react";
import { cn } from "@/lib/utils";

/** Brand pairings: background, ring/pattern, initials. All drawn from the logo palette. */
const themes = [
  { bg: "var(--color-forest-600)", fg: "var(--color-lime-400)", ink: "#fff" },
  { bg: "var(--color-forest-900)", fg: "var(--color-peach-400)", ink: "#fff" },
  { bg: "var(--color-lime-400)", fg: "var(--color-forest-600)", ink: "var(--color-forest-950)" },
  { bg: "var(--color-peach-400)", fg: "var(--color-forest-600)", ink: "var(--color-forest-950)" },
  { bg: "var(--color-forest-700)", fg: "var(--color-peach-300)", ink: "#fff" },
] as const;

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function initialsOf(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * A personal avatar that is the same every visit for the same person: initials over a pattern of
 * arcs (echoing the canopy in NANAM's mark) whose colours, angles and sweep come from a hash of the seed.
 */
export function MemberAvatar({ name, seed, className, ring }: { name: string | null; seed: string; className?: string; ring?: boolean }) {
  const id = useId();
  const h = hash(seed || "nanam");
  const t = themes[h % themes.length];
  const rot = (h >>> 3) % 360;
  const arcs = [0, 1, 2].map((i) => {
    const r = 9 + i * 5;
    const sweep = 70 + ((h >>> (5 + i * 4)) % 150);
    const start = ((h >>> (9 + i * 3)) % 360) * (Math.PI / 180);
    const end = start + sweep * (Math.PI / 180);
    const p = (a: number) => `${20 + r * Math.cos(a)},${20 + r * Math.sin(a)}`;
    return { d: `M${p(start)} A${r},${r} 0 ${sweep > 180 ? 1 : 0} 1 ${p(end)}`, o: 0.85 - i * 0.22 };
  });
  const initials = initialsOf(name);

  return (
    <span aria-hidden className={cn("relative inline-grid shrink-0 place-items-center rounded-full", ring && "ring-2 ring-white/80", className)}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full rounded-full">
        <clipPath id={id}>
          <circle cx="20" cy="20" r="20" />
        </clipPath>
        <g clipPath={`url(#${id})`}>
          <rect width="40" height="40" fill={t.bg} />
          <g transform={`rotate(${rot} 20 20)`} fill="none" stroke={t.fg} strokeLinecap="round" strokeWidth="3">
            {arcs.map((a, i) => (
              <path key={i} d={a.d} opacity={a.o} />
            ))}
          </g>
        </g>
      </svg>
      {initials ? (
        <span className="relative font-display text-[0.8em] font-semibold tracking-tight" style={{ color: t.ink }}>
          {initials}
        </span>
      ) : (
        // No name on file yet: a small person glyph in place of initials.
        <svg viewBox="0 0 24 24" className="relative size-1/2" fill={t.ink}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" />
        </svg>
      )}
    </span>
  );
}
