export type ProductSlug = "logbook" | "business" | "asset-finance" | "contract-finance";

export type Product = {
  slug: ProductSlug;
  name: string;
  short: string;
  headline: string;
  summary: string;
  bestFor: string[];
  security: string;
  minAmount: number;
  maxAmount: number;
  minMonths: number;
  maxMonths: number;
  requirements: string[];
  highlights: { title: string; body: string }[];
};

const MIN = 2_000_000;
const MAX = 100_000_000;

/** Needed on every application, in addition to each product's own requirements. */
export const generalRequirements = ["Recent utility bill or proof of residence", "Completed loan application"];

export const commonRequirements = [
  "National ID and a recent passport photo",
  "6-month bank or Mobile Money statement",
  ...generalRequirements,
];

export const products: Product[] = [
  {
    slug: "logbook",
    name: "Logbook Loan",
    short: "Borrow against your vehicle and keep driving it.",
    headline: "Your car keeps moving. So does your money.",
    summary:
      "Use your motor vehicle logbook as security and access UGX 2M – 100M while you keep using the vehicle every day.",
    bestFor: ["Salaried professionals", "Vehicle owners", "Urgent personal needs"],
    security: "Motor vehicle logbook",
    minAmount: MIN,
    maxAmount: MAX,
    minMonths: 1,
    maxMonths: 6,
    requirements: [
      "Original motor vehicle logbook",
      "Proof of income — 6-month bank or Mobile Money statement",
      "National ID and passport photo",
    ],
    highlights: [
      { title: "Keep your vehicle", body: "We hold the logbook, not the car. You drive it throughout the loan." },
      { title: "Up to UGX 100M", body: "Your limit is based on the vehicle’s value and your proof of income." },
      { title: "Repay early", body: "Early repayment is allowed. Ask for a settlement figure any time." },
    ],
  },
  {
    slug: "business",
    name: "Business Loan",
    short: "Working capital for stock, payroll and growth.",
    headline: "Working capital, without the waiting room.",
    summary:
      "Fund stock, equipment, payroll or expansion with a short-term business loan secured by land title or motor vehicle.",
    bestFor: ["Retailers & wholesalers", "SMEs with seasonal cash flow", "Registered businesses"],
    security: "Land title or motor vehicle",
    minAmount: MIN,
    maxAmount: MAX,
    minMonths: 1,
    maxMonths: 6,
    requirements: [
      "Trading licence or certificate of incorporation",
      "Proof of income — 6-month bank or Mobile Money statement",
      "National ID and passport photo",
      "Land title or motor vehicle logbook as security",
    ],
    highlights: [
      { title: "Built for SMEs", body: "We look at real cash flow, including Mobile Money, not just bank history." },
      { title: "Flexible security", body: "Pledge a land title or a vehicle, whichever works for your business." },
      { title: "Up to UGX 100M", body: "From UGX 2M for short gaps to UGX 100M for bigger moves, over 1–6 months." },
    ],
  },
  {
    slug: "asset-finance",
    name: "Asset Finance",
    short: "Buy land or a vehicle with 50% down.",
    headline: "Own the asset sooner. Pay the balance over time.",
    summary:
      "Put 50% down on titled land or a motor vehicle and we finance the balance, secured against the asset you are buying.",
    bestFor: ["First-time land buyers", "Vehicle purchases", "Business equipment"],
    security: "Titled land or motor vehicle being purchased",
    minAmount: MIN,
    maxAmount: MAX,
    minMonths: 1,
    maxMonths: 6,
    requirements: [
      "50% down payment on the asset",
      "Sale agreement for the titled land or motor vehicle",
      "Proof of income — 6-month bank or Mobile Money statement",
      "National ID and passport photo",
    ],
    highlights: [
      { title: "Half down, half later", body: "Secure the deal now with 50% down and spread the balance." },
      { title: "Verified before release", body: "The title or logbook is verified before funds are released, which protects you as the buyer too." },
      { title: "Asset-backed", body: "The asset you buy is the security. No extra collateral needed in most cases." },
    ],
  },
  {
    slug: "contract-finance",
    name: "Contract Finance (LPO)",
    short: "Fund confirmed contracts and purchase orders.",
    headline: "Won the contract? Let’s fund the delivery.",
    summary:
      "Turn a confirmed contract or Local Purchase Order into working capital so you can deliver on time and get paid in full.",
    bestFor: ["Government & corporate suppliers", "Contractors", "Distributors"],
    security: "Contract or LPO plus land title or motor vehicle",
    minAmount: MIN,
    maxAmount: MAX,
    minMonths: 1,
    maxMonths: 6,
    requirements: [
      "Copy of the contract or LPO to be financed",
      "Proof of income — 6-month bank or Mobile Money statement",
      "National ID and passport photo",
      "Land title or motor vehicle logbook as additional security",
    ],
    highlights: [
      { title: "Deliver with confidence", body: "Buy materials and pay suppliers upfront so the contract runs on schedule." },
      { title: "Matched to payment terms", body: "Tenure aligned to when your client is due to pay you." },
      { title: "24-hour decisions", body: "Most applications are decided within 24 hours of complete documents." },
    ],
  },
];

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}
