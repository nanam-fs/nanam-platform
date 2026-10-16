"use client";

import * as m from "motion/react-m";
import type { Variants } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Hand-built NANAM icons. Each icon follows its parent's variant:
 *   "hidden" – before it scrolls into view
 *   "enter"  – draws itself in and rests there
 *   "hover"  – a short flourish, then back to "enter" (already drawn, so nothing replays)
 * Wrap the owning card with <IconStage> (or any m.* element using initial="hidden" whileInView="enter" whileHover="hover").
 */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const draw = (delay = 0): Variants => ({
  hidden: { pathLength: 0, opacity: 0 },
  enter: { pathLength: 1, opacity: 1, transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] } },
  hover: { pathLength: [0.2, 1], transition: { duration: 0.6, delay: delay / 2, ease: [0.22, 1, 0.36, 1] } },
});
const accent = "text-lime-500";

function Svg({ className, children, label }: { className?: string; children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label={label} className={cn("size-8", className)}>
      {children}
    </svg>
  );
}

export function CarIcon({ className }: { className?: string }) {
  const wheel: Variants = { hidden: { rotate: -180 }, enter: { rotate: 0, transition: { duration: 0.9 } }, hover: { rotate: [0, 360], transition: { duration: 0.6 } } };
  return (
    <Svg className={className} label="Vehicle">
      <m.path {...stroke} variants={draw()} d="M4 20v-3.2c0-.8.5-1.5 1.2-1.8L8 14l2.6-4.2c.4-.6 1-1 1.8-1h7.2c.7 0 1.3.3 1.7.9L24 14l3 1.1c.6.3 1 .9 1 1.6V20c0 .6-.4 1-1 1h-1.5" />
      <m.path {...stroke} variants={draw(0.2)} d="M10.5 21h11M5 21h1.5M8 14h16M15.5 9v5" />
      {[8.5, 23.5].map((cx) => (
        <m.g key={cx} variants={wheel} style={{ originX: `${cx}px`, originY: "21px", transformBox: "view-box" }}>
          <circle {...stroke} cx={cx} cy={21} r={2.6} />
          <path {...stroke} d={`M${cx} 19.2v1.2`} className={accent} />
        </m.g>
      ))}
      <m.path {...stroke} className={accent} variants={{ hidden: { x: -6, opacity: 0 }, enter: { x: 0, opacity: 0.8, transition: { delay: 0.5 } }, hover: { x: [0, -3, 0], transition: { duration: 0.5 } } }} d="M3 26h7m4 0h4m4 0h7" />
    </Svg>
  );
}

export function ShopIcon({ className }: { className?: string }) {
  const coin: Variants = { hidden: { y: -10, opacity: 0 }, enter: { y: 0, opacity: 1, transition: { delay: 0.6, type: "spring", bounce: 0.5 } }, hover: { y: [0, -6, 0], transition: { duration: 0.5 } } };
  return (
    <Svg className={className} label="Business">
      <m.path {...stroke} variants={draw()} d="M6 14v13h20V14" />
      {[0, 1, 2, 3].map((i) => (
        <m.path
          key={i}
          {...stroke}
          variants={{ hidden: { y: -6, opacity: 0 }, enter: { y: 0, opacity: 1, transition: { delay: 0.15 + i * 0.08 } }, hover: { y: [0, -1.5, 0], transition: { delay: i * 0.05, duration: 0.35 } } }}
          d={`M${4 + i * 6} 9h6l-.5 3.5a2.8 2.8 0 0 1-5.6 0L${4 + i * 6} 9Z`}
        />
      ))}
      <m.path {...stroke} variants={draw(0.3)} d="M4.5 9 7 5h18l2.5 4" />
      <m.path {...stroke} variants={draw(0.4)} d="M13 27v-6h6v6" />
      <m.circle {...stroke} className={accent} cx={22.5} cy={19.5} r={2} variants={coin} />
    </Svg>
  );
}

export function LandIcon({ className }: { className?: string }) {
  const pin: Variants = { hidden: { y: -12, scale: 0.6 }, enter: { y: 0, scale: 1, transition: { delay: 0.55, type: "spring", bounce: 0.55 } }, hover: { y: [0, -4, 0], transition: { duration: 0.45 } } };
  return (
    <Svg className={className} label="Land">
      <m.path {...stroke} strokeDasharray="2.5 2" variants={draw()} d="M3 22.5 11 19l8 2.5 10-3.5v7.5l-10 3.5-8-2.5-8 3.5Z" />
      <m.path {...stroke} variants={draw(0.25)} d="M11 19v7.5m8-5v7.5" />
      <m.g variants={pin} className={accent}>
        <path {...stroke} d="M16 16s-5-4.6-5-8.4a5 5 0 0 1 10 0C21 11.4 16 16 16 16Z" />
        <circle {...stroke} cx={16} cy={7.6} r={1.7} />
      </m.g>
    </Svg>
  );
}

export function ContractIcon({ className }: { className?: string }) {
  return (
    <Svg className={className} label="Contract">
      <m.path {...stroke} variants={draw()} d="M8 4h11l5 5v19H8Z" />
      <m.path {...stroke} variants={draw(0.1)} d="M19 4v5h5" />
      {[13, 17, 21].map((y, i) => (
        <m.path key={y} {...stroke} variants={draw(0.3 + i * 0.12)} d={`M11.5 ${y}h${i === 2 ? 5 : 9}`} />
      ))}
      <m.path
        {...stroke}
        strokeWidth={2}
        className={accent}
        variants={{ hidden: { pathLength: 0 }, enter: { pathLength: 1, transition: { delay: 0.75, duration: 0.4 } }, hover: { pathLength: [0, 1], transition: { duration: 0.35 } } }}
        d="m18.5 23 2 2 4-4.5"
      />
    </Svg>
  );
}

export function PhoneMoneyIcon({ className }: { className?: string }) {
  const arc = (i: number): Variants => ({
    hidden: { opacity: 0, scale: 0.6 },
    enter: { opacity: 1, scale: 1, transition: { delay: 0.4 + i * 0.15 } },
    hover: { opacity: [1, 0.2, 1], transition: { delay: i * 0.12, duration: 0.6 } },
  });
  return (
    <Svg className={className} label="Mobile Money">
      <m.rect {...stroke} variants={draw()} x={7} y={4} width={13} height={24} rx={2.5} />
      <m.path {...stroke} variants={draw(0.2)} d="M12 24.5h3" />
      <m.circle {...stroke} className={accent} variants={draw(0.3)} cx={13.5} cy={14} r={3} />
      {[0, 1].map((i) => (
        <m.path key={i} {...stroke} className={accent} variants={arc(i)} style={{ originX: "21px", originY: "14px" }} d={i ? "M25.5 8.5a8 8 0 0 1 0 11" : "M23 11a4.4 4.4 0 0 1 0 6"} />
      ))}
    </Svg>
  );
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <Svg className={className} label="24 hours">
      <m.circle {...stroke} variants={draw()} cx={16} cy={16} r={11} />
      <m.g
        className={accent}
        style={{ originX: "16px", originY: "16px" }}
        variants={{ hidden: { rotate: -360 }, enter: { rotate: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } }, hover: { rotate: [0, 360], transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } } }}
      >
        <path {...stroke} strokeWidth={2} d="M16 16V9" />
      </m.g>
      <path {...stroke} d="M16 16l4 2.5" />
      <circle cx={16} cy={16} r={1.2} fill="currentColor" />
    </Svg>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <Svg className={className} label="Regulated">
      <m.path {...stroke} variants={draw()} d="M16 3.5 26 7v8c0 6.2-4.2 11.2-10 13.5C10.2 26.2 6 21.2 6 15V7Z" />
      <m.path
        {...stroke}
        strokeWidth={2.2}
        className={accent}
        variants={{ hidden: { pathLength: 0 }, enter: { pathLength: 1, transition: { delay: 0.6, duration: 0.45 } }, hover: { pathLength: [0, 1], transition: { duration: 0.4 } } }}
        d="m11.5 15.5 3 3 6-6.5"
      />
    </Svg>
  );
}

export function IdScanIcon({ className }: { className?: string }) {
  return (
    <Svg className={className} label="Identity check">
      <m.rect {...stroke} variants={draw()} x={4} y={8} width={24} height={16} rx={2.5} />
      <m.circle {...stroke} variants={draw(0.2)} cx={11} cy={15} r={2.5} />
      <m.path {...stroke} variants={draw(0.3)} d="M7.5 20.5c.7-1.6 2-2.4 3.5-2.4s2.8.8 3.5 2.4M18 13h6.5M18 17h4.5" />
      <m.path
        {...stroke}
        className={accent}
        strokeWidth={2}
        variants={{ hidden: { y: -6, opacity: 0 }, enter: { y: [-6, 10, 0], opacity: [0, 1, 0], transition: { duration: 1.1, delay: 0.3 } }, hover: { y: [-6, 10], opacity: [1, 0], transition: { duration: 0.7 } } }}
        d="M2.5 16h27"
      />
    </Svg>
  );
}

/** A card or tile that plays its icons when it scrolls into view and on hover. */
export function IconStage({ className, children, as = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "li" | "article" }) {
  const C = as === "li" ? m.li : as === "article" ? m.article : m.div;
  return (
    <C className={className} initial="hidden" whileInView="enter" whileHover="hover" viewport={{ once: true, amount: 0.4 }}>
      {children}
    </C>
  );
}
