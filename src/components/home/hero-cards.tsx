"use client";

import * as m from "motion/react-m";
import { ScanFace } from "lucide-react";

/** A small "live product" chip under the hero calculator. Positioned so it never covers text. Decorative. */
export function HeroCards() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 hidden xl:block">
      <m.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0, y: [0, 5, 0] }}
        transition={{ opacity: { delay: 1.5, duration: 0.5 }, x: { delay: 1.5, type: "spring", bounce: 0.3 }, y: { delay: 2.2, duration: 6, repeat: Infinity, ease: "easeInOut" } }}
        className="absolute -right-10 -bottom-6 flex items-center gap-3 rounded-full border border-white/10 bg-forest-900/95 py-2 pr-4 pl-2 text-white shadow-2xl shadow-black/40"
      >
        <span className="grid size-8 place-items-center rounded-full bg-lime-500 text-forest-950">
          <ScanFace className="size-4" />
        </span>
        <span className="text-sm">
          Identity verified <span className="text-white/55">in 6s</span>
        </span>
      </m.div>
    </div>
  );
}
