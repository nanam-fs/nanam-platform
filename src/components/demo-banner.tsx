import { FlaskConical } from "lucide-react";
import { demoMode } from "@/lib/test-mode";

export const DEMO_GUIDE = "/nanam-platform-guide.pdf";

/** A fixed strip on every page of a demo deployment, so nobody mistakes sample data for the live service. */
export function DemoBanner() {
  if (!demoMode()) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex h-[var(--demo-h)] items-center justify-center gap-2 bg-lime-400 px-4 text-[13px] text-forest-950 print:hidden">
      <FlaskConical className="size-3.5 shrink-0" />
      <p className="truncate">
        <span className="font-semibold">Demo</span>
        <span className="hidden sm:inline"> · sample data, no real SMS, money or ID checks</span>
      </p>
      <a href={DEMO_GUIDE} target="_blank" className="ml-1 shrink-0 font-semibold underline underline-offset-2">
        Read the guide
      </a>
    </div>
  );
}
