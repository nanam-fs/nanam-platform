"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { nav } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ButtonLink } from "./ui";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Every marketing page opens on a dark hero, so the bar starts transparent with light text.
  const solid = scrolled || open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        solid ? "border-b border-line/70 bg-cream/85 backdrop-blur-xl" : "bg-transparent",
      )}
    >
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
          <ButtonLink href="/portal" variant={solid ? "ghost" : "light"} className={cn(!solid && "border-transparent")}>
            Sign in
          </ButtonLink>
          <ButtonLink href="/apply" variant={solid ? "primary" : "lime"}>
            Apply now <ArrowUpRight className="size-4" />
          </ButtonLink>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={cn("grid size-11 place-items-center rounded-full lg:hidden", solid ? "text-forest-900" : "text-white")}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="container-page border-t border-line pb-6 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col py-2">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="border-b border-line/70 py-4 font-display text-2xl text-forest-950">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <ButtonLink href="/portal" variant="outline">
              Sign in
            </ButtonLink>
            <ButtonLink href="/apply">Apply now</ButtonLink>
          </div>
        </div>
      )}
    </header>
  );
}
