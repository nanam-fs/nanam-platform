import Image from "next/image";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="surface-forest grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm">
        <Image src="/brand/logo-inverse.svg" alt={site.name} width={613} height={136} className="mx-auto h-9 w-auto" priority />
        <div className="mt-10 rounded-2xl bg-white p-8 shadow-2xl shadow-black/30">
          <h1 className="text-xl font-semibold text-forest-950">{title}</h1>
          {subtitle && <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>}
          {children}
        </div>
        {footer ?? <p className="mt-6 text-center text-xs text-white/45">Authorised NANAM staff only. All activity is logged.</p>}
      </div>
    </main>
  );
}
