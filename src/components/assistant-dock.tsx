"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowUpRight, Sparkles, X } from "lucide-react";
import { reply, type Reply } from "@/lib/assistant/engine";
import { whatsappUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

type Msg = { from: "you" | "bot"; text: string; reply?: Reply };

const STORE = "nanam-assistant";
const greeting: Msg = {
  from: "bot",
  text: "Hi! I can explain NANAM loans, what you need, what it costs, or work out a repayment. What would you like to know?",
  reply: { text: "", actions: [], kind: "smalltalk", suggestions: ["How much for 5M over 3 months?", "What do I need for a logbook loan?", "How do I repay?"] },
};

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

export function AssistantDock() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([greeting]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Restore this visit's conversation (best effort; storage may be unavailable).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE);
      if (saved) queueMicrotask(() => setMsgs(JSON.parse(saved)));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30)));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  // Show after the hero, hide while the footer is on screen, so the dock never covers key content.
  useEffect(() => {
    let pastHero = false;
    let footerVisible = false;
    const update = () => setVisible(pastHero && !footerVisible);
    const onScroll = () => {
      pastHero = window.scrollY > window.innerHeight * 0.6;
      update();
    };
    const footer = document.querySelector("footer");
    const io = footer ? new IntersectionObserver(([e]) => ((footerVisible = e.isIntersecting), update()), { rootMargin: "0px 0px -40px 0px" }) : null;
    if (footer) io!.observe(footer);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  function ask(text: string) {
    const q = text.trim();
    if (!q || typing) return;
    setMsgs((m) => [...m, { from: "you", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const r = reply(q);
      setMsgs((m) => [...m, { from: "bot", text: r.text, reply: r }]);
      setTyping(false);
    }, 420);
  }

  const last = msgs.at(-1);
  const suggestions = !typing && last?.from === "bot" ? last.reply?.suggestions ?? [] : [];
  const lastQuestion = [...msgs].reverse().find((m) => m.from === "you")?.text;

  return (
    <>
      <AnimatePresence>
        {(visible || open) && !open && (
          <m.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex items-center gap-1 rounded-full border border-white/10 bg-forest-950/90 p-1.5 shadow-2xl shadow-forest-950/40 backdrop-blur-xl md:right-6 md:bottom-6"
          >
            <button
              ref={launcher}
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className="flex h-11 items-center gap-2 rounded-full bg-lime-500 pr-4 pl-3 text-sm font-semibold text-forest-950 transition-colors hover:bg-lime-400"
            >
              <Sparkles className="size-4" /> Ask NANAM
            </button>
            <a
              href={whatsappUrl("Hello NANAM, I have a question.")}
              target="_blank"
              rel="noopener"
              aria-label="Chat with NANAM on WhatsApp"
              className="group relative grid size-11 place-items-center rounded-full text-[#25D366] transition-colors hover:bg-white/10"
            >
              <WhatsAppGlyph className="size-6" />
              <span className="pointer-events-none absolute right-0 bottom-full mb-3 whitespace-nowrap rounded-lg bg-forest-950 px-3 py-1.5 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                WhatsApp a person
              </span>
            </a>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} className="fixed inset-0 z-40 bg-forest-950/30 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none" aria-hidden />
            <m.section
              role="dialog"
              aria-modal="true"
              aria-label="NANAM assistant"
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98 }}
              className="fixed inset-x-0 bottom-0 z-50 flex h-[82dvh] flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl shadow-forest-950/40 md:inset-x-auto md:right-6 md:bottom-6 md:h-[min(40rem,calc(100dvh-3rem))] md:w-[25rem] md:rounded-3xl"
            >
              <header className="surface-forest flex items-start justify-between gap-3 px-5 pt-5 pb-4 text-white">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-white/95 p-1.5">
                    <Image src="/brand/logo-mark.svg" alt="" width={110} height={118} className="size-full" />
                  </span>
                  <div>
                    <p className="font-display text-lg leading-tight">NANAM Assistant</p>
                    <p className="text-xs text-white/60">Instant answers from nanam.ug</p>
                  </div>
                </div>
                <button onClick={close} aria-label="Close assistant" className="grid size-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                  <X className="size-5" />
                </button>
              </header>
              <a
                href={whatsappUrl(lastQuestion ? `Hello NANAM, I have a question: ${lastQuestion.slice(0, 200)}` : "Hello NANAM, I have a question.")}
                target="_blank"
                rel="noopener"
                className="flex items-center justify-between gap-2 border-b border-line bg-white px-5 py-2.5 text-sm text-ink/80 hover:bg-forest-50"
              >
                <span className="flex items-center gap-2">
                  <WhatsAppGlyph className="size-4 text-[#25D366]" /> Prefer a person? Continue on WhatsApp
                </span>
                <ArrowUpRight className="size-4 text-muted" />
              </a>

              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5" aria-live="polite">
                {msgs.map((msg, i) =>
                  msg.from === "you" ? (
                    <p key={i} className="ml-auto max-w-[85%] w-fit rounded-2xl rounded-br-md bg-forest-600 px-4 py-2.5 text-sm text-white">
                      {msg.text}
                    </p>
                  ) : (
                    <div key={i} className="max-w-[90%]">
                      <p
                        className={cn(
                          "rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed",
                          msg.reply?.kind === "warning" ? "bg-amber-50 text-amber-900" : msg.reply?.kind === "quote" ? "border border-lime-500/40 bg-white text-ink" : "bg-white text-ink",
                        )}
                      >
                        {msg.text}
                      </p>
                      {!!msg.reply?.actions.length && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.reply.actions.map((a) =>
                            a.href.startsWith("http") ? (
                              <a key={a.href} href={a.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-full border border-forest-600/25 bg-white px-3 py-1.5 text-xs font-medium text-forest-700 hover:border-forest-600">
                                {a.label} <ArrowUpRight className="size-3" />
                              </a>
                            ) : (
                              <Link key={a.href} href={a.href} onClick={close} className="inline-flex items-center gap-1 rounded-full border border-forest-600/25 bg-white px-3 py-1.5 text-xs font-medium text-forest-700 hover:border-forest-600">
                                {a.label} <ArrowUpRight className="size-3" />
                              </Link>
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  ),
                )}
                {typing && (
                  <p className="flex w-fit gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3.5" aria-label="Assistant is typing">
                    {[0, 1, 2].map((d) => (
                      <m.span key={d} className="size-1.5 rounded-full bg-forest-600/60" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: d * 0.12 }} />
                    ))}
                  </p>
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="flex gap-2 overflow-x-auto px-4 pb-2">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => ask(s)} className="shrink-0 rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink/80 hover:border-forest-600/40">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  ask(input);
                }}
                className="flex items-center gap-2 border-t border-line bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
              >
                <label htmlFor="assistant-input" className="sr-only">
                  Ask a question
                </label>
                <input
                  id="assistant-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about loans, costs, repayments…"
                  autoComplete="off"
                  maxLength={300}
                  className="h-11 flex-1 rounded-full bg-cream px-4 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600/20"
                />
                <button aria-label="Send" disabled={!input.trim() || typing} className="grid size-11 place-items-center rounded-full bg-forest-600 text-white transition-colors hover:bg-forest-700 disabled:opacity-40">
                  <ArrowUp className="size-5" />
                </button>
              </form>
              <p className="bg-white px-4 pb-3 text-center text-[11px] text-muted">Automated answers from NANAM’s website. Don’t share PINs or ID numbers here.</p>
            </m.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
