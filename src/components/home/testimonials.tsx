"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type T = { name: string; role: string; quote: string };

/** One large quote at a time; advances every 7 s, pauses on hover/focus. */
export function Testimonials({ items }: { items: T[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), 7000);
    return () => clearInterval(t);
  }, [paused, items.length]);
  const t = items[i];
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <div className="relative min-h-[16rem] md:min-h-[13rem]">
        <AnimatePresence mode="wait">
          <m.figure key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45 }}>
            <blockquote className="font-display text-3xl leading-[1.15] text-white text-balance md:text-5xl">“{t.quote}”</blockquote>
            <figcaption className="mt-8 flex items-center gap-3 text-white/70">
              <span className="h-px w-8 bg-lime-400" />
              <span className="font-medium text-white">{t.name}</span> · {t.role}
            </figcaption>
          </m.figure>
        </AnimatePresence>
      </div>
      <div className="mt-7 flex gap-2" role="tablist" aria-label="Client stories">
        {items.map((it, n) => (
          <button
            key={it.name}
            role="tab"
            aria-selected={n === i}
            aria-label={`Story from ${it.name}`}
            onClick={() => setI(n)}
            className="group flex h-11 w-14 items-center"
          >
            {/* Thin bar, full-height tap target. */}
            <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <span className={cn("absolute inset-y-0 left-0 rounded-full bg-lime-400 transition-[width] duration-500", n === i ? "w-full" : "w-0 group-hover:w-1/3")} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
