import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { photos } from "@/lib/photos";
import { PageHero } from "@/components/ui";
import { site, tel, whatsappUrl } from "@/lib/site";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Call, email, message or visit NANAM Financial Services at NANAM House, Namugongo.",
};

const channels = [
  ...site.phones.map((p, i) => ({ icon: Phone, label: i === 0 ? "Call us" : "Or call", value: p, href: tel(p) })),
  { icon: MessageCircle, label: "WhatsApp", value: site.whatsapp.display, href: whatsappUrl("Hello NANAM, I'd like to ask about a loan.") },
  { icon: Mail, label: "Email", value: site.email, href: `mailto:${site.email}` },
  { icon: MapPin, label: "Visit", value: site.address.lines.join(", "), href: site.address.mapUrl },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        photo={photos.hero}
        title={
          <>
            Talk to a person, <em className="text-lime-400">not a queue.</em>
          </>
        }
        body="Call, email, or send a message. We respond fast."
      />
      <section className="container-page grid gap-10 py-20 lg:grid-cols-[1fr_1.4fr]">
        <ul className="space-y-3">
          {channels.map(({ icon: Icon, label, value, href }) => (
            <li key={label}>
              <a
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener" : undefined}
                className="flex gap-5 rounded-3xl border border-line bg-white p-6 transition-colors hover:border-forest-600/40"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-forest-50 text-forest-600">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm text-muted">{label}</span>
                  <span className="mt-0.5 block font-medium text-forest-950">{value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <ContactForm />
      </section>
    </>
  );
}
