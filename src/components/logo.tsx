import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** The full NANAM lockup. Sized so the "Financial Services Limited" line stays legible on phones. */
export function Logo({ inverse, className, size = "md" }: { inverse?: boolean; className?: string; size?: "md" | "lg" }) {
  return (
    <Link href="/" aria-label="NANAM Financial Services, home" className={cn("inline-flex shrink-0", className)}>
      <Image
        src={inverse ? "/brand/logo-inverse.svg" : "/brand/logo.svg"}
        alt="NANAM Financial Services Limited"
        width={613}
        height={136}
        priority
        className={size === "lg" ? "h-12 w-auto md:h-14" : "h-10 w-auto lg:h-11"}
      />
    </Link>
  );
}
