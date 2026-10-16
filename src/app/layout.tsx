import type { Metadata, Viewport } from "next";
import { MotionProvider } from "@/components/motion-provider";
import { site } from "@/lib/site";
import { cabinet, switzer } from "./fonts";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "NANAM Financial Services | Logbook, Business & Asset Loans in Uganda",
    template: "%s | NANAM Financial Services",
  },
  description:
    "Licensed by UMRA since 2018. Borrow UGX 2M–100M against your logbook, land title or contract. Decisions in 24 hours, transparent 2.8% monthly rate, no hidden fees.",
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_UG",
  },
};

export const viewport: Viewport = {
  themeColor: "#031a0f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-UG" className={`${switzer.variable} ${cabinet.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
