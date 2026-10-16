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
          <Logo inverse />
          <p className="mt-6 max-w-sm text-white/65">{site.tagline}</p>
          <ul className="mt-8 space-y-3 text-sm text-white/80">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-lime-400" />
              <span>{site.address.lines.join(", ")}</span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-lime-400" />
              <span className="flex flex-wrap gap-x-3">
                {site.phones.map((p) => (
                  <a key={p} href={tel(p)} className="hover:text-white">
                    {p}
                  </a>
                ))}
              </span>
            </li>
            <li>
              <a href={whatsappUrl()} className="flex gap-3 hover:text-white">
                <MessageCircle className="size-4 text-lime-400" /> WhatsApp {site.whatsapp.display}
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="flex gap-3 hover:text-white">
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
        <div className="container-page flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-white px-3 py-2">
              <Image src="/brand/umra.png" alt="UMRA" width={1024} height={324} className="h-7 w-auto" />
            </div>
            <p className="max-w-xl text-xs leading-relaxed text-white/55">
              {site.name} is licensed and regulated by the {site.regulator.name} under the {site.regulator.act}.
              Loans are subject to verification and approval. Calculator figures are indicative.
            </p>
          </div>
          <div className="text-xs text-white/45 md:text-right">
            <p>© {new Date().getFullYear()} {site.name}</p>
            <p className="mt-1">Photography: Unsplash contributors ({photoCredits.join(", ")}). People pictured are not NANAM clients.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
