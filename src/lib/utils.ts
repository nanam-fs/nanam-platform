import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ugx = new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 });

export function formatUGX(value: number) {
  return `UGX ${ugx.format(Math.round(value))}`;
}

/** 2_000_000 → "2M", 2_500_000 → "2.5M" */
export function compactUGX(value: number) {
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${+(value / 1_000).toFixed(0)}K`;
  return `${value}`;
}
