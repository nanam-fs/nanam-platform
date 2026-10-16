import Image from "next/image";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "lime" | "outline" | "ghost" | "light";

const variants: Record<Variant, string> = {
  primary: "bg-forest-600 text-white hover:bg-forest-700 shadow-sm shadow-forest-900/20",
  lime: "bg-lime-500 text-forest-950 hover:bg-lime-400",
  outline: "border border-forest-600/25 text-forest-700 hover:border-forest-600 hover:bg-forest-50",
  ghost: "text-forest-700 hover:bg-forest-50",
  light: "border border-white/20 text-white hover:bg-white/10",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 h-11 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, variants[variant], className)} {...props} />;
}

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("inline-flex items-center gap-3 text-sm font-medium text-forest-600", className)}>
      <span aria-hidden className="h-px w-6 bg-lime-500" />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
  dark,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "left" | "center";
  dark?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <Eyebrow className={cn(dark && "text-lime-400")}>{eyebrow}</Eyebrow>}
      <h2
        className={cn(
          "mt-4 font-display text-4xl leading-[1] text-balance md:text-[3.4rem]",
          dark ? "text-white" : "text-forest-950",
        )}
      >
        {title}
      </h2>
      {body && <p className={cn("mt-4 text-lg text-pretty", dark ? "text-white/70" : "text-muted")}>{body}</p>}
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  body,
  children,
  photo,
}: {
  eyebrow: string;
  title: ReactNode;
  body?: ReactNode;
  children?: ReactNode;
  photo?: { src: string; alt: string; position?: string };
}) {
  return (
    <section className="surface-forest relative isolate overflow-hidden pt-36 pb-20 text-white md:pt-44 md:pb-28">
      {photo && (
        <>
          <Image src={photo.src} alt={photo.alt} fill priority sizes="100vw" className="-z-20 object-cover opacity-45" style={{ objectPosition: photo.position }} />
          <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-forest-950 via-forest-950/85 to-forest-950/30" />
        </>
      )}
      <div className="container-page relative">
        <Eyebrow className="text-lime-400 [&>span]:bg-lime-400">{eyebrow}</Eyebrow>
        <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[0.98] text-balance md:text-[4.5rem]">{title}</h1>
        {body && <p className="mt-6 max-w-2xl text-lg text-white/70 text-pretty">{body}</p>}
        {children}
      </div>
    </section>
  );
}
