import type { Metadata, Viewport } from "next";
import { checkByToken, linkUsable } from "@/lib/kyc";
import { CaptureFlow } from "./capture-flow";

export const metadata: Metadata = { title: "Identity check · NANAM", robots: { index: false }, referrer: "no-referrer" };
export const viewport: Viewport = { themeColor: "#031a0f" };

export default async function VerifyPage({ params }: PageProps<"/verify/[token]">) {
  const check = await checkByToken((await params).token);
  if (!check || !linkUsable(check)) {
    const done = check && check.status !== "awaiting_capture";
    return (
      <main className="grid min-h-dvh place-items-center bg-forest-950 p-8 text-center text-white">
        <div className="max-w-xs">
          <p className="text-2xl font-semibold">{done ? "Photos already received" : "This link has expired"}</p>
          <p className="mt-3 text-white/65">
            {done ? "You can return to your computer. Your result will appear there." : "Start a new identity check from your computer or the NANAM portal."}
          </p>
        </div>
      </main>
    );
  }
  return <CaptureFlow token={(await params).token} firstName={check.application.fullName.split(" ")[0]} />;
}
