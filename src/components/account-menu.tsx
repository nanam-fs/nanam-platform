"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, LogOut, Smartphone } from "lucide-react";
import { portalSignOut } from "@/app/portal/actions";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "./member-avatar";
import type { PortalSession } from "./use-portal-session";

type Signed = Extract<PortalSession, { signedIn: true }>;

/** Desktop header chip for a signed-in customer: their avatar and first name, opening a small account menu. */
export function AccountMenu({ session, onDark }: { session: Signed; onDark: boolean }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => queueMicrotask(() => setOpen(false)), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = session.firstName ?? "Your account";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-11 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm font-medium transition-colors",
          onDark ? "border-white/15 text-white hover:bg-white/10" : "border-line bg-white/70 text-forest-950 hover:border-forest-600/30",
        )}
      >
        <MemberAvatar name={session.name} seed={session.avatarSeed} className="size-8 text-sm" />
        <span className="max-w-32 truncate">{label}</span>
        <ChevronDown className={cn("size-4 opacity-60 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", visualDuration: 0.22, bounce: 0.1 }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-xl shadow-forest-950/15"
          >
            <div className="flex items-center gap-3 bg-forest-950 p-4 text-white">
              <MemberAvatar name={session.name} seed={session.avatarSeed} className="size-11 text-base" ring />
              <div className="min-w-0">
                <p className="truncate font-display text-lg leading-tight">{session.name ?? "Signed in"}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-white/60">
                  <Smartphone className="size-3" /> {session.phoneHint}
                </p>
              </div>
            </div>
            <div className="p-1.5">
              <MenuLink href="/portal" icon={LayoutGrid}>
                Loans, balances &amp; repayments
              </MenuLink>
              <form action={portalSignOut}>
                <button role="menuitem" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink/80 hover:bg-cream hover:text-ink">
                  <LogOut className="size-4 text-muted" /> Sign out
                </button>
              </form>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({ href, icon: Icon, children }: { href: string; icon: typeof LayoutGrid; children: React.ReactNode }) {
  return (
    <Link role="menuitem" href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/80 hover:bg-cream hover:text-ink">
      <Icon className="size-4 text-muted" />
      {children}
    </Link>
  );
}
