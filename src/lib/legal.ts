import { site } from "./site";

/**
 * Customer-facing policies for operating digitally in Uganda.
 * DRAFTS: prepared for review by NANAM's legal counsel before launch. Items in [brackets] must be
 * completed with NANAM's own details (e.g. registration numbers) — never guessed.
 */
export const LEGAL_IS_DRAFT = true;
export const LEGAL_UPDATED = "16 October 2026";

type Block = { h: string; p?: string[]; list?: string[] };
export type LegalDoc = { slug: string; title: string; summary: string; sections: Block[] };

const company = `${site.name} (“NANAM”, “we”, “us”)`;
const contact = `${site.email}, ${site.phones.join(" / ")}, or ${site.address.lines.join(", ")}`;

export const legalDocs: LegalDoc[] = [
  {
    slug: "privacy",
    title: "Privacy Policy",
    summary: "What personal data we collect, why, who we share it with, and your rights under Uganda’s Data Protection and Privacy Act, 2019.",
    sections: [
      { h: "Who we are", p: [`${company} is a money lender licensed by the ${site.regulator.name} under the ${site.regulator.act}. We are the data controller for the personal data described here. Registration with the Personal Data Protection Office: [registration number].`] },
      {
        h: "What we collect",
        list: [
          "Identity: full name, National Identification Number (NIN), photos of your National ID and a selfie for identity verification.",
          "Contact: phone number, email address, district.",
          "Financial: income source and amount, bank or Mobile Money statements, loan and repayment history.",
          "Security: details of collateral such as vehicle logbooks, land titles and contracts.",
          "Technical: device and browser information and session cookies needed to keep you signed in.",
        ],
      },
      {
        h: "Why we use it",
        list: [
          "To assess and decide your loan application, including affordability and collateral checks.",
          "To verify your identity and prevent fraud. Biometric data (your selfie) is special personal data; we process it only with your consent and only for this purpose.",
          "To manage your loan: disbursement, repayment reminders, receipts and statements.",
          "To meet our legal and regulatory obligations, including record keeping and reporting to regulators.",
        ],
      },
      {
        h: "Who we share it with",
        list: [
          "Identity verification partners (e.g. Smile ID) to check your ID and selfie.",
          "Mobile Money and payment providers (MTN MoMo, Airtel Money) and banks to send and collect payments.",
          "SMS and email providers to send you codes, reminders and receipts.",
          "Credit reference bureaus and regulators, where the law requires or allows.",
          "Our professional advisers and, if you default, lawful debt recovery agents.",
        ],
        p: ["We never sell your personal data. Some partners may process data outside Uganda; where they do, we require adequate protection as the Act requires."],
      },
      { h: "How long we keep it", p: ["We keep loan records for the period required by law and regulation after your loan closes [retention period to be confirmed]. Identity verification photos are kept only as long as needed to evidence the check. Liveness video frames are not stored by NANAM."] },
      { h: "How we protect it", p: ["Data is encrypted in transit. Documents are stored privately and are only visible to authorised NANAM staff, and every staff view is logged. Staff access is limited by role."] },
      {
        h: "Your rights",
        list: [
          "Access the personal data we hold about you.",
          "Ask us to correct inaccurate data.",
          "Object to processing or withdraw consent (this may stop us processing an application).",
          "Ask us to delete data we no longer need to keep by law.",
          "Complain to the Personal Data Protection Office if you are unhappy with how we handle your data.",
        ],
        p: [`To make a request, contact us at ${contact}. We may need to verify your identity first.`],
      },
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    summary: "The terms for using nanam.ug, the customer portal and online payments.",
    sections: [
      { h: "About these terms", p: [`These terms apply when you use nanam.ug, apply for a loan online, use the customer portal or pay through it. Your loan itself is governed by the loan agreement you sign, which takes priority over these terms.`] },
      { h: "Applying online", list: ["You must be 18 or older and apply in your own name with accurate information.", "Submitting an application is not a loan offer. Every loan is subject to verification, assessment and a signed agreement.", "You must confirm your phone number and may be asked to verify your identity with your National ID and a selfie."] },
      { h: "Your portal account", list: ["You sign in with a one-time code sent to your registered phone number. Keep your phone secure and never share codes.", "If you change your number, tell us. We will verify your identity before moving your account.", "We may suspend access if we suspect fraud or misuse."] },
      { h: "Payments", list: ["Mobile Money payments are processed by MTN MoMo or Airtel Money. A payment counts once the provider confirms it.", "If you pay more than you owe, we will refund the difference.", "Network fees charged by your provider are your responsibility unless stated otherwise."] },
      { h: "Information on this website", p: ["Calculator results are estimates. The binding figures are those in your loan agreement. Interest is charged at no more than the legal maximum for licensed money lenders."] },
      { h: "Liability", p: ["We take reasonable care to keep the website and portal available and accurate, but do not guarantee uninterrupted access. Nothing in these terms limits your rights under Ugandan consumer protection law."] },
      { h: "Governing law", p: ["These terms are governed by the laws of the Republic of Uganda."] },
    ],
  },
  {
    slug: "loan-terms",
    title: "Key Loan Facts",
    summary: "The essential cost and conditions of every NANAM loan, in plain language.",
    sections: [
      { h: "Cost of borrowing", list: [`Interest: ${site.pricing.monthlyRate}% per month on the reducing balance, which is the maximum rate permitted for licensed money lenders in Uganda (Legal Notice No. 21 of 2024).`, `Processing fee: ${site.pricing.processingFee}% of the loan amount, deducted when the loan is paid out.`, "No other fees are charged without being written into your loan agreement."] },
      { h: "Amounts and terms", list: ["Loans from UGX 2,000,000 to UGX 100,000,000.", "Repayment periods from 1 to 6 months, in equal monthly instalments.", "Every loan is secured by collateral such as a vehicle logbook or land title."] },
      { h: "Early repayment", p: ["You may repay early at any time. Future interest beyond the current period is not charged when you settle early."] },
      { h: "If you miss a payment", p: ["We will remind you by SMS and call you to agree a way forward. Please contact us early if you are struggling. Collateral is only enforced in line with your loan agreement and the law."] },
      { h: "Your collateral", p: ["Original documents are held securely and released to you once your loan is fully repaid."] },
    ],
  },
  {
    slug: "complaints",
    title: "Complaints Procedure",
    summary: "How to raise a complaint, how quickly we respond, and how to escalate it.",
    sections: [
      { h: "How to complain", p: [`Contact us at ${contact}, or visit our office. Tell us your name, phone number, loan or application reference, and what went wrong.`] },
      { h: "What happens next", list: ["We acknowledge your complaint within 2 working days [confirm].", "We aim to resolve it within 14 days [confirm] and will explain our decision in writing.", "A complaint never affects how fairly we treat your application or loan."] },
      { h: "If you’re not satisfied", p: [`You can escalate an unresolved complaint to the ${site.regulator.name} (${site.regulator.short}).`] },
    ],
  },
  {
    slug: "security",
    title: "Fraud & Security",
    summary: "How to recognise genuine NANAM contact and protect yourself from scams.",
    sections: [
      { h: "NANAM will never", list: ["Ask for your Mobile Money PIN or a one-time code by phone, SMS or WhatsApp.", "Ask you to pay a fee to “release” or “speed up” a loan.", "Ask you to send money to a personal phone number."] },
      { h: "Genuine NANAM contact", list: [`Our phone lines: ${site.phones.join(", ")}. WhatsApp: ${site.whatsapp.display}.`, "Payment prompts come from MTN MoMo or Airtel Money and show NANAM as the merchant.", "Our website is nanam.ug. Check the address before entering any details."] },
      { h: "If something seems wrong", p: [`Stop, don’t pay, and call us on ${site.phones[0]}. If you shared a PIN, contact your Mobile Money provider immediately.`] },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Notice",
    summary: "We only use cookies that are essential to keep you signed in and secure.",
    sections: [
      { h: "Cookies we use", list: ["A sign-in cookie for the customer portal (nanam_portal), valid for up to 7 days.", "A sign-in cookie for NANAM staff (nanam_session).", "Your browser may store your chat with our website assistant for the current visit only."] },
      { h: "No tracking", p: ["We do not use advertising or third-party tracking cookies. If we add analytics in future, we will update this notice and ask for consent where required."] },
    ],
  },
];

export const getLegalDoc = (slug: string) => legalDocs.find((d) => d.slug === slug);
