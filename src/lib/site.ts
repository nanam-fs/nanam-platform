/** Company facts, sourced from nanam.ug and confirmed by NANAM (Oct 2026). */
export const site = {
  name: "NANAM Financial Services Limited",
  shortName: "NANAM",
  abbreviation: "NFSL",
  url: "https://nanam.ug",
  founded: 2018,
  tagline: "Reliable and sustainable financial solutions for socio-economic development.",
  email: "info@nanam.ug",
  phones: ["+256 773 902993", "+256 701 481852"],
  whatsapp: { display: "+256 773 902993", wa: "256773902993" },
  address: {
    lines: ["NANAM House, 2nd Floor", "Namugongo–Mbalwa Road", "~200m from the Catholic Shrine", "Wakiso, Uganda"],
    mapUrl: "https://maps.google.com/?q=Namugongo+Catholic+Shrine+Wakiso+Uganda",
  },
  regulator: {
    name: "Uganda Microfinance Regulatory Authority",
    short: "UMRA",
    act: "Tier 4 Microfinance Institutions and Money Lenders Act, 2016",
  },
  pricing: {
    monthlyRate: 2.8,
    /** One-off, deducted from the amount disbursed (assumption, to confirm with NANAM). */
    processingFee: 2,
  },
  mission: "To provide reliable and sustainable financial solutions to our clients for socio-economic development.",
  vision: "To grow into a nationally recognised financial institution.",
} as const;

export const tel = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;
export const whatsappUrl = (text?: string) =>
  `https://wa.me/${site.whatsapp.wa}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const nav = [
  { href: "/loans", label: "Loans" },
  { href: "/calculator", label: "Calculator" },
  { href: "/about", label: "About" },
  { href: "/partners", label: "Partners" },
  { href: "/faq", label: "Help" },
  { href: "/contact", label: "Contact" },
] as const;
