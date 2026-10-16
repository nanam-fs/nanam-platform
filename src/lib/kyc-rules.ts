/** Identity-check decision rules. Pure, so they can be unit-tested and audited. */

export type ProviderOutcome = {
  /** Smile ID V3 statuses; unknown future values are treated as needing review. */
  status: "clear" | "attention" | "block" | "error" | (string & {});
  reason: string | null;
  fraudDetected: boolean;
  idFields: Record<string, string | null> | null;
};

export type Decision = {
  status: "verified" | "review" | "rejected" | "retake";
  reason: string;
  checks: { name: string; ok: boolean; detail: string }[];
};

const tokens = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);

/**
 * Share of the applicant's typed name tokens found on the ID, ignoring order and case.
 * "Sarah Nakato" vs "NAKATO SARAH GRACE" → 1.0; "Sarah Nakato" vs "Grace Achieng" → 0.
 */
export function nameMatch(entered: string, onId: string) {
  const a = tokens(entered);
  const b = new Set(tokens(onId));
  if (!a.length || !b.size) return 0;
  return a.filter((t) => b.has(t)).length / a.length;
}

const reasonText: Record<string, string> = {
  face_verification_failed: "The selfie doesn’t match the photo on the ID.",
  spoof_detected: "The selfie didn’t pass the liveness check.",
  document_check_failed: "The ID document failed authenticity checks.",
  unsupported_document: "This document type isn’t supported.",
  high_risk: "The check returned a high fraud risk.",
  document_copy_detected: "The ID looks like a photocopy or a photo of a screen.",
  document_expired: "The ID appears to be expired.",
  document_unclassifiable: "The ID couldn’t be read. Retake the photos in good light.",
  image_unavailable_or_invalid: "A photo was unclear. Retake the photos in good light.",
  age_requirement_not_met: "The applicant doesn’t meet the age requirement.",
};
export const explain = (reason: string | null) => (reason ? reasonText[reason] ?? reason.replace(/_/g, " ") : null);

export function decide(outcome: ProviderOutcome, applicant: { fullName: string; nin: string }): Decision {
  if (outcome.status === "error") {
    return { status: "retake", reason: explain(outcome.reason) ?? "The photos couldn’t be processed. Please retake them.", checks: [] };
  }
  if (outcome.status === "block") {
    return { status: "rejected", reason: explain(outcome.reason) ?? "The identity check failed.", checks: [{ name: "Provider check", ok: false, detail: explain(outcome.reason) ?? "Blocked" }] };
  }

  const f = outcome.idFields ?? {};
  const idName = f.full_name ?? [f.first_name, f.other_names, f.last_name].filter(Boolean).join(" ");
  const score = idName ? nameMatch(applicant.fullName, idName) : 0;
  const idNumber = (f.id_number ?? "").replace(/\s/g, "").toUpperCase();
  const checks = [
    { name: "Liveness & face match", ok: outcome.status === "clear", detail: outcome.status === "clear" ? "Selfie is live and matches the ID photo" : explain(outcome.reason) ?? "Needs a closer look" },
    { name: "Fraud signals", ok: !outcome.fraudDetected, detail: outcome.fraudDetected ? "Provider flagged possible fraud" : "None detected" },
    {
      name: "Name matches application",
      ok: score >= 0.99,
      detail: idName ? `ID reads “${idName}” (${Math.round(score * 100)}% of typed name found)` : "Name couldn’t be read from the ID",
    },
    {
      name: "NIN matches application",
      ok: !!idNumber && idNumber === applicant.nin.toUpperCase(),
      detail: idNumber ? (idNumber === applicant.nin.toUpperCase() ? `ID number ${idNumber}` : `ID shows ${idNumber}, application says ${applicant.nin}`) : "ID number couldn’t be read",
    },
  ];
  if (checks.every((c) => c.ok)) return { status: "verified", reason: "Identity verified automatically.", checks };
  const failed = checks.filter((c) => !c.ok).map((c) => c.name.toLowerCase());
  return { status: "review", reason: `Needs an officer’s review: ${failed.join(", ")}.`, checks };
}
