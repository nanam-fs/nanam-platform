import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, Phone } from "lucide-react";
import { Logo } from "@/components/logo";
import { MemberAvatar } from "@/components/member-avatar";
import { avatarSeed, customerName, requireCustomer } from "@/lib/customer-auth";
import { site, tel } from "@/lib/site";
import { portalSignOut } from "../actions";

export const metadata: Metadata = { title: { default: "My account", template: "%s · NANAM" }, robots: { index: false } };

export default async function PortalLayout({ children }: LayoutProps<"/portal">) {
  const customer = await requireCustomer();
  const name = await customerName(customer.phone);
  return (
    <div className="min-h-dvh bg-cream">
      <header className="surface-forest text-white print:hidden">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 md:px-6">
          <Logo inverse />
          <div className="flex items-center gap-1">
            <a href={tel(site.phones[0])} className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm text-white/75 hover:text-white sm:flex">
              <Phone className="size-4" /> Help
            </a>
            <form action={portalSignOut}>
              <button className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white">
                <LogOut className="size-4" /> Sign out
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 pt-4 pb-24 md:px-6">
          <Link href="/portal" className="-my-2 inline-block py-2 text-sm text-white/60 hover:text-white">
            My account
          </Link>
          <div className="mt-3 flex items-center gap-4">
            <MemberAvatar name={name} seed={avatarSeed(customer.phone)} className="size-14 text-xl" ring />
            <div className="min-w-0">
              <p className="truncate font-display text-3xl leading-tight sm:text-4xl">Hello{name ? `, ${name.split(" ")[0]}` : ""}</p>
              <p className="mt-0.5 text-sm text-white/60">{customer.phone}</p>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto -mt-16 max-w-4xl px-4 pb-16 md:px-6 print:mt-0 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
