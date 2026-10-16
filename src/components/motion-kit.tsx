"use client";

import { animate, useInView, useMotionValue, useReducedMotion, useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts content into place the first time it scrolls into view. */
export function Reveal({ children, delay = 0, className, y = 18 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, delay, ease }}
    >
      {children}
    </m.div>
  );
}

/** Staggers direct children (each wrapped in <RevealItem>). */
export function RevealGroup({ children, className, stagger = 0.08 }: { children: ReactNode; className?: string; stagger?: number }) {
  return (
    <m.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </m.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div className={className} variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}>
      {children}
    </m.div>
  );
}

/** Counts up to `value` once in view. Renders the final value without motion when reduced motion is on. */
export function Counter({ value, decimals = 0, className }: { value: number; decimals?: number; className?: string }) {
  const format = (n: number) => n.toLocaleString("en-UG", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      el.textContent = format(value);
      return;
    }
    if (!inView) return;
    const unsub = mv.on("change", (v) => (el.textContent = format(v)));
    const c = animate(mv, value, { duration: 1.4, ease });
    return () => {
      c.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, decimals, mv, reduce]);
  return (
    <span ref={ref} className={cn("tabular", className)}>
      {format(reduce ? value : 0)}
    </span>
  );
}

/** A photo that drifts slightly slower than the page while scrolling. */
export function ParallaxImage({ src, alt, position, className, priority, sizes = "100vw" }: { src: string; alt: string; position?: string; className?: string; priority?: boolean; sizes?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-6%", "6%"]);
  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <m.div style={{ y }} className="absolute -inset-y-[8%] inset-x-0">
        <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" style={{ objectPosition: position }} />
      </m.div>
    </div>
  );
}

/** Seamless horizontal strip; pauses on hover and stops under reduced motion. */
export function Marquee({ items, className }: { items: ReactNode[]; className?: string }) {
  const row = (aria: boolean) => (
    <ul aria-hidden={aria || undefined} className="flex shrink-0 items-center gap-12 pr-12">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-12 whitespace-nowrap">
          {it}
          <span aria-hidden className="size-1.5 rounded-full bg-lime-500/70" />
        </li>
      ))}
    </ul>
  );
  return (
    <div className={cn("group flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]", className)}>
      <div className="flex animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

/** Vertical progress line driven by scroll position through `target`. */
export function ScrollLine({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  return (
    <div ref={ref} className={cn("absolute top-0 bottom-0 w-px bg-line", className)} aria-hidden>
      <m.div style={{ scaleY: scrollYProgress, originY: 0 }} className="absolute inset-0 bg-lime-500" />
    </div>
  );
}
