import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (local embedded Postgres) ships WASM and must load from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  // Keep links from the previous nanam.ug site (and agents' shared referral links) working.
  async redirects() {
    return [
      { source: "/products", destination: "/loans", permanent: true },
      { source: "/agents/register", destination: "/partners", permanent: true },
      { source: "/ref/:token", destination: "/apply?ref=:token", permanent: false },
      { source: "/login", destination: "/portal", permanent: false },
      { source: "/signin", destination: "/portal", permanent: false },
      { source: "/register", destination: "/apply", permanent: false },
    ];
  },
};

export default nextConfig;
