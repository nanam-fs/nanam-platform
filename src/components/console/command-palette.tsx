"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, Banknote, CornerDownLeft, FileStack, Handshake, Loader2, Search } from "lucide-react";
import { searchConsole, type SearchHit } from "@/app/console/actions";
import { cn } from "@/lib/utils";

export type PaletteNav = { href: string; label: string; key?: string };

const OPEN_EVENT = "nanam:open-palette";
export const openPalette = () => window.dispatchEvent(new Event(OPEN_EVENT));

type Row = { id: string; group: string; title: string; subtitle?: string; href: string; icon?: typeof Search; shortcut?: string };

const kindIcon = { application: FileStack, loan: Banknote, agent: Handshake } as const;

/** ⌘K / Ctrl+K command palette plus "g then x" navigation shortcuts for the staff console. */
export function CommandPalette({ nav, actions }: { nav: PaletteNav[]; actions: PaletteNav[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const lastG = useRef(0);

  // Global keyboard: ⌘K / Ctrl+K / "/" to open; "g" + key to jump.
  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "g") {
        lastG.current = Date.now();
        return;
      }
      if (Date.now() - lastG.current < 900) {
        const target = nav.find((n) => n.key === e.key.toLowerCase());
        if (target) {
          e.preventDefault();
          lastG.current = 0;
          router.push(target.href);
        }
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [nav, router]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setQ("");
      setHits([]);
      setActive(0);
      input.current?.focus();
    });
  }, [open]);

  // Debounced server search.
  useEffect(() => {
    if (q.trim().length < 2) {
      queueMicrotask(() => setHits([]));
      return;
    }
    const t = setTimeout(() => start(async () => setHits(await searchConsole(q))), 160);
    return () => clearTimeout(t);
  }, [q]);

  const rows: Row[] = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (s: string) => !needle || s.toLowerCase().includes(needle);
    return [
      ...hits.map((h) => ({ id: `${h.kind}-${h.id}`, group: "Results", title: h.title, subtitle: h.subtitle, href: h.href, icon: kindIcon[h.kind] })),
      ...nav.filter((n) => match(n.label)).map((n) => ({ id: `nav-${n.href}`, group: "Go to", title: n.label, href: n.href, shortcut: n.key ? `G ${n.key.toUpperCase()}` : undefined })),
      ...actions.filter((a) => match(a.label)).map((a) => ({ id: `act-${a.href}-${a.label}`, group: "Actions", title: a.label, href: a.href })),
    ];
  }, [hits, nav, actions, q]);

  const go = (r: Row | undefined) => {
    if (!r) return;
    setOpen(false);
    router.push(r.href);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-forest-950/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Search and commands"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", visualDuration: 0.25, bounce: 0.1 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl shadow-forest-950/30"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(rows.length - 1, a + 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              }
              if (e.key === "Enter") {
                e.preventDefault();
                go(rows[active]);
              }
            }}
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              {pending ? <Loader2 className="size-5 animate-spin text-muted" /> : <Search className="size-5 text-muted" />}
              <input
                ref={input}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                placeholder="Search clients, loans, references, phone or NIN…"
                aria-label="Search"
                aria-activedescendant={rows[active]?.id}
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
              />
              <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
            </div>
            <ul role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
              {rows.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">{pending ? "Searching…" : "No matches. Try a name, reference, phone number or NIN."}</li>}
              {rows.map((r, i) => {
                const Icon = r.icon ?? ArrowRight;
                const first = i === 0 || rows[i - 1].group !== r.group;
                return (
                  <li key={r.id}>
                    {first && <p className="px-3 pt-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{r.group}</p>}
                    <button
                      id={r.id}
                      role="option"
                      aria-selected={i === active}
                      onMouseMove={() => setActive(i)}
                      onClick={() => go(r)}
                      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", i === active ? "bg-forest-50" : "")}
                    >
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", i === active ? "bg-forest-600 text-white" : "bg-sand text-ink/70")}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-forest-950">{r.title}</span>
                        {r.subtitle && <span className="block truncate text-xs text-muted">{r.subtitle}</span>}
                      </span>
                      {r.shortcut && <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-muted">{r.shortcut}</kbd>}
                      {i === active && <CornerDownLeft className="size-4 text-muted" />}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center gap-4 border-t border-line bg-cream/60 px-4 py-2 text-[11px] text-muted">
              <span>↑↓ to move</span>
              <span>↵ to open</span>
              <span>G then a letter to jump</span>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
