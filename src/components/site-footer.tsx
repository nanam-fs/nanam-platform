import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { products } from "@/lib/products";
import { photoCredits } from "@/lib/photos";
import { site, tel, whatsappUrl } from "@/lib/site";
import { Logo } from "./logo";

const columns = [
  { title: "Loans", links: [...products.map((p) => ({ href: `/loans/${p.slug}`, label: p.name })), { href: "/calculator", label: "Loan calculator" }] },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About NANAM" },
      { href: "/partners", label: "Become a partner" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/faq", label: "FAQs" },
      { href: "/apply", label: "Apply online" },
      { href: "/portal", label: "Customer sign in" },
      { href: "/legal/complaints", label: "Complaints" },
      { href: "/legal/security", label: "Fraud & security" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy policy" },
      { href: "/legal/terms", label: "Terms & conditions" },
      { href: "/legal/loan-terms", label: "Key loan facts" },
      { href: "/legal/cookies", label: "Cookie notice" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="surface-forest text-white">
      <div className="container-page grid gap-12 py-20 lg:grid-cols-[1.4fr_2fr]">
        <div>
          <Logo inverse size="lg" />
          <p className="mt-6 max-w-sm text-white/65">{site.tagline}</p>
          <ul className="mt-8 space-y-1 text-sm text-white/80">
            <li className="flex gap-3 py-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-lime-400" />
              <span>{site.address.lines.join(", ")}</span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="size-4 shrink-0 text-lime-400" />
              <span className="flex flex-wrap gap-x-4">
                {site.phones.map((p) => (
                  <a key={p} href={tel(p)} className="inline-flex min-h-11 items-center hover:text-white">
                    {p}
                  </a>
                ))}
              </span>
            </li>
            <li>
              <a href={whatsappUrl()} className="flex min-h-11 items-center gap-3 hover:text-white">
                <MessageCircle className="size-4 text-lime-400" /> WhatsApp {site.whatsapp.display}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="flex min-h-11 items-center gap-3 hover:text-white">
                <Mail className="size-4 text-lime-400" /> {site.email}
              </a>
            </li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-medium uppercase tracking-[0.16em] text-white/50">{col.title}</h3>
              <ul className="mt-5 space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-white/80 hover:text-lime-300">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page py-8 md:py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <a
              href="https://umra.go.ug"
              target="_blank"
              rel="noopener"
              aria-label="Uganda Microfinance Regulatory Authority"
              className="inline-flex h-14 w-40 shrink-0 items-center justify-center rounded-xl bg-white px-4 shadow-sm"
            >
              <Image src="/brand/umra.png" alt="UMRA" width={1024} height={324} sizes="160px" loading="eager" className="h-auto w-full" />
            </a>
            <p className="max-w-3xl text-sm leading-relaxed text-white/60 text-pretty">
              {site.name} is licensed and regulated by the {site.regulator.name} under the {site.regulator.act}. Loans are subject to verification and
              approval. Calculator figures are indicative.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/45 md:flex-row md:items-start md:justify-between md:gap-10">
            <p className="shrink-0">© {new Date().getFullYear()} {site.name}</p>
            <p className="max-w-xl text-pretty">
              Photography: Unsplash contributors ({photoCredits.join(", ")}). People pictured are not NANAM clients.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
