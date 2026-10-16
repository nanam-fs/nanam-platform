import type { DocumentKind } from "@/db/schema";
import type { ProductSlug } from "./products";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // stays under the 4.5 MB function request limit
export const MAX_DOCS_PER_APPLICATION = 20;

export const documentLabels: Record<DocumentKind, string> = {
  national_id: "National ID (both sides)",
  passport_photo: "Passport photo",
  statement: "6-month bank or Mobile Money statement",
  logbook: "Vehicle logbook",
  land_title: "Land title",
  contract: "Contract or LPO",
  trading_licence: "Trading licence / certificate of incorporation",
  sale_agreement: "Sale agreement for the asset",
  id_front: "National ID: front (identity check)",
  id_back: "National ID: back (identity check)",
  selfie: "Selfie (identity check)",
  other: "Other supporting document",
};

/** Documents NANAM asks for, per product. Mirrors the requirements published on the website. */
export const requiredDocuments: Record<ProductSlug, DocumentKind[]> = {
  logbook: ["national_id", "passport_photo", "statement", "logbook"],
  business: ["national_id", "passport_photo", "statement", "trading_licence"],
  "asset-finance": ["national_id", "passport_photo", "statement", "sale_agreement"],
  "contract-finance": ["national_id", "passport_photo", "statement", "contract"],
};

export function documentSlots(product: string): DocumentKind[] {
  const required = requiredDocuments[product as ProductSlug] ?? ["national_id", "passport_photo", "statement"];
  return [...required, ...(["logbook", "land_title"] as const).filter((k) => !required.includes(k)), "other"];
}

export type AllowedType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

/** Identify a file by its first bytes, never by its name or the browser's claimed type. */
export function sniffType(bytes: Uint8Array): AllowedType | null {
  const b = (i: number) => bytes[i];
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return "application/pdf"; // %PDF
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return "image/webp";
  return null;
}

export const extensionFor: Record<AllowedType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Safe display name: no paths, no control characters, bounded length. */
export function cleanFileName(name: string, type: AllowedType) {
  const base = name.split(/[\\/]/).pop()!.replace(/[^\w.\- ]+/g, "").replace(/\.[^.]*$/, "").trim().slice(0, 60) || "document";
  return `${base}.${extensionFor[type]}`;
}

/** Requirements already satisfied by a verified identity check (ID front/back + live selfie). */
export const coveredByIdentityCheck: DocumentKind[] = ["national_id", "passport_photo"];

export function missingDocuments(product: string, docs: { kind: DocumentKind; status: string }[], kycVerified: boolean) {
  const need = requiredDocuments[product as ProductSlug] ?? [];
  return need.filter((k) => !(kycVerified && coveredByIdentityCheck.includes(k)) && !docs.some((d) => d.kind === k && d.status !== "rejected"));
}
