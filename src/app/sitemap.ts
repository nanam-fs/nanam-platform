import type { MetadataRoute } from "next";
import { legalDocs } from "@/lib/legal";
import { products } from "@/lib/products";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/loans", "/calculator", "/apply", "/about", "/partners", "/faq", "/contact", ...products.map((p) => `/loans/${p.slug}`), ...legalDocs.map((d) => `/legal/${d.slug}`)];
  return paths.map((p) => ({ url: `${site.url}${p}`, changeFrequency: "monthly", priority: p === "" ? 1 : 0.7 }));
}
