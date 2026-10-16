import { site } from "./site";

export type LoanQuote = {
  principal: number;
  months: number;
  monthlyRate: number;
  monthlyInstalment: number;
  totalInterest: number;
  processingFee: number;
  /** Cash the borrower actually receives: principal less the processing fee. */
  netDisbursed: number;
  /** Sum of all instalments. The fee is deducted upfront, so it is not repaid on top. */
  totalRepayable: number;
  /** Interest plus processing fee. */
  totalCost: number;
  /** Annual percentage rate including the processing fee, as a percentage. */
  apr: number;
  schedule: { month: number; payment: number; interest: number; principal: number; balance: number }[];
};

/**
 * Indicative quote on a reducing-balance (amortising) basis at NANAM's monthly rate,
 * which equals the 2.8%/month ceiling set under Legal Notice No. 21 of 2024.
 * The one-off processing fee is deducted from the amount disbursed. Final terms are set in the loan agreement.
 */
export function quote(principal: number, months: number, monthlyRate = site.pricing.monthlyRate): LoanQuote {
  const r = monthlyRate / 100;
  const instalment = r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months));

  let balance = principal;
  const schedule: LoanQuote["schedule"] = [];
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const towardsPrincipal = instalment - interest;
    balance = Math.max(0, balance - towardsPrincipal);
    schedule.push({ month: m, payment: instalment, interest, principal: towardsPrincipal, balance });
  }

  const totalInterest = instalment * months - principal;
  const processingFee = principal * (site.pricing.processingFee / 100);
  const apr = aprWithFee(principal - processingFee, instalment, months) * 12 * 100;

  return {
    principal,
    months,
    monthlyRate,
    monthlyInstalment: instalment,
    totalInterest,
    processingFee,
    netDisbursed: principal - processingFee,
    totalRepayable: instalment * months,
    totalCost: totalInterest + processingFee,
    apr,
    schedule,
  };
}

/** Solve for the monthly rate where the net amount received equals the PV of instalments. */
function aprWithFee(net: number, instalment: number, months: number) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const pv = (instalment * (1 - Math.pow(1 + mid, -months))) / mid;
    if (pv > net) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
