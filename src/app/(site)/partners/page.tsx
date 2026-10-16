import type { Metadata } from "next";
import { Building2, Coins, UserRound } from "lucide-react";
import { PageHero } from "@/components/ui";
import { PartnerForm } from "./partner-form";

export const metadata: Metadata = {
  title: "Become a partner",
  description: "Partner with NANAM to refer clients for loans and earn commissions, paid to your bank or Mobile Money.",
};

const points = [
  { icon: Building2, t: "For businesses", b: "Agent banking outlets, forex bureaus, SACCOs, MoMo super-agents and employer partnerships." },
  { icon: UserRound, t: "For individuals", b: "Freelance marketers, MoMo vendors, retailers, salespeople and community referrers." },
  { icon: Coins, t: "Get paid your way", b: "Commission paid to your bank account or Mobile Money." },
];

export default function PartnersPage() {
  return (
    <>
      <PageHero
        eyebrow="NANAM Partner Network"
        title={
          <>
            Refer clients. <em className="text-lime-400">Earn commission.</em>
          </>
        }
        body="Partner with NANAM to refer clients for loans and earn commissions. Submit your details and our team will review your application within 48 working hours."
      />
      <section className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_1.5fr]">
        <ul className="space-y-8">
          {points.map(({ icon: Icon, t, b }) => (
            <li key={t} className="flex gap-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime-500 text-forest-950">
                <Icon className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-medium text-forest-950">{t}</h2>
                <p className="mt-1 text-muted">{b}</p>
              </div>
            </li>
          ))}
        </ul>
        <PartnerForm />
      </section>
    </>
  );
}
