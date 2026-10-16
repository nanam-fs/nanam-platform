import { site } from "./site";

export const faqs: { q: string; a: string; group: "Getting started" | "Cost & repayment" | "Security & trust" }[] = [
  {
    group: "Getting started",
    q: "How fast can I get the money?",
    a: "Most loans are decided within 24 hours of receiving your documents and verifying your collateral. Funds are released once you sign your loan agreement.",
  },
  {
    group: "Getting started",
    q: "How much can I borrow, and for how long?",
    a: "All NANAM loans range from UGX 2,000,000 to UGX 100,000,000 over 1 to 6 months. Your limit depends on your income and the value of your security. Asset Finance requires at least a 50% down payment.",
  },
  {
    group: "Getting started",
    q: "What documents do I need?",
    a: "Your National ID, a passport photo, a 6-month bank or Mobile Money statement, proof of residence and your collateral documents. Contract Finance also needs a copy of the contract or LPO, and Business Loans need a trading licence or certificate of incorporation.",
  },
  {
    group: "Getting started",
    q: "Do you accept salaried and business income?",
    a: "Yes. We verify your income source, whether it is a salary, business revenue or Mobile Money flows. Business loans require proof of business operations.",
  },
  {
    group: "Security & trust",
    q: "What can I use as collateral?",
    a: "We accept motor vehicle logbooks and land titles. Contract Finance combines a confirmed contract or LPO with a vehicle or land title.",
  },
  {
    group: "Security & trust",
    q: "Is NANAM regulated?",
    a: `Yes. ${site.name} is licensed by the ${site.regulator.name} (${site.regulator.short}) and operates under the ${site.regulator.act}.`,
  },
  {
    group: "Security & trust",
    q: "Do I keep using my car during a logbook loan?",
    a: "Yes. We hold the logbook as security, and you keep the vehicle and use it as normal throughout the loan.",
  },
  {
    group: "Cost & repayment",
    q: "What does a loan cost?",
    a: `Interest is ${site.pricing.monthlyRate}% per month, which is the maximum rate allowed for licensed money lenders in Uganda. A one-off ${site.pricing.processingFee}% processing fee is deducted from the amount paid out. Use our calculator to see your full cost before you apply.`,
  },
  {
    group: "Cost & repayment",
    q: "Are there hidden fees?",
    a: `No. The only charges are the monthly interest and the one-off ${site.pricing.processingFee}% processing fee. Both are written into your loan agreement before you sign.`,
  },
  {
    group: "Cost & repayment",
    q: "Can I repay early?",
    a: "Yes, early repayment is allowed. Speak to your loan officer for a settlement figure.",
  },
];

export const testimonials = [
  { name: "Sarah", role: "SME owner", quote: "NANAM cleared my contract financing in a day. Professional, clear, and fair." },
  { name: "Daniel", role: "Contractor", quote: "I pledged my logbook and got the funds to finish a project. Smooth process." },
  { name: "Aisha", role: "Retailer", quote: "Transparent rates and friendly team. The 24-hour turnaround is real." },
];

export const values = [
  { title: "Integrity", body: "We embrace honesty, fairness and openness in everything we do." },
  { title: "Professionalism", body: "We focus on staff competence and adherence to ethical principles." },
  { title: "Reliability", body: "We emphasise consistency and timeliness." },
  { title: "Teamwork", body: "Together, with our skills, knowledge and experience, we achieve more." },
  { title: "Results", body: "We work with urgency, vigour and commitment, because time wasted is lost." },
];

export const steps = [
  { title: "Apply in minutes", body: "Fill in a short form online, or visit our Namugongo office. No queues." },
  { title: "We verify, fast", body: "A loan officer reviews your documents and collateral. Most decisions within 24 hours." },
  { title: "Sign and receive", body: "Sign a clear agreement showing every shilling, then receive your funds." },
];
