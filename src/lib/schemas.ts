import { z } from "zod";

// Ugandan mobile numbers: 07XXXXXXXX, 7XXXXXXXX or +2567XXXXXXXX (spaces/dashes allowed).
const ugPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+?256|0)?7\d{8}$/.test(v), "Enter a valid Ugandan phone number, e.g. 0772 123 456");

export const productSlugs = ["logbook", "business", "asset-finance", "contract-finance"] as const;

export const applicationSchema = z.object({
  product: z.enum(productSlugs, "Choose a loan type"),
  amount: z.coerce
    .number("Enter an amount")
    .min(2_000_000, "The minimum loan is UGX 2,000,000")
    .max(100_000_000, "The maximum loan is UGX 100,000,000"),
  months: z.coerce.number().int().min(1).max(6),
  purpose: z.string().trim().min(3, "Tell us briefly what the loan is for").max(300),
  fullName: z.string().trim().min(2, "Enter your full name as on your National ID"),
  phone: ugPhone,
  email: z.union([z.literal(""), z.email("Enter a valid email address")]),
  nin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => /^C[MF][A-Z0-9]{12}$/.test(v), "Enter your 14-character NIN, e.g. CM12345678ABCD"),
  district: z.string().trim().min(2, "Enter your district"),
  incomeSource: z.enum(["salary", "business", "both"], "Choose your main source of income"),
  monthlyIncome: z.coerce.number("Enter your monthly income").min(1, "Enter your monthly income"),
  security: z.enum(["logbook", "land-title", "contract", "other"], "Choose the security you will offer"),
  securityDetails: z.string().trim().max(300).optional(),
  consent: z.literal("on", "You must agree before submitting"),
  referral: z.string().trim().max(64).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  phone: z.union([z.literal(""), ugPhone]),
  topic: z.enum(["new-loan", "existing-loan", "partnership", "other"]),
  message: z.string().trim().min(10, "Please add a little more detail").max(2000, "Message cannot exceed 2000 characters"),
});

export const partnerSchema = z.object({
  type: z.enum(["b2b", "p2p"], "Please select whether you are applying as a B2B or P2P agent."),
  fullName: z.string().trim().min(2, "Your name must be at least 2 characters"),
  organisation: z.string().trim().optional(),
  registrationNumber: z.string().trim().optional(),
  email: z.email("Please enter a valid email address"),
  phone: ugPhone,
  whatsapp: ugPhone,
  district: z.string().trim().min(2, "Please enter your district"),
  subCounty: z.string().trim().min(2, "Please enter your sub-county"),
  payout: z.enum(["bank", "mobile-money"], "Please select a payment method."),
  consent: z.literal("on", "You must agree before submitting"),
}).refine((d) => d.type === "p2p" || (d.organisation && d.organisation.length > 1), {
  path: ["organisation"],
  message: "Required for B2B partner registration.",
});

export type FormState = {
  ok: boolean;
  reference?: string;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};
