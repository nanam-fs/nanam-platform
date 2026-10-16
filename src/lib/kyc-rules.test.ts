import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decide, nameMatch } from "./kyc-rules";

const applicant = { fullName: "Sarah Nakato", nin: "CF90021234ABCD" };
const clear = (fields: Record<string, string | null>) => ({ status: "clear", reason: null, fraudDetected: false, idFields: fields });

describe("nameMatch", () => {
  it("ignores order, case, accents and extra names", () => {
    assert.equal(nameMatch("Sarah Nakato", "NAKATO SARAH GRACE"), 1);
    assert.equal(nameMatch("sarah  nakato", "Sarah Nakató"), 1);
  });
  it("scores partial and different names below a full match", () => {
    assert.equal(nameMatch("Sarah Nakato", "Sarah Achieng"), 0.5);
    assert.equal(nameMatch("Sarah Nakato", "Grace Achieng"), 0);
  });
});

describe("decide", () => {
  it("verifies instantly when the provider is clear and the ID matches what was typed", () => {
    const d = decide(clear({ full_name: "NAKATO SARAH", id_number: "CF90021234ABCD" }), applicant);
    assert.equal(d.status, "verified");
    assert.ok(d.checks.every((c) => c.ok));
  });
  it("sends a clean check to review when the NIN or name differs", () => {
    assert.equal(decide(clear({ full_name: "NAKATO SARAH", id_number: "CM00000000XXXX" }), applicant).status, "review");
    assert.equal(decide(clear({ full_name: "ACHIENG GRACE", id_number: "CF90021234ABCD" }), applicant).status, "review");
  });
  it("routes provider outcomes: attention → review, block → rejected, error → retake", () => {
    assert.equal(decide({ status: "attention", reason: "document_copy_detected", fraudDetected: false, idFields: null }, applicant).status, "review");
    const blocked = decide({ status: "block", reason: "face_verification_failed", fraudDetected: false, idFields: null }, applicant);
    assert.equal(blocked.status, "rejected");
    assert.match(blocked.reason, /doesn’t match/);
    assert.equal(decide({ status: "error", reason: "image_unavailable_or_invalid", fraudDetected: false, idFields: null }, applicant).status, "retake");
  });
  it("treats fraud signals and unknown statuses as review, never as verified", () => {
    assert.equal(decide({ ...clear({ full_name: "NAKATO SARAH", id_number: "CF90021234ABCD" }), fraudDetected: true }, applicant).status, "review");
    assert.equal(decide({ status: "something_new", reason: null, fraudDetected: false, idFields: { full_name: "NAKATO SARAH", id_number: "CF90021234ABCD" } }, applicant).status, "review");
  });
});
