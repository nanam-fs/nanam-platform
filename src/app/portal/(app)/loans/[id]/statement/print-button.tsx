"use client";

import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-full bg-forest-600 px-5 text-sm font-medium text-white hover:bg-forest-700">
      <Download className="size-4" /> Save as PDF
    </button>
  );
}
