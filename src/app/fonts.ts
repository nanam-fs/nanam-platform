import localFont from "next/font/local";

// Fontshare (Indian Type Foundry), ITF Free Font License: free commercial use, self-hosted, files unmodified.
// The licence forbids publishing the font files in a repository: they are gitignored and fetched
// from Fontshare by scripts/fonts.mts (runs automatically before `npm run dev` and `npm run build`).
export const switzer = localFont({
  src: [
    { path: "./fonts/Switzer-Variable.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/Switzer-VariableItalic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-switzer",
  display: "swap",
  fallback: ["system-ui", "Segoe UI", "Arial"],
});

export const cabinet = localFont({
  src: [{ path: "./fonts/CabinetGrotesk-Variable.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-cabinet",
  display: "swap",
  fallback: ["system-ui", "Arial"],
});
