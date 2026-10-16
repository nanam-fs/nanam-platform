"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Banknote,
  FileStack,
  FlaskConical,
  Handshake,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  ShieldCheck,
  Undo2,
  UserCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/console/actions";
import { cn } from "@/lib/utils";
import { openPalette } from "./command-palette";

export type NavItem = { href: string; label: string; icon: keyof typeof icons; badge?: number; group: string; key?: string };

const icons = { LayoutDashboard, FileStack, Banknote, Undo2, ShieldCheck, Handshake, Inbox, MessageSquareText, FlaskConical, Users, History, UserCog } satisfies Record<string, LucideIcon>;

export function Sidebar({ items, user }: { items: NavItem[]; user: { name: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mac, setMac] = useState(true);
  useEffect(() => queueMicrotask(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform))), []);

  const groups = items.reduce<Record<string, NavItem[]>>((acc, i) => ((acc[i.group] ??= []).push(i), acc), {});

  const nav = (
    <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Console">
      {Object.entries(groups).map(([group, list]) => (
        <div key={group} className="mt-5 first:mt-0">
          {group !== "_" && <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">{group}</p>}
          <ul className="space-y-0.5">
            {list.map((item) => {
              const Icon = icons[item.icon];
              const active = item.href === "/console" ? pathname === "/console" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active ? "bg-white/10 font-medium text-white" : "text-white/65 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-lime-400" />}
                    <Icon className={cn("size-4", active && "text-lime-400")} strokeWidth={1.8} />
                    <span className="flex-1">{item.label}</span>
                    {!!item.badge && <span className="rounded-full bg-lime-500 px-1.5 text-xs font-semibold tabular text-forest-950">{item.badge}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/10 p-3">
      <Link href="/console/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
        <span className="grid size-8 place-items-center rounded-full bg-peach-400 text-sm font-semibold text-forest-950">{user.name[0]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-white">{user.name}</span>
          <span className="block truncate text-xs text-white/50">{user.role}</span>
        </span>
        <UserCog className="size-4 text-white/40" />
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
      <div className="sticky top-[var(--demo-h,0px)] z-40 flex h-14 items-center justify-between bg-forest-950 px-4 lg:hidden">
        <Image src="/brand/logo-inverse.svg" alt="NANAM" width={613} height={136} className="h-7 w-auto" />
        <div className="flex items-center gap-1">
          <button aria-label="Search" onClick={openPalette} className="grid size-10 place-items-center text-white">
            <Search className="size-5" />
          </button>
          <button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center text-white">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[calc(3.5rem+var(--demo-h,0px))] z-40 flex flex-col bg-forest-950 pt-3 lg:hidden">
          {nav}
          {footer}
        </div>
      )}
      <aside className="sticky top-[var(--demo-h,0px)] hidden h-[calc(100dvh-var(--demo-h,0px))] w-64 shrink-0 flex-col bg-forest-950 lg:flex">
        <div className="flex h-16 items-center px-6">
          <Image src="/brand/logo-inverse.svg" alt="NANAM" width={613} height={136} className="h-7 w-auto" />
        </div>
        <button
          onClick={openPalette}
          className="mx-3 mb-4 flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/55 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="rounded border border-white/15 px-1.5 text-[11px]">{mac ? "⌘" : "Ctrl"} K</kbd>
        </button>
        {nav}
        {footer}
      </aside>
    </>
  );
}
