import { faqs } from "../content";
import { commonRequirements, products } from "../products";
import { site } from "../site";
import { compactUGX } from "../utils";

export type Action = { label: string; href: string };
export type Entry = { id: string; title: string; answer: string; keywords: string[]; actions?: Action[] };

const wa = (text: string) => `https://wa.me/${site.whatsapp.wa}?text=${encodeURIComponent(text)}`;
const apply = (slug?: string): Action => ({ label: "Apply online", href: slug ? `/apply?product=${slug}` : "/apply" });

/** Everything the assistant may say. Every answer is sourced from verified NANAM content. */
export const knowledge: Entry[] = [
  ...products.map((p) => ({
    id: `product-${p.slug}`,
    title: p.name,
    answer: `${p.summary} Amounts UGX ${compactUGX(p.minAmount)}–${compactUGX(p.maxAmount)} over ${p.minMonths}–${p.maxMonths} months at ${site.pricing.monthlyRate}% per month. Security: ${p.security}.`,
    keywords: [p.name, p.short, p.security, ...p.bestFor, p.slug.replace("-", " ")],
    actions: [{ label: `About ${p.name}`, href: `/loans/${p.slug}` }, apply(p.slug)],
  })),
  ...products.map((p) => ({
    id: `requirements-${p.slug}`,
    title: `${p.name}: what you need`,
    answer: `For a ${p.name}: ${p.requirements.join("; ")}. Every application also needs: ${commonRequirements.slice(2).join("; ").toLowerCase()}.`,
    keywords: ["requirements", "documents", "need", "bring", "papers", p.name, p.security],
    actions: [apply(p.slug)],
  })),
  ...faqs.map((f, i) => ({ id: `faq-${i}`, title: f.q, answer: f.a, keywords: [f.q, f.group] })),
  {
    id: "collateral",
    title: "What you can borrow against",
    answer: "We accept a motor vehicle logbook or a land title as security. With a logbook loan you keep driving your car; with land we hold the title. Contract Finance combines a confirmed contract or LPO with a logbook or land title. Your limit depends on the value of the security and your income.",
    keywords: ["collateral", "security", "against", "land title", "logbook", "property", "plot", "car", "pledge", "use as security", "keep my car"],
    actions: [{ label: "Logbook loans", href: "/loans/logbook" }, { label: "Business loans", href: "/loans/business" }],
  },
  {
    id: "rates",
    title: "Interest and fees",
    answer: `Interest is ${site.pricing.monthlyRate}% per month on the reducing balance, the legal maximum for licensed money lenders in Uganda. There’s a one-off ${site.pricing.processingFee}% processing fee, deducted when the loan is paid out. No hidden fees.`,
    keywords: ["interest", "rate", "percent", "fee", "charges", "cost", "expensive", "hidden", "apr"],
    actions: [{ label: "Open the calculator", href: "/calculator" }, { label: "Key loan facts", href: "/legal/loan-terms" }],
  },
  {
    id: "apply",
    title: "How to apply",
    answer: "Apply online in about five minutes: choose your loan, enter your details, confirm your phone with an SMS code, then verify your identity with your National ID and a selfie. Most decisions come within 24 hours. You can also apply at our Namugongo office.",
    keywords: ["apply", "application", "start", "register", "sign up", "how do i get", "process", "steps"],
    actions: [apply()],
  },
  {
    id: "speed",
    title: "How fast is it",
    answer: "Most loans are decided within 24 hours of receiving your documents and checking your collateral. Funds are released once you sign your loan agreement.",
    keywords: ["fast", "quick", "how long", "when", "today", "24 hours", "urgent", "time", "days"],
  },
  {
    id: "identity",
    title: "Identity check",
    answer: "After applying you take photos of your National ID (front and back) and a short selfie. On a computer, scan the QR code to continue on your phone. Most checks finish in seconds. Your photos are stored privately and only used to confirm it’s you.",
    keywords: ["identity", "verify", "verification", "selfie", "qr", "national id", "kyc", "photo", "camera"],
    actions: [{ label: "Privacy policy", href: "/legal/privacy" }],
  },
  {
    id: "repay",
    title: "Repaying your loan",
    answer: "Sign in to the customer portal with your phone number, then pay with MTN MoMo or Airtel Money. You’ll get a prompt on your phone to approve with your PIN, and an SMS receipt with your new balance.",
    keywords: ["repay", "pay", "payment", "momo", "mtn", "airtel", "mobile money", "instalment", "installment", "balance"],
    actions: [{ label: "Customer portal", href: "/portal" }],
  },
  {
    id: "early",
    title: "Paying off early",
    answer: "You can repay early at any time. When you settle early we don’t charge interest for future months, and the portal shows your exact payoff figure for today.",
    keywords: ["early", "settle", "pay off", "payoff", "clear", "finish", "close loan"],
    actions: [{ label: "Customer portal", href: "/portal" }],
  },
  {
    id: "status",
    title: "Checking your application",
    answer: "Sign in to the customer portal with the phone number on your application to see its progress and upload any missing documents.",
    keywords: ["status", "track", "progress", "my application", "approved", "pending", "update"],
    actions: [{ label: "Customer portal", href: "/portal" }],
  },
  {
    id: "partners",
    title: "Becoming an agent",
    answer: "Agent banking outlets, SACCOs, MoMo agents, forex bureaus, employers and individual referrers can join the NANAM Partner Network and earn commission on every funded referral, paid to bank or Mobile Money.",
    keywords: ["agent", "partner", "refer", "referral", "commission", "earn", "sacco", "business partner"],
    actions: [{ label: "Become a partner", href: "/partners" }],
  },
  {
    id: "location",
    title: "Where we are",
    answer: `Visit us at ${site.address.lines.join(", ")}.`,
    keywords: ["where", "office", "location", "address", "visit", "branch", "namugongo", "directions", "find you"],
    actions: [{ label: "Get directions", href: site.address.mapUrl }],
  },
  {
    id: "contact",
    title: "Talk to a person",
    answer: `Call ${site.phones.join(" or ")}, WhatsApp ${site.whatsapp.display}, or email ${site.email}.`,
    keywords: ["contact", "call", "phone", "number", "email", "talk", "human", "person", "agent", "customer care", "help", "whatsapp"],
    actions: [{ label: "Chat on WhatsApp", href: wa("Hello NANAM, I have a question.") }],
  },
  {
    id: "complaints",
    title: "Making a complaint",
    answer: "We’re sorry something went wrong. You can complain by phone, email or at our office; we’ll acknowledge it and explain our decision in writing. Unresolved complaints can be escalated to UMRA.",
    keywords: ["complain", "complaint", "unhappy", "problem", "wrong", "dispute", "bad service"],
    actions: [{ label: "Complaints procedure", href: "/legal/complaints" }],
  },
  {
    id: "fraud",
    title: "Staying safe",
    answer: "NANAM will never ask for your Mobile Money PIN or a one-time code, or ask you to pay a fee to release a loan. If anyone does, it’s a scam. Call us before paying anything.",
    keywords: ["scam", "fraud", "fake", "pin", "otp", "code", "suspicious", "someone called", "release fee"],
    actions: [{ label: "Fraud & security", href: "/legal/security" }],
  },
  {
    id: "regulated",
    title: "Is NANAM licensed?",
    answer: `Yes. ${site.name} is licensed by the ${site.regulator.name} (${site.regulator.short}) under the ${site.regulator.act}.`,
    keywords: ["licensed", "legit", "legal", "regulated", "umra", "genuine", "trust", "real company"],
  },
];

/** Everyday words and common Luganda terms mapped to the vocabulary above. */
export const synonyms: Record<string, string> = {
  sente: "money loan",
  looni: "loan",
  mmotoka: "car vehicle logbook",
  emmotoka: "car vehicle logbook",
  motoka: "car vehicle logbook",
  ettaka: "land title",
  taka: "land title",
  boda: "vehicle logbook",
  car: "vehicle logbook",
  vehicle: "logbook",
  motorcycle: "vehicle logbook",
  plot: "land title",
  land: "land title",
  shop: "business",
  trader: "business",
  stock: "business",
  tender: "contract lpo",
  lpo: "contract",
  supply: "contract",
  installment: "instalment",
  mtn: "momo",
  airtel: "momo",
  borrow: "loan apply",
  much: "amount",
  maximum: "amount",
  minimum: "amount",
  kwewola: "loan",
  webale: "thanks",
};

export const whatsappHandoff = (q: string) => wa(`Hello NANAM, I have a question: ${q.slice(0, 200)}`);
