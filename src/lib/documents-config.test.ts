import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanFileName, documentSlots, requiredDocuments, sniffType } from "./documents-config";

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)]);

describe("sniffType", () => {
  it("recognises allowed formats by their magic bytes", () => {
    assert.equal(sniffType(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
    assert.equal(sniffType(bytes(0x89, 0x50, 0x4e, 0x47)), "image/png");
    assert.equal(sniffType(new TextEncoder().encode("%PDF-1.7\n...")), "application/pdf");
    assert.equal(sniffType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), "image/webp");
  });
  it("rejects anything else, whatever it is called", () => {
    assert.equal(sniffType(new TextEncoder().encode("MZ\x90\0 not an image")), null); // Windows .exe
    assert.equal(sniffType(new TextEncoder().encode("<svg onload=alert(1)>")), null);
    assert.equal(sniffType(new TextEncoder().encode("<html><script>")), null);
  });
});

describe("cleanFileName", () => {
  it("strips paths and odd characters and forces the real extension", () => {
    assert.equal(cleanFileName("../../etc/passwd", "image/jpeg"), "passwd.jpg");
    assert.equal(cleanFileName('C:\\Users\\me\\ID "front".exe', "image/png"), "ID front.png");
    assert.equal(cleanFileName("<>.pdf", "application/pdf"), "document.pdf");
  });
});

describe("documentSlots", () => {
  it("lists the product's required documents first, then optional ones", () => {
    const slots = documentSlots("contract-finance");
    assert.deepEqual(slots.slice(0, requiredDocuments["contract-finance"].length), requiredDocuments["contract-finance"]);
    assert.equal(slots.at(-1), "other");
    assert.equal(new Set(slots).size, slots.length, "no duplicates");
  });
});
