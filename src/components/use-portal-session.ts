"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type PortalSession =
  | { signedIn: true; name: string | null; firstName: string | null; phoneHint: string; avatarSeed: string }
  | { signedIn: false };

/** Checks whether this browser is signed in to the customer portal. Re-checks on navigation and when the tab regains focus. */
export function usePortalSession() {
  const pathname = usePathname();
  const [session, setSession] = useState<PortalSession | null>(null);
  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetch("/api/portal/me", { cache: "no-store", credentials: "same-origin" })
        .then((r) => (r.ok ? r.json() : null))
        .then((s: PortalSession | null) => !cancelled && setSession(s ?? { signedIn: false }))
        .catch(() => {});
    check();
    const onFocus = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [pathname]);
  return session;
}
