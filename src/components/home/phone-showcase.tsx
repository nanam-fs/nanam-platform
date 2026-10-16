"use client";

import * as m from "motion/react-m";
import { Smartphone } from "lucide-react";

/** The real customer-portal home, drawn in a phone frame. Decorative illustration of the product. */
export function PhoneShowcase() {
  return (
    <div className="relative mx-auto w-[18.5rem]" aria-hidden>
      <div className="absolute -inset-10 -z-10 rounded-full bg-lime-500/20 blur-3xl" />
      <div className="rounded-[2.6rem] border border-white/15 bg-forest-950 p-2.5 shadow-2xl shadow-black/50">
        <div className="overflow-hidden rounded-[2.1rem] bg-cream text-forest-950">
          <div className="surface-forest px-5 pt-8 pb-14 text-white">
            <p className="text-[11px] text-white/60">My account</p>
            <p className="font-display text-2xl">Hello, Florence</p>
          </div>
          <div className="-mt-9 px-3 pb-5">
            <div className="rounded-2xl bg-white p-4 shadow-lg shadow-forest-950/10">
              <p className="text-[11px] text-muted">Logbook Loan · LN-2610-AB12</p>
              <p className="mt-2 text-[11px] text-muted">Balance remaining</p>
              <p className="font-display text-[1.7rem] leading-tight tabular text-forest-950">UGX 7,043,436</p>
              <div className="mt-3 rounded-xl bg-forest-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-muted">Next payment</p>
                <p className="text-sm font-semibold tabular">UGX 3,521,718 · 6 Nov</p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sand">
                <m.div className="h-full rounded-full bg-lime-500" initial={{ width: "0%" }} whileInView={{ width: "33%" }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.3 }} />
              </div>
              <p className="mt-1.5 text-[10px] text-muted tabular">UGX 3,521,718 repaid · 33%</p>
              <div className="mt-3 flex h-9 items-center justify-center gap-1.5 rounded-full bg-forest-600 text-xs font-medium text-white">
                <Smartphone className="size-3.5" /> Pay with Mobile Money
              </div>
            </div>
          </div>
        </div>
      </div>
      <m.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ delay: 0.9, type: "spring", bounce: 0.35 }}
        className="absolute -top-6 -right-14 w-56 rounded-2xl bg-white p-3 text-ink shadow-2xl shadow-black/30"
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted">SMS · NANAM</p>
        <p className="mt-1 text-xs leading-snug">We received UGX 3,521,718 for loan LN-2610-AB12. Balance remaining: UGX 3,521,718. Thank you, Florence.</p>
      </m.div>
    </div>
  );
}
