import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { site } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Instrument_Serif({
  variable: "--font-display-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

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
    <html lang="en-UG" className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
