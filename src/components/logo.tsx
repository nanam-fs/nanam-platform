import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ inverse, className }: { inverse?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label="NANAM Financial Services, home" className={cn("inline-flex shrink-0", className)}>
      <Image
        src={inverse ? "/brand/logo-inverse.svg" : "/brand/logo.svg"}
        alt="NANAM Financial Services Limited"
        width={613}
        height={136}
        priority
        className="h-9 w-auto md:h-10"
      />
    </Link>
  );
}
