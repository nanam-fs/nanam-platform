import type { Metadata } from "next";
import { LoanCalculator } from "@/components/loan-calculator";
import { PageHero } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Loan calculator",
  description: "See your monthly instalment, total interest, processing fee and full repayment schedule before you apply.",
};

export default function CalculatorPage() {
  return (
    <>
      <PageHero
        eyebrow="Loan calculator"
        title={
          <>
            Know the numbers <em className="text-lime-400">before you borrow.</em>
          </>
        }
        body="Pick an amount and a term to see your instalment, total cost and month-by-month schedule."
      />
      <section className="container-page grid gap-12 py-20 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
        <LoanCalculator showSchedule />
        <aside className="space-y-6 text-muted">
          <h2 className="font-display text-3xl text-forest-950">How we calculate</h2>
          <p>
            Interest is {site.pricing.monthlyRate}% per month, the ceiling set for licensed money lenders in Uganda by Legal
            Notice No. 21 of 2024. A one-off processing fee of {site.pricing.processingFee}% of the loan amount is deducted when the loan is paid
            out, so on UGX 10,000,000 you receive UGX 9,800,000 and repay instalments on the full 10,000,000.
          </p>
          <p>
            The calculator shows equal monthly instalments on a reducing-balance basis. The effective annual rate (APR) includes
            the processing fee, so you can compare NANAM fairly with any other lender.
          </p>
          <p>
            Figures are indicative. Your exact offer depends on verification of your income and security, and every amount is
            written into your loan agreement before you sign.
          </p>
        </aside>
      </section>
    </>
  );
}
