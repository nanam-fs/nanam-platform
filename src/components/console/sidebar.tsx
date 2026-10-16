"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Banknote,
  FileStack,
  Handshake,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  ShieldCheck,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/console/actions";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: keyof typeof icons; badge?: number };

const icons = { LayoutDashboard, FileStack, Banknote, ShieldCheck, Handshake, Inbox, MessageSquareText, Users, History, UserCog } satisfies Record<string, LucideIcon>;

export function Sidebar({ items, user }: { items: NavItem[]; user: { name: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Console">
      {items.map((item) => {
        const Icon = icons[item.icon];
        const active = item.href === "/console" ? pathname === "/console" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-white/10 font-medium text-white" : "text-white/65 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className={cn("size-4", active ? "text-lime-400" : "")} strokeWidth={1.8} />
            <span className="flex-1">{item.label}</span>
            {!!item.badge && <span className="rounded-full bg-lime-500 px-1.5 text-xs font-medium tabular text-forest-950">{item.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <Link href="/console/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
        <span className="grid size-8 place-items-center rounded-full bg-peach-400 text-sm font-medium text-forest-950">{user.name[0]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-white">{user.name}</span>
          <span className="block truncate text-xs text-white/50">{user.role}</span>
        </span>
      </Link>
      <form action={logout}>
        <button className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/65 hover:bg-white/5 hover:text-white">
          <LogOut className="size-4" /> Sign out
        </button>
      </form>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between bg-forest-950 px-4 lg:hidden">
        <Image src="/brand/logo-inverse.svg" alt="NANAM" width={613} height={136} className="h-7 w-auto" />
        <button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center text-white">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 top-14 z-40 flex flex-col bg-forest-950 pt-3 lg:hidden">
          {nav}
          {footer}
        </div>
      )}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-forest-950 lg:flex">
        <div className="flex h-16 items-center gap-3 px-6">
          <Image src="/brand/logo-inverse.svg" alt="NANAM" width={613} height={136} className="h-7 w-auto" />
        </div>
        <p className="px-6 pb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-white/35">Staff console</p>
        {nav}
        {footer}
      </aside>
    </>
  );
}
