"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowRight, Info } from "lucide-react";
import { quote } from "@/lib/loan-math";
import { products, type ProductSlug } from "@/lib/products";
import { site } from "@/lib/site";
import { cn, compactUGX, formatUGX } from "@/lib/utils";

const MIN = 2_000_000;
const MAX = 100_000_000;
const STEP = 500_000;

export function LoanCalculator({
  variant = "card",
  defaultProduct = "logbook",
  showSchedule = false,
}: {
  variant?: "card" | "glass";
  defaultProduct?: ProductSlug;
  showSchedule?: boolean;
}) {
  const id = useId();
  const [product, setProduct] = useState<ProductSlug>(defaultProduct);
  const [amount, setAmount] = useState(10_000_000);
  const [months, setMonths] = useState(3);
  const q = useMemo(() => quote(amount, months), [amount, months]);

  const glass = variant === "glass";
  const pct = ((amount - MIN) / (MAX - MIN)) * 100;
  const applyHref = `/apply?product=${product}&amount=${amount}&months=${months}`;

  return (
    <div
      className={cn(
        "rounded-3xl p-6 md:p-8",
        glass
          ? "border border-white/15 bg-white/[0.07] text-white shadow-2xl shadow-black/30 backdrop-blur-xl"
          : "border border-line bg-white text-ink shadow-xl shadow-forest-950/5",
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <p className={cn("text-sm font-medium", glass ? "text-white/70" : "text-muted")}>Estimate your loan</p>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium",
            glass ? "bg-lime-500/15 text-lime-300" : "bg-forest-50 text-forest-700",
          )}
        >
          {site.pricing.monthlyRate}% / month
        </span>
      </div>

      <div role="radiogroup" aria-label="Loan type" className="mt-5 grid grid-cols-2 gap-2">
        {products.map((p) => (
          <button
            key={p.slug}
            type="button"
            role="radio"
            aria-checked={product === p.slug}
            onClick={() => setProduct(p.slug)}
            className={cn(
              "rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
              product === p.slug
                ? glass
                  ? "bg-white text-forest-950"
                  : "bg-forest-600 text-white"
                : glass
                  ? "bg-white/5 text-white/80 hover:bg-white/10"
                  : "bg-cream text-ink/80 hover:bg-sand",
            )}
          >
            {p.name.replace(" (LPO)", "")}
          </button>
        ))}
      </div>

      <div className="mt-7">
        <div className="flex items-baseline justify-between">
          <label htmlFor={`${id}-amount`} className={cn("text-sm", glass ? "text-white/70" : "text-muted")}>
            I need
          </label>
          <output htmlFor={`${id}-amount`} className="font-display text-3xl tabular md:text-4xl">
            {formatUGX(amount)}
          </output>
        </div>
        <input
          id={`${id}-amount`}
          type="range"
          min={MIN}
          max={MAX}
          step={STEP}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="range mt-4 w-full"
          style={{ ["--pct" as string]: `${pct}%` }}
        />
        <div className={cn("mt-2 flex justify-between text-xs", glass ? "text-white/50" : "text-muted")}>
          <span>UGX {compactUGX(MIN)}</span>
          <span>UGX {compactUGX(MAX)}</span>
        </div>
      </div>

      <div className="mt-6">
        <p className={cn("text-sm", glass ? "text-white/70" : "text-muted")} id={`${id}-months`}>
          Repay over
        </p>
        <div role="radiogroup" aria-labelledby={`${id}-months`} className="mt-3 grid grid-cols-6 gap-1.5">
          {[1, 2, 3, 4, 5, 6].map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={months === m}
              aria-label={`${m} month${m > 1 ? "s" : ""}`}
              onClick={() => setMonths(m)}
              className={cn(
                "h-11 rounded-xl text-sm font-medium tabular transition-colors",
                months === m
                  ? "bg-lime-500 text-forest-950"
                  : glass
                    ? "bg-white/5 text-white/80 hover:bg-white/10"
                    : "bg-cream text-ink/80 hover:bg-sand",
              )}
            >
              {m}
              <span className="text-xs font-normal opacity-70">mo</span>
            </button>
          ))}
        </div>
      </div>

      <dl className={cn("mt-7 space-y-3 border-t pt-6 text-sm", glass ? "border-white/10" : "border-line")}>
        <div className="flex items-end justify-between">
          <dt className={glass ? "text-white/70" : "text-muted"}>Monthly instalment</dt>
          <dd className="font-display text-3xl tabular text-lime-500 md:text-[2rem]">{formatUGX(q.monthlyInstalment)}</dd>
        </div>
        <Row glass={glass} label={`Processing fee (${site.pricing.processingFee}%, deducted)`} value={`− ${formatUGX(q.processingFee)}`} />
        <Row glass={glass} label="You receive" value={formatUGX(q.netDisbursed)} />
        <Row glass={glass} label="Total interest" value={formatUGX(q.totalInterest)} />
        <Row glass={glass} label="Total you’ll repay" value={formatUGX(q.totalRepayable)} strong />
      </dl>

      <Link
        href={applyHref}
        className={cn(
          "mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors",
          glass ? "bg-lime-500 text-forest-950 hover:bg-lime-400" : "bg-forest-600 text-white hover:bg-forest-700",
        )}
      >
        Apply for {formatUGX(amount)} <ArrowRight className="size-4" />
      </Link>
      <p className={cn("mt-4 flex gap-2 text-xs leading-relaxed", glass ? "text-white/50" : "text-muted")}>
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Indicative figures on a reducing-balance basis. Your final offer depends on verification and is set out in full in
        your loan agreement before you sign.
      </p>

      {showSchedule && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm tabular">
            <caption className="mb-3 text-left font-medium">Repayment schedule</caption>
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">Month</th>
                <th className="py-2 text-right font-medium">Instalment</th>
                <th className="py-2 text-right font-medium">Interest</th>
                <th className="py-2 text-right font-medium">Principal</th>
                <th className="py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {q.schedule.map((r) => (
                <tr key={r.month} className="border-b border-line/60">
                  <td className="py-2.5">{r.month}</td>
                  <td className="py-2.5 text-right">{formatUGX(r.payment)}</td>
                  <td className="py-2.5 text-right text-muted">{formatUGX(r.interest)}</td>
                  <td className="py-2.5 text-right text-muted">{formatUGX(r.principal)}</td>
                  <td className="py-2.5 text-right">{formatUGX(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted">
            Effective annual rate including the processing fee: <strong className="text-ink">{q.apr.toFixed(1)}% APR</strong>.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong, glass }: { label: string; value: string; strong?: boolean; glass: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={glass ? "text-white/60" : "text-muted"}>{label}</dt>
      <dd className={cn("tabular whitespace-nowrap", strong && "font-semibold")}>{value}</dd>
    </div>
  );
}
