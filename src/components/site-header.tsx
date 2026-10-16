"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, Phone, X } from "lucide-react";
import { nav, site, tel } from "@/lib/site";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./account-menu";
import { Logo } from "./logo";
import { MemberAvatar } from "./member-avatar";
import { usePortalSession } from "./use-portal-session";
import { ButtonLink } from "./ui";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const portal = usePortalSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The mobile menu covers the screen: freeze the page behind it, close on Escape, rotation to desktop, or navigation.
  useEffect(() => queueMicrotask(() => setOpen(false)), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const mq = window.matchMedia("(min-width: 1024px)");
    const onWide = () => mq.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
    };
  }, [open]);

  // Every marketing page opens on a dark hero, so the bar starts transparent with light text.
  const solid = scrolled || open;

  return (
    <header className={cn("fixed inset-x-0 top-[var(--demo-h,0px)] z-50 transition-all duration-300", solid ? "border-b border-line/70 bg-cream/85 backdrop-blur-xl" : "bg-transparent")}>
      <div className="container-page flex h-18 items-center justify-between gap-6 md:h-20">
        <Logo inverse={!solid} />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  solid ? "text-ink/75 hover:text-forest-700" : "text-white/75 hover:text-white",
                  active && (solid ? "text-forest-700 font-medium" : "text-white font-medium"),
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {portal?.signedIn ? (
            <AccountMenu session={portal} onDark={!solid} />
          ) : (
            <ButtonLink href="/portal/login" variant={solid ? "ghost" : "light"} className={cn("transition-opacity", !solid && "border-transparent", !portal && "opacity-0")}>
              Sign in
            </ButtonLink>
          )}
          <ButtonLink href="/apply" variant={solid ? "primary" : "lime"}>
            Apply now <ArrowUpRight className="size-4" />
          </ButtonLink>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          {portal?.signedIn && (
            <Link href="/portal" aria-label={`Your account${portal.firstName ? `, ${portal.firstName}` : ""}`} className="grid size-11 place-items-center rounded-full">
              <MemberAvatar name={portal.name} seed={portal.avatarSeed} className="size-9 text-sm" ring={!solid} />
            </Link>
          )}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={cn("grid size-11 place-items-center rounded-full", solid ? "text-forest-900" : "text-white")}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <m.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-[calc(100dvh-4.5rem-var(--demo-h,0px))] flex-col overflow-y-auto overscroll-contain border-t border-line bg-cream lg:hidden md:h-[calc(100dvh-5rem-var(--demo-h,0px))]"
          >
            <nav aria-label="Mobile" className="container-page flex flex-col py-2">
              {nav.map((item, i) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <m.div key={item.href} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i + 0.05, duration: 0.25 }}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex items-center justify-between border-b border-line/70 py-3.5 font-display text-[1.65rem] leading-tight", active ? "text-forest-600" : "text-forest-950")}
                    >
                      {item.label}
                      <ArrowUpRight className="size-5 text-muted" />
                    </Link>
                  </m.div>
                );
              })}
            </nav>
            <div className="container-page mt-auto pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              {portal?.signedIn ? (
                <div className="space-y-3">
                  <Link href="/portal" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                    <MemberAvatar name={portal.name} seed={portal.avatarSeed} className="size-11 text-base" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-forest-950">{portal.name ?? "Your account"}</span>
                      <span className="block text-xs text-muted">{portal.phoneHint} · Loans &amp; repayments</span>
                    </span>
                    <ArrowUpRight className="size-4 text-muted" />
                  </Link>
                  <ButtonLink href="/apply" className="w-full">
                    Apply now
                  </ButtonLink>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <ButtonLink href="/portal/login" variant="outline">
                    Sign in
                  </ButtonLink>
                  <ButtonLink href="/apply">Apply now</ButtonLink>
                </div>
              )}
              <a href={tel(site.phones[0])} className="mt-4 flex items-center justify-center gap-2 py-2 text-sm text-muted">
                <Phone className="size-4" /> Call us on {site.phones[0]}
              </a>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
