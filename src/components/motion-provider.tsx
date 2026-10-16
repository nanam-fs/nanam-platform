"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * App-wide Motion setup: the small `m` + LazyMotion bundle (~5 kB + features), a calm default
 * spring, and the visitor's reduced-motion preference respected everywhere.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ type: "spring", visualDuration: 0.45, bounce: 0.15 }}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
